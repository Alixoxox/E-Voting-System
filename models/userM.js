import pool from "../config/db.js";
import bcrypt from 'bcrypt';
import { redisClient } from "../server.js";
import crypto from 'crypto';
import { sendOTP } from "../utils/emailservice.js";
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
      is_verified BOOLEAN DEFAULT FALSE,    
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
    console.log('Creating user with:', name, email, cnic, province, city, area, role);
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
    let is_verified=false;
    if(role==='admin'||role==='candidate'){
    is_verified=true;
    }
    result=await pool.query(`INSERT INTO users (name, email, cnic, password, provinceId, cityId, areaId, role, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) Returning *`, [name, email, cnic, password, province_id, city_id, area_id,role,is_verified ]);
    return result.rows[0];
  }catch(err){
    if (err.code === '23505') {
      throw new Error('Email or Cnic already exists');
    }
    throw new Error(err.message || 'Error creating user');
  }
}
async signinUser(email, password){
  const ATTEMPTS_KEY = `login:attempts:${email}`;
  const LOCK_KEY = `login:locked:${email}`;
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 15 * 60; // 15 minutes in seconds

  try {
    // 1. CHECK: Is account currently locked in Redis?
    const isLocked = await redisClient.get(LOCK_KEY);
    if (isLocked) {
      const ttl = await redisClient.ttl(LOCK_KEY); // Get remaining time
      const minutes = Math.ceil(ttl / 60);
      throw new Error(`Account locked. Try again in ${minutes} minutes.`);
    }

    // 2. Find User (Main DB)
    const res = await pool.query(`SELECT id, name, email, password,is_verified FROM users WHERE email = $1`, [email]);
    if (res.rows.length === 0) throw new Error('User not found');
    const user = res.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment attempts in Redis
      const attempts = await redisClient.incr(ATTEMPTS_KEY);
      
      if (attempts === 1) {
        // Set expiry for the count itself (e.g., reset count after 1 hour if not locked)
        await redisClient.expire(ATTEMPTS_KEY, 3600);
      }

      if (attempts >= MAX_ATTEMPTS) {
        // LOCK THE ACCOUNT
        await redisClient.setEx(LOCK_KEY, LOCK_DURATION, '1'); // Lock for 15 mins
        await redisClient.del(ATTEMPTS_KEY); // Reset counter so it starts fresh after lock
        throw new Error('Too many failed attempts. Account locked for 15 mins.');
      } else {
        throw new Error(`Invalid password. ${MAX_ATTEMPTS - attempts} attempts remaining.`);
      }
    }
    // Clear any existing attempts upon success
    await redisClient.del(ATTEMPTS_KEY);
    return user;
  } catch (err) {
    throw err;
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

async generateAndSendOtp(userId, email) {
  const OTP_COOLDOWN_KEY = `otp:cooldown:${userId}`;
  const OTP_LIMIT_KEY = `otp:limit:${userId}`;  
  const COOLDOWN_TIME = 60;   // 60 seconds wait time
  const LIMIT_WINDOW = 3600;  // 1 hour window
  const MAX_REQUESTS = 3;     // Max 3 OTPs per hour

  try {
    // 1. CHECK COOLDOWN (Prevent spamming the button)
    const isCoolingDown = await redisClient.get(OTP_COOLDOWN_KEY);
    if (isCoolingDown) {
      const ttl = await redisClient.ttl(OTP_COOLDOWN_KEY);
      throw new Error(`Please wait ${ttl} seconds before requesting another code.`);
    }

    // 2. CHECK HOURLY LIMIT (Prevent abuse)
    const requestCount = await redisClient.incr(OTP_LIMIT_KEY);
    
    // If this is the first request, set the 1-hour expiry
    if (requestCount === 1) {
      await redisClient.expire(OTP_LIMIT_KEY, LIMIT_WINDOW);
    }

    if (requestCount > MAX_REQUESTS) {
      const ttl = await redisClient.ttl(OTP_LIMIT_KEY);
      const minutes = Math.ceil(ttl / 60);
      throw new Error(`Too many OTP requests. Try again in ${minutes} minutes.`);
    }

    // 3. GENERATE & STORE OTP (Your existing logic)
    const otp = crypto.randomInt(100000, 999999).toString();
    await redisClient.setEx(`otp:${userId}`, 600, otp); // OTP valid for 10 mins

    // 4. SET COOLDOWN (Lock requests for 60s)
    await redisClient.setEx(OTP_COOLDOWN_KEY, COOLDOWN_TIME, '1');
    await sendOTP(email, otp);
    return otp; 
  } catch (err) {
    throw err; 
  }
}
// 2. Verify OTP
async verifyOtp(userId, inputCode) {
  const storedCode = await redisClient.get(`otp:${userId}`);

  if (!storedCode) throw new Error("OTP has expired. Please request a new one.");
  if (storedCode !== inputCode) throw new Error("Invalid OTP code.");

  // Delete OTP after use so it can't be used twice
  await redisClient.del(`otp:${userId}`);
  
  return true;
}

// 3. Mark User as Verified (for Registration)
async markVerified(userId) {
  await pool.query(`UPDATE users SET is_verified = TRUE WHERE id = $1`, [userId]);
}
}
export default new UserM();
