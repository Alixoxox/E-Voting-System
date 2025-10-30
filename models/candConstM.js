import db from "../config/db.js";
class candConstM {
  async createTable() {
    try {
      const sql = `
            CREATE TABLE IF NOT EXISTS candidateConstituency(
            id SERIAL PRIMARY KEY,
            candidateId INTEGER REFERENCES candidate(id),
            totalVotes INTEGER DEFAULT 0,
            approvalStatus VARCHAR(20) CHECK (approvalStatus IN ('Pending', 'Won' , 'Lost')) DEFAULT 'Pending',
            constituencyId INTEGER REFERENCES Constituency(id),
            electionId INTEGER REFERENCES elections(id),
            UNIQUE(candidateId, constituencyId,electionId));`;
      await db.query(sql);
      console.log("candidateConstituency table created or already exists.");
    } catch (err) {
      console.error("Error creating candidateConstituency table:", err);
    }
  }

  // show candidates holding a constituency wrt party and election
  async getCandidatesInConstituencyWrtPartyAndElection(partyId, electionId) {
    try {
      const sql = `
        SELECT 
          cc.id AS candidateConstituencyId,
          u.name AS candidateName,
          u.email,
          u.cnic,
          p.name AS partyName,
          con.name AS constituencyName
        FROM candidateConstituency cc
        JOIN candidate c ON cc.candidateId = c.id
        JOIN users u ON c.userId = u.id
        JOIN party p ON c.partyId = p.id
        JOIN constituency con ON cc.constituencyId = con.id
        WHERE c.partyId = $1
          AND cc.electionId = $2;`;
      const result = await db.query(sql, [partyId, electionId]);
      return result.rows;
    } catch (err) {
      console.error("Error fetching party candidates in constituency for election:", err);
      throw new Error("Error fetching party candidates in constituency for election") ;}
  }
  async allocateCandidateEllectionConst(
    candidateId,
    electionId,
    constituencyId
  ) {
    try {
      const sql = `INSERT INTO candidateConstituency (candidateId, electionId, constituencyId) VALUES ($1, $2, $3);`;
      await db.query(sql, [candidateId, electionId, constituencyId]);
    } catch (err) {
      if (err.code === "23503") {
        throw new Error("This constituency or election does not exist");
      } else if (err.code === "23505") {
        throw new Error(
          "Candidate is already allocated to this constituency for the election"
        );
      }
    }
  }
  async chooseSeat(candidateId,electionId,constituencyId) {

    try {
      // 1️⃣ Get all winning seats
      const { rows: wins } = await db.query(`
        SELECT id, constituencyid, totalvotes
        FROM candidateconstituency
        WHERE candidateid = $1 AND electionid = $2 AND approvalstatus = 'Won'
      `, [candidateId, electionId]);
  
      if (wins.length <= 1)
        throw new Error("Only one or no seat won, nothing to remove." );
  
      // 2️⃣ Identify chosen seat
      const chosenSeat = wins.find(w => w.constituencyid === constituencyId);
      if (!chosenSeat)
       throw new Error("Invalid seat selection." );
  
      // 3️⃣ Delete other won seats
      const { rows: deletedSeats } = await db.query(`
        DELETE FROM candidateconstituency
        WHERE candidateid = $1 AND electionid = $2 
        AND constituencyid != $3 AND approvalstatus = 'Won'
        RETURNING constituencyid
      `, [candidateId, electionId, constituencyId]);
  
      // 4️⃣ Promote runner-up for each deleted seat
      for (const seat of deletedSeats) {
        const { rows: runnerUp } = await db.query(`
          SELECT id FROM candidateconstituency
          WHERE constituencyid = $1 AND electionid = $2
          ORDER BY totalvotes DESC
          LIMIT 1
        `, [seat.constituencyid, electionId]);
  
        if (runnerUp.length) {
          await db.query(`
            UPDATE candidateconstituency
            SET approvalstatus = 'Won'
            WHERE id = $1
          `, [runnerUp[0].id]);
        }
      }
  
    } catch (err) {
      console.error("Error choosing seat:", err);
      throw new Error( err.message ||"Error choosing seat" );
    }
  }
    async getWonSeats(candidateId) {
      try {
    
        const { rows } = await db.query(`
          SELECT 
            cc.id AS seat_id,
            cc.constituencyid,
            c.name AS constituency_name,
            e.name AS election_name,
            cc.totalvotes
          FROM candidateconstituency cc
          JOIN constituency c ON c.id = cc.constituencyid
          JOIN elections e ON e.id = cc.electionid
          WHERE cc.candidateid = $1
            AND cc.approvalstatus = 'Won'
            AND e.status = 'Ended' 
            AND e.finalized = false
        `, [candidateId]);
    
        if (!rows.length)
          throw new Error ("You have no winning seats." );
    
        return{
          message: "Won seats retrieved successfully",
          seats: rows
        };
    
      } catch (err) {
        console.error("Error fetching won seats:", err);
        throw new Error (err.message||"Error fetching won seats" );
      }
    }
    
}
export default new candConstM();
