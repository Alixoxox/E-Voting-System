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
      throw err;
    }
  }
  async createUser(name, email, cnic, password, province, city, area,role) {
  try{
    console.log('Creating user with:', name, email, cnic, province, city, area, role);
    let result = await pool.query(`
      SELECT p.id AS province_id, c.id AS city_id, a.id AS area_id
      FROM province p
      JOIN city c ON c.provinceid = p.id
      JOIN area a ON a.cityid = c.id
      WHERE p.name = $1 AND c.name = $2 AND a.name = $3
    `, [province, city, area]); 
    console.log('Location IDs fetched:', result.rows);
    if(result.rows.length === 0){
      throw new Error('Invalid province, city, or area name');
    }
    const { province_id, city_id, area_id } = result.rows[0];

    result=await pool.query(`INSERT INTO users (name, email, cnic, password, provinceId, cityId, areaId, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [name, email, cnic, password, province_id, city_id, area_id,role ]);
    return result.rows[0];
  }catch(err){
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Error creating user:', err);
    throw err;
  }
}
async signinUser(email, password){
  try{
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if(result.rows.length === 0){
      throw new Error('User not found');
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
      throw new Error('Invalid password');
    }
    return user;
  }catch(err){
    console.error('Error signing in user:', err);
    throw err;
  }
}
async viewCandidatesForUserElection(areaId, electionId){
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
    throw err;
  }
}

async CastVote(candidateParticipatingId,userId,electionId){
  try{
    // Check if the user has already voted in this election
    const voteCheck = await pool.query(`
      SELECT * FROM votes 
      WHERE userId = $1 AND electionId = $2
    `, [userId, electionId]);

    if(voteCheck.rows.length > 0){
      return { message: 'User has already casted his vote' };
    }

    // Record the vote
    await pool.query(`
      INSERT INTO votes (userId, candidateConstid, electionId) 
      VALUES ($1, $2, $3)
    `, [userId, candidateParticipatingId, electionId]);

    // Increment the total votes for the candidate in candidateConstituency
    await pool.query(`
      UPDATE candidateConstituency 
      SET totalVotes = totalVotes + 1 
      WHERE id = $1
    `, [candidateParticipatingId]);

    return { message: 'Vote cast successfully' };
  }catch(err){
    console.error('Error casting vote:', err);
    throw err;
  }
}
async votingHistory(userId){
try{
  const sql=`
  SELECT v.*, cc.id as candidateParticipatingId, u.name AS candidateName, u.email AS candidateEmail, u.cnic AS candidateCnic, p.name AS partyName, e.name AS electionName, con.name AS constituencyName
  FROM votes v
  JOIN candidateConstituency cc ON v.candidateConstid = cc.id
  JOIN candidate c ON cc.candidateId = c.id
  JOIN users u ON c.userId = u.id
  JOIN party p ON c.partyId = p.id
  JOIN elections e ON v.electionId = e.id
  JOIN constituency con ON cc.constituencyId = con.id
  WHERE v.userId = $1;
  `;
  const result=await pool.query(sql, [userId]);
  return result.rows;
}catch(err){
  console.error('Error fetching voting history:', err);
  throw err;
}
}
}
export default new UserM();
