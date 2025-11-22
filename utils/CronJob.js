import cron from 'node-cron';
import db from '../config/db.js';
import { logAction } from '../utils/auditLogger.js'; // Ensure named import if exported that way

// Everyday at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('🌅 Running daily election result check...');

  try {
    const { rows: endedElections } = await db.query(`
      SELECT id FROM elections 
      WHERE end_date <= NOW() AND status = 'Active'
    `);

    for (const election of endedElections) {
      const { id: electionId } = election;

      const { rows: results } = await db.query(`
        SELECT candidateid, constituencyid, totalvotes
        FROM candidateconstituency
        WHERE electionid = $1
        ORDER BY constituencyid, totalvotes DESC
      `, [electionId]);

      const topWinners = new Map();
      for (const row of results) {
        if (!topWinners.has(row.constituencyid)) {
          topWinners.set(row.constituencyid, row);
        }
      }

      for (const [_, winner] of topWinners) {
        await db.query(`
          UPDATE candidateconstituency
          SET approvalStatus = 'Won'
          WHERE candidateid = $1 AND constituencyid = $2 AND electionid = $3
        `, [winner.candidateid, winner.constituencyid, electionId]);
      }

      await db.query(`
        UPDATE candidateconstituency
        SET approvalStatus = 'Lost'
        WHERE electionid = $1 AND approvalStatus != 'Won'
      `, [electionId]);

      await db.query(`
        UPDATE elections SET status = 'Ended' WHERE id = $1
      `, [electionId]);

      await logAction(null, 'ELECTION_RESULTS_DECLARED', `Election_${electionId}`, { 
          status: 'Success', 
          winnersCount: topWinners.size 
      });
      
      console.log(`✅ Declared results for election ${electionId}`);
    }
  } catch (err) {
    await logAction(null, 'DAILY_RESULT_CHECK_FAILED', 'SYSTEM', { error: err.message,status: 'Error', });
    console.error(' Error running daily election result check:', err);
  }
});