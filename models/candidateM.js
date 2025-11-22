import db from '../config/db.js';
import userM from './userM.js';
class candidateM{

    async createTable(){
        try{
            const sql=`
            CREATE TABLE IF NOT EXISTS candidate(
            id SERIAL PRIMARY KEY,
            userId INTEGER REFERENCES users(id),
            partyId INTEGER REFERENCES party(id),
            imageUrl VARCHAR(255) Not null,
            manifesto TEXT,
            UNIQUE(userId, partyId));`
            await db.query(sql);
            console.log('candidate table created or already exists.');
        }catch(err){
            console.error('Error creating candidate table:', err);
        }
    }
    async getAllCandidates(){
        try{
            const sql=`SELECT c.*, u.name, u.email, u.cnic, p.name as partyName,p.logo as partyLogo
            FROM candidate c
            Join party p on c.partyId=p.id
            JOIN users u ON c.userId = u.id;`
            const result=await db.query(sql);
            return result.rows;
        }catch(err){
            console.error('Error fetching candidates:', err);
            throw new Error('Error fetching candidates');
        }
    }
    async createCandidate(name, email, cnic, password, province, city, area, partyId, manifesto, imageUrl) {
        try {
          // Check if user already exists
          let result = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
          
          let userId;
          
          if (result.rows.length === 0) {
            // User doesn't exist, create new user
            const newUser = await userM.createUser(name, email, cnic, password, province, city, area, 'candidate');
            userId = newUser.id; // Adjust based on what createUser returns
          } else {
            // User exists, use existing user id
            userId = result.rows[0].id;
          }
          
          // Create candidate record
          const candResult = await db.query(
            `INSERT INTO candidate (userId, partyId, manifesto, imageUrl) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`, 
            [userId, partyId, manifesto, imageUrl]
          );
          
          return { candId: candResult.rows[0].id };
          
        } catch (err) {
          console.error('Error creating candidate:', err);
          throw new Error('Error creating candidate: ' + err.message);
        }
      }
    async getCandidatesByPartyId(partyId){
        try{
            const sql=`SELECT c.*, u.name, u.email, u.cnic
            FROM candidate c
            JOIN users u ON c.userId = u.id
            WHERE c.partyId = $1;`
            const result=await db.query(sql, [partyId]);
            return result.rows;
        }catch(err){
            console.error('Error fetching candidates by party ID:', err);
            throw new Error('Error fetching candidates by party ID');
        }
    }
    async kickCandidate(candidateId){
        try{
            await db.query(`DELETE FROM candidateconstituency WHERE candidateId = $1`, [candidateId]);
            await db.query(`DELETE FROM candidate WHERE id = $1`, [candidateId]);
        }catch(err){
            console.error('Error kicking candidate:', err);
            throw new Error('Error kicking candidate');
        }
    }
}

export default new candidateM();