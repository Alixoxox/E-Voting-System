import db from '../config/db.js';
import format from 'pg-format';

class ConstituencyM{

    async createTable(){
        try{
            const sql=`
            CREATE TABLE IF NOT EXISTS Constituency(
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL UNIQUE,
            seatType VARCHAR(20) CHECK (seatType IN ('National','Provincial')) DEFAULT 'Provincial',
            status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
            UNIQUE(name, code, seatType));`
            await db.query(sql);
            console.log('Constituency table created or already exists.');
        }catch(err){
            console.error('Error creating Constituency table:', err);
        }
    }
    async getAllConstituencies(){
        try{
            const sql=`SELECT * FROM Constituency;`
            const result=await db.query(sql);
            return result.rows;
        }catch(err){
            console.error('Error fetching Constituencies:', err);
            throw new Error('Error fetching Constituencies');
        }
    }
    async insertConstituenciesFastest(data) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const constituencyValues = data.map(item => [
                item.code,
                item.name,
                item.seatType.toLowerCase() === 'national' ? 'National' : 'Provincial',
                'Active'
            ]);
    
            await db.query(format(`
                INSERT INTO constituency (code, name, seatType, status)
                VALUES %L
                ON CONFLICT DO NOTHING;
            `, constituencyValues));
    
            // 2️⃣ Fetch all constituency IDs
            const resCon = await db.query(`SELECT id, code FROM constituency`);
            const codeToId = Object.fromEntries(resCon.rows.map(r => [r.code, r.id]));
    
            // 3️⃣ Fetch all area IDs once
            const resArea = await db.query(`SELECT id, name FROM area`);
            const areaNameToId = Object.fromEntries(resArea.rows.map(r => [r.name, r.id]));
    
            // 4️⃣ Build junctionValues in one go without nested loops
            const junctionValues = [];
            data.forEach(item => {
                const constituencyId = codeToId[item.code];
                item.areas.split(',').forEach(areaName => {
                    const areaId = areaNameToId[areaName.trim()];
                    if (areaId) junctionValues.push([constituencyId, areaId]);
                });
            });
    
            // 5️⃣ Bulk insert into junction table in a single query
            if (junctionValues.length) {
                await db.query(format(`
                    INSERT INTO constituency_area (constituencyid, areaid)
                    VALUES %L
                    ON CONFLICT DO NOTHING;
                `, junctionValues));
            }
            await client.query('COMMIT');
            console.log('Constituencies and area links inserted successfully ');
    
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error inserting constituencies in bulk:', err);
            throw err;
        }finally{
            client.release();
        }
    
}
async getAreaByConstituency(constituencyid){
    try{
        const sql=`
        SELECT con.*,a.name
      FROM constituency con
      JOIN constituency_area ca ON con.id = ca.constituencyid
      JOIN area a ON ca.areaid = a.id
      WHERE con.id = $1;`
        const result=await db.query(sql, [constituencyid]);
        return result.rows;
    }catch(err){
        console.error('Error fetching constituency by area ID:', err);
        throw new Error('Error fetching constituency by area ID');
    }
}
}
export default new ConstituencyM();