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
}
export default new votesM();