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
    async CastVote(candidateParticipatingId,userId,electionId){
      try{
        // Check if the user has already voted in this election
        const voteCheck = await pool.query(`
          SELECT * FROM votes 
          WHERE userId = $1 AND electionId = $2
        `, [userId, electionId]);
    
        if(voteCheck.rows.length > 0){
          return { message: 'User has already casted his vote' };
        }
    
        // Record the vote
        await pool.query(`
          INSERT INTO votes (userId, candidateConstid, electionId) 
          VALUES ($1, $2, $3)
        `, [userId, candidateParticipatingId, electionId]);
    
        // Increment the total votes for the candidate in candidateConstituency
        await pool.query(`
          UPDATE candidateConstituency 
          SET totalVotes = totalVotes + 1 
          WHERE id = $1
        `, [candidateParticipatingId]);
    
        const userArea = await pool.query(
          `SELECT areaId FROM users WHERE id = $1`,
          [userId]
        );
        const areaId = userArea.rows[0].areaid;
    
        // use areaId + electionId for socket broadcasting
        return { message: 'Vote cast successfully', areaId, electionId };
        
      }catch(err){
        console.error('Error casting vote:', err);
        throw err;
      }
    }
    async votingHistory(userId){
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
      WHERE v.userId = $1;
      `;
      const result=await pool.query(sql, [userId]);
      return result.rows;
    }catch(err){
      console.error('Error fetching voting history:', err);
      throw new Error('Error fetching voting history');
    }
    }
}
export default new votesM();