import pool from "../config/db.js";
import bcrypt from 'bcrypt';
class UserM {
  async createTable() {
    try {
      const sql = `
      CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      cnic VARCHAR(15) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      provinceId INTEGER REFERENCES province(id),
      cityId INTEGER REFERENCES city(id),
      areaId INTEGER REFERENCES area(id),
      failed_attempts INTEGER DEFAULT 0,
      lockout_until TIMESTAMP default NULL,
      role VARCHAR(20) CHECK (role IN ('admin', 'user', 'candidate')) DEFAULT 'user',    
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`
      await pool.query(sql);
      console.log("Users table created or already exists.");
    } catch (err) {
      console.error("Error creating Users table:", err);
    }
  }
  async getAllUsers() {
    try {
      const sql = `SELECT * FROM users;`;
      const result = await pool.query(sql);
      return result.rows;
    } catch (err) {
      console.error("Error fetching users:", err);
      throw new Error('Error fetching users');
    }
  }
  async createUser(name, email, cnic, password, province, city, area,role) {
  try{
    let result = await pool.query(`
      SELECT p.id AS province_id, c.id AS city_id, a.id AS area_id
      FROM province p
      JOIN city c ON c.provinceid = p.id
      JOIN area a ON a.cityid = c.id
      WHERE p.name = $1 AND c.name = $2 AND a.name = $3
    `, [province, city, area]); 
    if(result.rows.length === 0){
      throw new Error('Invalid province, city, or area name');
    }
    const { province_id, city_id, area_id } = result.rows[0];
    result=await pool.query(`INSERT INTO users (name, email, cnic, password, provinceId, cityId, areaId, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) Returning *`, [name, email, cnic, password, province_id, city_id, area_id,role ]);
    return result.rows[0];
  }catch(err){
    if (err.code === '23505') {
      throw new Error('Email or Cnic already exists');
    }
    throw new Error(err.message || 'Error creating user');
  }
}
async signinUser(email, password){
  try{
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if(result.rows.length === 0) throw new Error('User not found');
    
    const user = result.rows[0];
    if (user.lockout_until && new Date() < new Date(user.lockout_until)) {
      const timeLeft = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
      throw new Error(`Account locked. Try again in ${timeLeft} minutes.`);
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
      const newFailCount = (user.failed_attempts || 0) + 1;
      // account lockout logic >=5 attempts stall for 15 mins
      if (newFailCount >= 5) {
        // Lock for 15 minutes
        const lockTime = new Date(Date.now() + 15 * 60 * 1000);
        await pool.query(`UPDATE users SET failed_attempts = 0, lockout_until = $1 WHERE id = $2`, [lockTime, user.id]);
        throw new Error('Too many failed attempts. Account locked for 15 mins.');
      } else {
        // Just count the failure
        await pool.query(`UPDATE users SET failed_attempts = $1 WHERE id = $2`, [newFailCount, user.id]);
        throw new Error(`Invalid password. ${5 - newFailCount} attempts remaining.`);
      }
    }
    if (user.failed_attempts > 0 || user.lockout_until) {
      await pool.query(`UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = $1`, [user.id]);
    }
    return user;
  }catch(err){
    console.error('Error signing in user:', err);
    throw new Error(err.message||'Error signing in user');
  }
}
async viewCandidatesForUserElection(areaId, electionId){
  console.log('Viewing from db:', areaId, 'and electionId:', electionId);
  try{
    const sql=`
    SELECT c.*,cc.id as candidateParticipatingId,cc.totalVotes ,u.name, u.email, u.cnic, p.name AS partyName
    FROM candidateConstituency cc
    JOIN candidate c ON cc.candidateId = c.id
    JOIN users u ON c.userId = u.id
    JOIN party p ON c.partyId = p.id
    JOIN constituency con ON cc.constituencyId = con.id
    JOIN constituency_area ca ON ca.constituencyId = con.id
    WHERE ca.areaId = $1
      AND cc.electionId = $2;
    `;
    const result=await pool.query(sql, [areaId, electionId]);
    return result.rows;
  }catch(err){
    console.error('Error viewing candidates for user election:', err);
    throw new Error('Error viewing candidates for user election');
  }
}
async EditProfile(userId,name,email,password){
  try{
    let parts=[] // this contains name , email , password
    let values=[] 
    let counter=1

    if(name){
      parts.push(`name=$${counter}`);
      values.push(name);
      counter++;
    }
    if(email){
      parts.push(`email=$${counter}`);
      values.push(email);
      counter++;
    }
    if (password){
      const hashedPassword = await bcrypt.hash(password, 10);
      parts.push(`password=$${counter}`);
      values.push(hashedPassword);
      counter++;
    }

    const sql = `
      UPDATE users 
      SET ${parts.join(', ')} 
      WHERE id = $${counter} 
      RETURNING id, name, email
    `;
    values.push(userId);
    const result = await pool.query(sql, values);
    return result.rows[0];
  }catch(err){
    if (err.code === '23505') throw new Error('Email already taken');
    throw err;
  }
}

async PutAdmin(admins){
    for(const admin of admins){
      try{
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      await this.createUser(admin.name, admin.email, admin.cnic, hashedPassword, admin.province, admin.city, admin.area,'admin');
      console.log(`Admin user ${admin.email} created.`);
  }catch(err){
    console.log(`Admin ${admin.name} Already Present`);
  } }
}
async resetPassword(email,cnic,oldPassword, newPassword){
  try{
    const findIfPresent=await pool.query(`SELECT * FROM users WHERE email = $1 and cnic = $2`, [email, cnic]);
    if(findIfPresent.rows.length === 0){
      throw new Error('User not found');
    }
    const isMatch = await bcrypt.compare(oldPassword, findIfPresent.rows[0].password);
    if(!isMatch){
      throw new Error('Old password is incorrect');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = $1 WHERE email = $2 and cnic = $3 and id= $4`, [hashedPassword, email, cnic,findIfPresent.rows[0].id]);
  }catch(err){
    throw new Error(err.message || 'Error resetting password');
  }
}
}
export default new UserM();
