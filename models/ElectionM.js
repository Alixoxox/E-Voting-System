
import db from '../config/db.js';

class ElectionM{
    async createTable(){
        try{
            const sql=`
            CREATE TABLE IF NOT EXISTS Elections (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            seatType VARCHAR(20) CHECK (seatType IN ('National','Provincial')) DEFAULT 'Provincial',
            provinceId INTEGER REFERENCES province(id),
            startDate DATE DEFAULT CURRENT_DATE,
            end_date DATE DEFAULT CURRENT_DATE,
            finalized BOOLEAN DEFAULT FALSE, 
            status VARCHAR(20) CHECK (status IN ('Active','Ended')) DEFAULT 'Active',
            UNIQUE(name, seatType, provinceId));`
            await db.query(sql);
            console.log('Elections table created or already exists.');
        }catch(err){
            console.error('Error creating Elections table:', err);
        }
    }
    async getAllElections(){
        try{
            const sql=`SELECT * FROM elections;`;
            const result=await db.query(sql);
            return result.rows;
        }catch(err){
            console.error('Error fetching elections:', err);
            throw new Error('Error fetching elections');
        }
    }
    async createElection(name , startDate, endDate, seatType , Province){
        try{
            const provinceRow=await db.query(`SELECT id FROM province WHERE name=$1`, [Province]);
            await db.query(`INSERT INTO elections (name, startDate, end_date, seatType, provinceId) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`, [name, startDate, endDate, seatType, provinceRow.rows[0].id]);

    }catch(err){
        console.error('Error creating election:', err);
        throw new Error('Error creating election');
    }
    }
    async getActiveElections(curentDate){
        try{
            const result= await db.query(`SELECT e.*, p.name as provinceName FROM elections e 
                left join province p on e.provinceId = p.id 
                WHERE end_date >= $1 and status='Active' and startDate<=$1;`, [curentDate]);
            return result.rows;
        }catch(err){
            console.error('Error fetching active elections:', err);
            throw new Error('Error fetching active elections');
        }
    }
    // ElectionM.js

async getPastElectionResults() {
    try {
      // Fetch all ended elections
      const electionsQuery = `
        SELECT id, name, seatType, startDate, end_date, provinceId 
        FROM elections 
        WHERE status = 'Ended' AND finalized = TRUE
        ORDER BY end_date DESC
      `;
      const { rows: elections } = await db.query(electionsQuery);
  
      // For each election, fetch the winners
      // We use Promise.all to run these queries in parallel for speed
      const results = await Promise.all(elections.map(async (election) => {
        const winnersQuery = `
          SELECT 
            c.id AS candidate_id,
            u.name AS candidate_name,
            p.name AS party_name,
            p.logo AS party_logo,
            con.name AS constituency_name,
            cc.totalvotes
          FROM candidateconstituency cc
          JOIN candidate c ON cc.candidateid = c.id
          JOIN users u ON c.userid = u.id
          JOIN party p ON c.partyid = p.id
          JOIN constituency con ON cc.constituencyid = con.id
          WHERE cc.electionid = $1 AND cc.approvalstatus = 'Won'
        `;
        
        const { rows: winners } = await db.query(winnersQuery, [election.id]);
        
        return {
          ...election,
          winners: winners
        };
      }));
  
      return results;
  
    } catch (err) {
      console.error("Error fetching past results:", err);
      throw new Error("Failed to retrieve past election results");
    }
  }
}
export default new ElectionM();