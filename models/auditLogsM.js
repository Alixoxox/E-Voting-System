import pool from "../config/db.js";

class audit_logsM{
    async createTable(){
        try{
            const sql=`
              CREATE TABLE IF NOT EXISTS audit_logs (
              id SERIAL PRIMARY KEY,
              actor_name VARCHAR(100) DEFAULT 'SYSTEM', -- Stores "Ali" or "SYSTEM"
              action VARCHAR(50) NOT NULL,              -- e.g. "DELETE_ELECTION"
              target_id VARCHAR(50),                    -- e.g. "Election_5" or "User_10"
              details TEXT,                             -- JSON details
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`
            await pool.query(sql);
            console.log('audit_logs table created or already exists.');
        }catch(err){
            console.error('Error creating audit_logs table:', err);
        }
    }
    async logAction (req, action, targetId, details = {}) {
        try {
          let actorName = 'SYSTEM';
          if (req && req.user && req.user.name) {
            actorName = req.user.name; 
          }
          // 2. Insert into DB
          const query = `
            INSERT INTO audit_logs (actor_name, action, target_id, details)
            VALUES ($1, $2, $3, $4)
          `;
      
          await pool.query(query, [
            actorName,
            action,
            String(targetId),       // tableName_id
            JSON.stringify(details)  
          ]);
      
          console.log(`📝 Audit: ${actorName} performed ${action}`);
      
        } catch (err) {
          console.error("Logging failed:", err.message);
        }
      };
}
export default new audit_logsM();