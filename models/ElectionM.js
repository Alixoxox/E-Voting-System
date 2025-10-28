
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
            throw err;
        }
    }
    async createElection(name , startDate, endDate, seatType , Province){
        try{
            const provinceRow=await db.query(`SELECT id FROM province WHERE name=$1`, [Province]);
            await db.query(`INSERT INTO elections (name, startDate, end_date, seatType, provinceId) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`, [name, startDate, endDate, seatType, provinceRow.rows[0].id]);

    }catch(err){
        console.error('Error creating election:', err);
        throw err;
    }
    }
    async getActiveElections(curentDate){
        try{
            const result= await db.query(`SELECT e.*, p.name as provinceName FROM elections e 
                left join province p on e.provinceId = p.id 
                WHERE end_date >= $1;`, [curentDate]);
            return result.rows;
        }catch(err){
            console.error('Error fetching active elections:', err);
            throw err;
        }
    }
}
export default new ElectionM();