import cron from "node-cron";
import db from "../config/db.js";
import auditLogsM from "../models/auditLogsM.js";
//every 2 days at midnight
cron.schedule("0 0 */2 * *", async () => {
  console.log("🕐 Running auto seat chooser...");

  try {
    // find ended elections where candidates haven't chosen seat
    const { rows: elections } = await db.query(`
      SELECT id FROM elections 
      WHERE status = 'Ended' 
      AND finalized IS FALSE
    `);

    for (const election of elections) {
      const { id: electionId } = election;

      // get candidates who won multiple seats
      const { rows: multiWinners } = await db.query(`
        SELECT candidateid 
        FROM candidateconstituency 
        WHERE electionid = $1 AND status = 'Won'
        GROUP BY candidateid
        HAVING COUNT(*) > 1
      `, [electionId]);

      for (const candidate of multiWinners) {
        const { candidateid } = candidate;

        // choose the highest-vote seat automatically
        const { rows: topSeat } = await db.query(`
          SELECT id, constituencyid FROM candidateconstituency 
          WHERE electionid = $1 AND candidateid = $2 
          ORDER BY totalvotes DESC LIMIT 1
        `, [electionId, candidateid]);

        if (!topSeat.length) continue;

        const chosenSeatId = topSeat[0].id;
        const chosenConstituency = topSeat[0].constituencyid;

        // delete other won seats
        const { rows: deleted } = await db.query(`
          DELETE FROM candidateconstituency 
          WHERE electionid = $1 AND candidateid = $2 
          AND id != $3 RETURNING constituencyid
        `, [electionId, candidateid, chosenSeatId]);

        // promote runner-ups for deleted seats
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
          }
        }
      }

      // mark election finalized
      await db.query(`
        UPDATE elections SET finalized = TRUE WHERE id = $1
      `, [electionId]);
        await auditLogsM.logAction('AUTO_SEAT_ASSIGNMENT_COMPLETED', { electionId ,status:'Success'});
      console.log(`Auto seat assignment completed for election ${electionId}`);
    }
  } catch (err) {
    await auditLogsM.logAction('AUTO_SEAT_ASSIGNMENT_FAILED', { error: err.message ,status:'Error'});
    console.error("Error in auto seat chooser:", err);
  }
});
