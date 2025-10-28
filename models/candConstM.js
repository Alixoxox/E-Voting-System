import db from "../config/db.js";
class candConstM {
  async createTable() {
    try {
      const sql = `
            CREATE TABLE IF NOT EXISTS candidateConstituency(
            id SERIAL PRIMARY KEY,
            candidateId INTEGER REFERENCES candidate(id),
            totalVotes INTEGER DEFAULT 0,
            approvalStatus VARCHAR(20) CHECK (approvalStatus IN ('Pending', 'Taken', 'Vacated', 'Lost')) DEFAULT 'Pending',
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
      console.error(
        "Error fetching party candidates in constituency for election:",
        err
      );
      throw err;
    }
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
      }
      console.error(
        "Error allocating candidate to election and constituency:",
        err
      );
      throw err;
    }
  }
}
export default new candConstM();
