import pool from "../config/db.js"

class votesM {

  async createTable() {
    try {
        const sql=`
        CREATE TABLE IF NOT EXISTS votes (
            id SERIAL PRIMARY KEY,
            userId INTEGER REFERENCES users(id),
            candidateConstId INTEGER REFERENCES candidateConstituency(id),
            electionId INTEGER REFERENCES elections(id),
            previous_hash VARCHAR(256),
            current_hash VARCHAR(256),
            castedAt DATE DEFAULT CURRENT_DATE,
            UNIQUE (userId, electionId));`
      await pool.query(sql);
      console.log("votes table created or already exists.");
    } catch (err) {
      console.error("Error creating votes table:", err);
    }
  }
    async getAllVotes() {
        try {
        const sql = `SELECT * FROM votes;`;
        const result = await pool.query(sql);
        return result.rows;
        } catch (err) {
        console.error("Error fetching votes:", err);
        throw new Error('Error fetching votes');
        }
    }
    // helper function : for fetching previous hash votes if one vote is deleted then chain breaks
    async getLastVoteHash(electionId) {
      try {
        const sql = `
          SELECT current_hash 
          FROM votes 
          WHERE electionId = $1 
          ORDER BY id DESC 
          LIMIT 1;
        `;
        const result = await pool.query(sql, [electionId]);
        
        // If result is empty, it means this is the FIRST vote (Genesis)
        return result.rows.length > 0 ? result.rows[0].current_hash : null;
      } catch (err) {
        console.error("Error getting last hash:", err);
        throw new Error('Error fetching voting chain');
      }
    }
    async getLastVoteHash(electionId) {
      try {
          const sql = `SELECT current_hash FROM votes WHERE electionId = $1 ORDER BY id DESC LIMIT 1`;
          const result = await pool.query(sql, [electionId]);
          return result.rows.length > 0 ? result.rows[0].current_hash : null;
      } catch (err) {
          return null;
      }
  }
  
  // 2. Fix CastVote return
  async CastVote(candidateParticipatingId, userId, electionId, previousHash, currentHash){
      try{
          // Check existing vote
          const voteCheck = await pool.query(`SELECT id FROM votes WHERE userId = $1 AND electionId = $2`, [userId, electionId]);
      
          if(voteCheck.rows.length > 0){
              throw new Error('User has already casted his vote'); // Throw error instead of returning message
          }
      
          // Insert with Hashes
          await pool.query(`
              INSERT INTO votes (userId, candidateConstid, electionId, previous_hash, current_hash) 
              VALUES ($1, $2, $3, $4, $5)
          `, [userId, candidateParticipatingId, electionId, previousHash, currentHash]);
      
          // Update Count
          await pool.query(`
              UPDATE candidateConstituency SET totalVotes = totalVotes + 1 WHERE id = $1
          `, [candidateParticipatingId]);
      
          // Get Area for Socket
          const userArea = await pool.query(`SELECT areaId FROM users WHERE id = $1`, [userId]);
          const areaId = userArea.rows[0].areaid;
          return { areaId, electionId };
      } catch(err){
          console.error('Error casting vote:', err);
          throw err;
      }
  }
    async votingHistory(userId,limit,page){
      const offset=(limit*(page-1));
    try{
      const sql=`
      SELECT v.*, cc.id as candidateParticipatingId, u.name AS candidateName, u.email AS candidateEmail, u.cnic AS candidateCnic, p.name AS partyName, e.name AS electionName, con.name AS constituencyName
      FROM votes v
      JOIN candidateConstituency cc ON v.candidateConstid = cc.id
      JOIN candidate c ON cc.candidateId = c.id
      JOIN users u ON c.userId = u.id
      JOIN party p ON c.partyId = p.id
      JOIN elections e ON v.electionId = e.id
      JOIN constituency con ON cc.constituencyId = con.id
      WHERE v.userId = $1 
      ORDER BY v.castedAt DESC 
      Limit $2 OFFSET $3;`;
      const result=await pool.query(sql, [userId,limit,offset]);
      return result.rows;
    }catch(err){
      console.error('Error fetching voting history:', err);
      throw new Error('Error fetching voting history');
    }
    }

    // Verify Votes
  verifyElectionIntegrity = async (req, res) => {
  try {
    const { electionId } = req.params;

    // 1. Get all votes for this election, ordered by ID
    const { rows: votes } = await db.query(
      `SELECT id, previous_hash, current_hash FROM votes WHERE electionId = $1 ORDER BY id ASC`,
      [electionId]
    );

    if (votes.length === 0) return res.json({ status: "Clean", message: "No votes cast yet." });

    const brokenLinks = [];

    // 2. Loop through votes (Start at index 1, skip Genesis)
    for (let i = 1; i < votes.length; i++) {
      const currentVote = votes[i];
      const previousVote = votes[i - 1];

      // 3. THE CHECK: Does my 'previous' match the last guy's 'current'?
      if (currentVote.previous_hash !== previousVote.current_hash) {
        brokenLinks.push({
          brokenAtVoteID: currentVote.id,
          expected: previousVote.current_hash,
          found: currentVote.previous_hash
        });
      }
    }

    // 4. Report Results
    if (brokenLinks.length > 0) {
      // Log this serious security event!
      await logAction(req, 'INTEGRITY_CHECK_FAILED', electionId, { errors: brokenLinks });
      
      return {
        status: "Compromised",
        message: "🚨 Tampering Detected! The blockchain is broken.",
        details: brokenLinks
      };
    }

    return { status: "Secure", message: "  Verification Passed. All hashes match." };

  } catch (err) {
    return { error: err.message };
  }
}
}
export default new votesM();