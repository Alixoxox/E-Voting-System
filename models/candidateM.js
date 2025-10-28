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
            const sql=`SELECT c.*, u.name, u.email, u.cnic, p.name as partyName
            FROM candidate c
            Join party p on c.partyId=p.id
            JOIN users u ON c.userId = u.id;`
            const result=await db.query(sql);
            return result.rows;
        }catch(err){
            console.error('Error fetching candidates:', err);
            throw err;
        }
    }
    async createCandidate(name,email, cnic, password, province, city, area, partyId, manifesto,imageUrl){
        try{
            let result=await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
            if(result.rows.length === 0){
                await userM.createUser(name, email, cnic, password, province, city, area, 'candidate');
            }
            await db.query(`INSERT INTO candidate (userId, partyId, manifesto,imageUrl) VALUES ($1, $2, $3, $4)`, [result.rows[0].id, partyId, manifesto,imageUrl]);
            
        }catch(err){
            console.error('Error creating candidate:', err);
            throw err;
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
            throw err;
        }
    }
    async kickCandidate(candidateId, partyId){
        try{
            await db.query(`DELETE FROM candidate WHERE id = $1 AND partyId = $2`, [candidateId, partyId]);
        }catch(err){
            console.error('Error kicking candidate:', err);
            throw err;
        }
    }
}

export default new candidateM();