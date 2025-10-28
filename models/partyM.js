
import db from '../config/db.js';
import bcrypt from 'bcrypt'
class partyM{
    async createTable(){
        try{
            const sql=`
            CREATE TABLE IF NOT EXISTS party(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            abbreviation VARCHAR(100) NOT NULL UNIQUE,
            logo VARCHAR(255),    
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            approvalStatus VARCHAR(20) CHECK (approvalStatus IN ('Pending', 'Rejected', 'Approved')) DEFAULT 'Pending',
            UNIQUE(name, abbreviation,email));`
            await db.query(sql);
            console.log('party table created or already exists.');
        }catch(err){
            console.error('Error creating party table:', err);
        }
    }
    async getAllParties(){
        try{
            const sql=`SELECT * FROM party;`;
            const result=await db.query(sql);
            return result.rows;
        }catch(err){
            console.error('Error fetching parties:', err);
            throw err;
        }
    }
    async addParties(parties){
        try {
          const values = [];
          const rows = [];
      
          for (const p of parties) {
            let hashed=await bcrypt.hash(p.password,10)
            values.push(p.name, p.abbreviation, p.logo,p.email,hashed);
            rows.push(`($${values.length - 4},$${values.length - 3},$${values.length - 2}, $${values.length - 1}, $${values.length})`);
          }
      
          const sql = `
            INSERT INTO party (name, abbreviation, logo,email,password)
            VALUES ${rows.join(', ')}
            ON CONFLICT (name,abbreviation) DO NOTHING;
          `;
      
          await db.query(sql, values);
          
        } catch (err) {
          console.error('Error inserting parties:', err);
          throw err;
        }
      };

      async createParty(name, abbreviation, logo,email,password){
        try{
            await db.query(`INSERT INTO party (name, abbreviation, logo,email,password) VALUES ($1, $2, $3, $4, $5);`, [name, abbreviation, logo,email,password]);
        }catch(err){
          if (err.code === '23505') { // unique violation
            console.error('Email or name already exists');
            throw new Error('Email or name already taken');
          }
          throw err;
      }}
      async LoginParty(email, password){
        try{
           const result= await db.query(`SELECT * FROM party WHERE email = $1`, [email]);
            if(result.rows.length === 0){
              throw new Error('Party not found');
            }
            let isMatch = await bcrypt.compare(password, result.rows[0].password);
            if(!isMatch){
              throw new Error('Invalid password');
            }
            return user;
        }catch(err){
          console.error('Error logging in party:', err);
          throw err;
        }
}
}
export default new partyM();