
import db from "../config/db.js";
import auditLogsM from "../models/auditLogsM.js";

export async function runAutoSeatChooser() {
  console.log("🕐 Running auto seat chooser...");

  try {
    const { rows: elections } = await db.query(`
      SELECT id FROM elections 
      WHERE status = 'Ended' AND finalized = FALSE
    `);

    for (const election of elections) {
      const electionId = election.id;

      // Multi-seat winners logic...
      const { rows: multiWinners } = await db.query(`
        SELECT candidateid 
        FROM candidateconstituency 
        WHERE electionid = $1 AND approvalstatus = 'Won'
        GROUP BY candidateid
        HAVING COUNT(*) > 1
      `, [electionId]);

      for (const { candidateid } of multiWinners) {
        const { rows: topSeat } = await db.query(`
          SELECT id, constituencyid 
          FROM candidateconstituency 
          WHERE electionid = $1 AND candidateid = $2 
          ORDER BY totalvotes DESC 
          LIMIT 1
        `, [electionId, candidateid]);

        if (!topSeat.length) continue;

        const chosenSeatId = topSeat[0].id;

        const { rows: droppedSeats } = await db.query(`
          UPDATE candidateconstituency
          SET approvalstatus = 'Lost'
          WHERE electionid = $1 
            AND candidateid = $2
            AND id != $3
          RETURNING constituencyid
        `, [electionId, candidateid, chosenSeatId]);

        if (droppedSeats.length > 0) {
          await auditLogsM.logAction(
            null,
            "SYSTEM_AUTO_DROP_SEAT",
            `Candidate_${candidateid}`,
            {
              electionId,
              keptSeat: chosenSeatId,
              droppedConstituencies: droppedSeats.map(d => d.constituencyid)
            }
          );
        }

        for (const seat of droppedSeats) {
          const { constituencyid } = seat;
          const { rows: runnerUp } = await db.query(`
            SELECT id 
            FROM candidateconstituency
            WHERE constituencyid = $1 
              AND electionid = $2
              AND approvalstatus != 'Won'
            ORDER BY totalvotes DESC
            LIMIT 1
          `, [constituencyid, electionId]);

          if (runnerUp.length) {
            await db.query(`
              UPDATE candidateconstituency
              SET approvalstatus = 'Won'
              WHERE id = $1
            `, [runnerUp[0].id]);

            await auditLogsM.logAction(
              null,
              "SYSTEM_PROMOTE_RUNNERUP",
              `Seat_${runnerUp[0].id}`,
              { originalWinner: candidateid }
            );
          }
        }
      }

      await db.query(`UPDATE elections SET finalized = TRUE WHERE id = $1`, [electionId]);

      await auditLogsM.logAction(
        null,
        "AUTO_SEAT_ASSIGNMENT_COMPLETED",
        `Election_${electionId}`,
        { status: "Success" }
      );

      console.log(`✅ Auto seat assignment completed for election ${electionId}`);
    }
  } catch (err) {
    await auditLogsM.logAction(null, "AUTO_SEAT_ASSIGNMENT_FAILED", "SYSTEM", { error: err.message });
    console.error("❌ Error in auto seat chooser:", err);
  }
}

export async function runDailyElectionCheck() {
  console.log('🌅 Running daily election result check...');

  try {
    const { rows: endedElections } = await db.query(`
      SELECT id FROM elections
      WHERE end_date <= NOW() AND status = 'Active'
    `);

    for (const election of endedElections) {
      const electionId = election.id;

      const { rows: results } = await db.query(`
        SELECT candidateid, constituencyid, totalvotes
        FROM candidateconstituency
        WHERE electionid = $1
        ORDER BY constituencyid, totalvotes DESC, id ASC
      `, [electionId]);

      const topWinners = new Map();
      for (const row of results) {
        if (!topWinners.has(row.constituencyid)) {
          topWinners.set(row.constituencyid, row);
        }
      }

      for (const winner of topWinners.values()) {
        await db.query(`
          UPDATE candidateconstituency
          SET approvalStatus = 'Won'
          WHERE candidateid = $1 AND constituencyid = $2 AND electionid = $3
        `, [winner.candidateid, winner.constituencyid, electionId]);
      }

      await db.query(`
        UPDATE candidateconstituency
        SET approvalStatus = 'Lost'
        WHERE electionid = $1 AND approvalStatus IS DISTINCT FROM 'Won'
      `, [electionId]);

      await db.query(`
        UPDATE elections SET status = 'Ended'
        WHERE id = $1
      `, [electionId]);

      await auditLogsM.logAction(
        null,
        'ELECTION_RESULTS_DECLARED',
        `Election_${electionId}`,
        {
          status: 'Success',
          winnersCount: topWinners.size,
        }
      );

      console.log(`✅ Declared results for election ${electionId}`);
    }
  } catch (err) {
    await auditLogsM.logAction(
      null,
      'DAILY_RESULT_CHECK_FAILED',
      'SYSTEM',
      { error: err.message, status: 'Error' }
    );
    console.error('❌ Error running daily election result check:', err);
  }
}
