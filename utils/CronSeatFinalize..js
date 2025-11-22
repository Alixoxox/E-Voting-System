import cron from "node-cron";
import db from "../config/db.js";
import auditLogsM from "../models/auditLogsM.js";

// Every 2 days at midnight
cron.schedule("0 0 */2 * *", async () => {
  console.log("🕐 Running auto seat chooser...");

  try {
    const { rows: elections } = await db.query(`
      SELECT id FROM elections 
      WHERE status = 'Ended' AND finalized IS FALSE
    `);

    for (const election of elections) {
      const { id: electionId } = election;

      const { rows: multiWinners } = await db.query(`
        SELECT candidateid 
        FROM candidateconstituency 
        WHERE electionid = $1 AND status = 'Won'
        GROUP BY candidateid
        HAVING COUNT(*) > 1
      `, [electionId]);

      for (const candidate of multiWinners) {
        const { candidateid } = candidate;

        const { rows: topSeat } = await db.query(`
          SELECT id, constituencyid FROM candidateconstituency 
          WHERE electionid = $1 AND candidateid = $2 
          ORDER BY totalvotes DESC LIMIT 1
        `, [electionId, candidateid]);

        if (!topSeat.length) continue;

        const chosenSeatId = topSeat[0].id;

        // Delete other won seats
        const { rows: deleted } = await db.query(`
          DELETE FROM candidateconstituency 
          WHERE electionid = $1 AND candidateid = $2 
          AND id != $3 RETURNING constituencyid
        `, [electionId, candidateid, chosenSeatId]);

        // ⚠️ ADDED LOG: Log exactly what was deleted (Critical for Audit)
        if(deleted.length > 0) {
             await auditLogsM.logAction(null, 'SYSTEM_AUTO_DROP_SEAT', `Candidate_${candidateid}`, {
                electionId,
                keptSeat: chosenSeatId,
                droppedConstituencies: deleted.map(d => d.constituencyid)
            });
        }

        // Promote runner-ups
        for (const seat of deleted) {
          const { rows: runnerUp } = await db.query(`
            SELECT id FROM candidateconstituency
            WHERE constituencyid = $1 AND electionid = $2
            ORDER BY totalvotes DESC LIMIT 1
          `, [seat.constituencyid, electionId]);

          if (runnerUp.length) {
            await db.query(`
              UPDATE candidateconstituency
              SET approvalstatus = 'Won'
              WHERE id = $1
            `, [runnerUp[0].id]);
            
            // Log promotion
            await auditLogsM.logAction(null, 'SYSTEM_PROMOTE_RUNNERUP', `Seat_${runnerUp[0].id}`, {
                originalWinner: candidateid
            });
          }
        }
      }

      await db.query(`
        UPDATE elections SET finalized = TRUE WHERE id = $1
      `, [electionId]);

      // ⚠️ FIX: Correct arguments
      await auditLogsM.logAction(null, 'AUTO_SEAT_ASSIGNMENT_COMPLETED', `Election_${electionId}`, { status: 'Success' });
      console.log(`✅ Auto seat assignment completed for election ${electionId}`);
    }
  } catch (err) {
    await auditLogsM.logAction(null, 'AUTO_SEAT_ASSIGNMENT_FAILED', 'SYSTEM', { error: err.message });
    console.error("❌ Error in auto seat chooser:", err);
  }
});