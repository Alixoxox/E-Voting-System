import db from '../config/db.js';
class ProvinceM{
    async createTable(){
        try{
            const sql=`
            CREATE TABLE IF NOT EXISTS province(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE);`
            await db.query(sql);
            console.log('Province table created or already exists.');
        }catch(err){
            console.error('Error creating Province table:', err);
        }
    }
    async getAllProvinces(){
        try{
            const sql=`SELECT * FROM province;`;
            const result=await db.query(sql);
            return result.rows;
        }catch(err){
            console.error('Error fetching provinces:', err);
            throw new Error('Error fetching provinces');
        }
    }
    async AddProvinceCsv(provinces){
    const client = await db.connect();
      try {
          await client.query('BEGIN');
          const values = [];
          const rows = [];
      
          for (const p of provinces) {
            values.push(p.name.trim().toLowerCase());
            rows.push(`($${values.length})`);
          }
      
          const sql = `
            INSERT INTO province (name)
            VALUES ${rows.join(', ')}
            ON CONFLICT (name) DO NOTHING;
          `;
      
          await db.query(sql, values);
          await client.query('COMMIT');
        } catch (err) {
          console.error('Error inserting provinces:', err);
          await client.query('ROLLBACK');
          throw err;
        }finally{
          client.release();
        }
      }
}
export default new ProvinceM();