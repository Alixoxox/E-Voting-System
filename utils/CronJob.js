import cron from 'node-cron';
import db from '../config/db.js';

// everyday at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('🌅 Running daily election result check...');

  try {
    const { rows: endedElections } = await db.query(`
      SELECT id FROM elections 
      WHERE end_date <= NOW() AND status = 'Active'
    `);

    for (const election of endedElections) {
      const { id: electionId } = election;

      // Get all candidates ordered by votes within each constituency
      const { rows: results } = await db.query(`
        SELECT candidateid, constituencyid, totalvotes
        FROM candidateconstituency
        WHERE electionid = $1
        ORDER BY constituencyid, votes DESC
      `, [electionId]);

      // Pick top 1 per constituency
      const topWinners = new Map();
      for (const row of results) {
        if (!topWinners.has(row.constituencyid)) {
          topWinners.set(row.constituencyid, row);
        }
      }

      // Mark only top winners as "won"
      for (const [_, winner] of topWinners) {
        await db.query(`
          UPDATE candidateconstituency
          SET approvalStatus = 'Won'
          WHERE candidateid = $1 AND constituencyid = $2 AND electionid = $3
        `, [winner.candidateid, winner.constituencyid, electionId]);
      }

      // Mark others as "lost"
      await db.query(`
        UPDATE candidateconstituency
        SET approvalStatus = 'Lost'
        WHERE electionid = $1 AND approvalStatus != 'Won'
      `, [electionId]);

      // Mark election results declared
      await db.query(`
        UPDATE elections SET status = 'Ended' WHERE id = $1
      `, [electionId]);

      console.log(` Declared results for election ${electionId}`);
    }
  } catch (err) {
    console.error(' Error running daily election result check:', err);
  }
});
