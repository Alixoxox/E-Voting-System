import db from '../config/db.js';

class ElectionM{
    async createTable(){
        try{
            const sql=`
            CREATE TABLE IF NOT EXISTS Elections (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
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
   // ElectionM.js

async createElection(name, startDate, endDate, seatType, Province) {
  try {
    let provinceId = null;

    // 1. If a Province is provided, look up its ID
    if (Province) {
      const provinceRow = await db.query(
        `SELECT id FROM province WHERE LOWER(name) = LOWER($1)`, 
        [Province.trim()]
      );

      if (provinceRow.rows.length === 0) {
        throw new Error(`Province '${Province}' not found in database.`);
      }
      provinceId = provinceRow.rows[0].id;
    }

    // 2. Insert Election (using RETURNING id so we can use it later if needed)
    const result = await db.query(
      `INSERT INTO elections (name, startDate, end_date, seatType, provinceId) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT DO NOTHING 
       RETURNING id`, 
      [name, startDate, endDate, seatType, provinceId]
    );
    
    return result.rows[0]; // Return the new election object

  } catch (err) {
    console.error('Error creating election:', err);
    throw err; // Throw the actual error message so the controller sees it
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