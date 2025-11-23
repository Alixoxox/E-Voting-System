import UserM from '../models/userM.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {io} from '../server.js';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import { redisClient } from '../server.js';
import votesM from '../models/votesM.js';
import userM from '../models/userM.js';
import auditLogsM from '../models/auditLogsM.js';
import pool from '../config/db.js';
import { sendVoteReceipt } from '../utils/emailservice.js';
dotenv.config(); // loads variables from .env into process.env

const SECRET_KEY = process.env.SECRET_KEY;
class UserC{
  //paginate this
fetchUsers = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const users = await UserM.getAllUsers(page, limit);
    return res.json(users);
  } catch (err) {
    console.error(err);
    await auditLogsM.logAction(req,'FETCH_USERS_FAILED','ADMIN_'+req.user.id,{ error:err.message||'Failed to fetch users' ,status: 'Error'});
    res.status(500).json({ error: err.message||'Failed to fetch users' });
  }
};
createUser = async (req, res) => {
  try{
    const {name,email, cnic, password, province, city, area} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result=await UserM.createUser(name, email, cnic, hashedPassword, province, city, area, 'user');
    // Send OTP
    await UserM.generateAndSendOtp(result.id, email, 'User Account Verification');
    return res.json({message:'User created successfully. Please verify your email using the OTP sent.', userId: result.id});
  }catch(Err){
    console.log(Err)
    await auditLogsM.logAction(req,'FAILED_CREATE_USER','User_',{error:Err.message||'Failed to create user' ,email:req.body.email,status: 'Error'});
    return res.status(500).json({error:Err.message||'Failed to create user'})
  }
}
signinUser = async (req, res) => {
  try{
    const {email, password} = req.body;
    const result=await UserM.signinUser(email, password);
    console.log(result)
    if(!result.is_verified){
      return res.status(403).json({error:'Please verify your email before signing in.',userId: result.id, areaid: result.areaid});
    }
    const UserData={id:result.id,name:result.name,email:result.email,areaid:result.areaid};
    const token=jwt.sign(UserData, SECRET_KEY, {expiresIn:'24h'})
    return res.json({message:'User signed successfully',token,UserData});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:err.message||'Failed to sign in'});
  }
}
// 2. Verify Registration OTP (Step 2)
verifyAccount = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    await UserM.verifyOtp(userId, otp); // Check Redis
    await UserM.markVerified(userId);   // Update DB

    return res.json({ message: "Account verified! You can now log in." });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
//search from candidate constituency
async viewCandidatesForUserElection(req,res){
  try{
    const areaId=req.user.areaid;
    console.log('User Area ID:', areaId);
    if(!areaId){ throw new Error('Sorry You Are Not Eligible');}
    const {electionId}=req.params;
    if (await redisClient.exists(`viewCandidatesForUserElection:${areaId}:${electionId}`)) {
      let cachedCandidates = await redisClient.get(`viewCandidatesForUserElection:${areaId}:${electionId}`);
      return res.json(JSON.parse(cachedCandidates));
    }
    const candidates=await UserM.viewCandidatesForUserElection(areaId,electionId);
    await redisClient.setEx(`viewCandidatesForUserElection:${areaId}:${electionId}`,3600,JSON.stringify(candidates)) 
    return res.json(candidates);
  }catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'FAILED_FETCH_CANDIDATES_FOR_USER_ELECTION','Election_'+req.params.electionId,{ error:err.message||'Failed to fetch candidates for current Election' ,email:req.user.email,status: 'Error'});
    return res.status(500).json({error:err.message||'Failed to fetch candidates for current Election'});
  }
}
async castVote(req, res) {
  const { candidateParticipatingId, electionId } = req.body;
  const userId = req.user.id;

  try {
    // 2. 🔒 HASHING LOGIC START
    // Get the previous link in the chain
    let previousHash = await votesM.getLastVoteHash(electionId);
    if (!previousHash) previousHash = "GENESIS_HASH_START_0000000000";

    // Create current hash
    const dataString = `${previousHash}-${userId}-${candidateParticipatingId}-${electionId}`;
    const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');
    // 🔒 HASHING LOGIC END

    // 3. Call Model with ALL 5 Arguments
    const result = await votesM.CastVote(candidateParticipatingId, userId, electionId, previousHash, currentHash);

    // 4. Send Email Receipt (Fire & Forget)
    sendVoteReceipt(req.user.email, currentHash, "General Election 2025").catch(console.error);

    // 5. Return Success to Frontend
    res.status(200).json({
      message: 'Vote cast successfully',
      receiptCode: currentHash, // User sees this
      areaId: result.areaId,
      electionId: result.electionId
    });

    // 6. Update Real-time Leaderboard (Socket.io)
    setImmediate(async () => {
      try {
        const redisKey = `leaderboard:${result.areaId}:${result.electionId}`;
        let leaderboard;
        
        // Invalidate or Update Cache
        leaderboard = await UserM.viewCandidatesForUserElection(result.areaId, result.electionId);
        await redisClient.setEx(redisKey, 10, JSON.stringify(leaderboard));

        const room = `const-${result.areaId}-${result.electionId}`;
        io.to(room).emit("leaderboardUpdate", {
          message: "Leaderboard updated",
          areaId: result.areaId,
          electionId: result.electionId,
          leaderboard,
        });
      } catch (err) {
        console.error("Socket Error:", err.message);
      }
    });

  } catch (err) {
    console.error("Error Casting Vote:", err);
    // Log Failure
    await auditLogsM.logAction(req, 'FAILED_CAST_VOTE', `User_${userId}`, { error: err.message });
    res.status(500).json({ error: err.message || "Error casting vote" });
  }
}

// Voting history with cache
async votingHistory(req, res) {
  const userId = req.user.id;
  const limit = req.query.limit || 10;
  const page= req.query.page || 1;
  try {
    let votingHistory = await votesM.votingHistory(userId,limit,page);
    return res.json(votingHistory);
  } catch (err) {
    console.error("Error fetching voting history:", err);
    await auditLogsM.logAction(req,'FAILED_FETCH_VOTING_HISTORY','User_'+userId,{ error:err.message||'Failed to fetch voting history' ,email:req.user.email,status: 'Error'});
    return res.status(500).json({ error: err.message||"Failed to fetch voting history" });
  }
}
async EditProfile(req, res){
  const userId=req.user.id;
  const {name,email,password}=req.body;
  try{
    // Basic validation: Ensure at least one field is there
    if (!name && !email && !password) {
      return res.status(400).json({ error: "Please provide name, email, or password to update." });
    }
    await userM.EditProfile(userId,name,email,password);
    return res.json({message:'Profile updated successfully'});
  }catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'FAILED_PROFILE_EDIT','User_'+userId,{ error:err.message||'Failed to edit profile' ,email:req.user.email,status: 'Error'});
    return res.status(500).json({error:err.message||'Failed to edit profile'});}
}

async forgotPasswordRequest(req, res) {
  try {
    const { email, cnic, type } = req.body; // type = 'user' (default) or 'party'
    const isParty = type === 'party';
    
    let entityId;
    if (isParty) {//party only email
      const resDb = await pool.query("SELECT id FROM party WHERE email=$1", [email]);
      if (resDb.rows.length === 0) throw new Error("Party not found");
      entityId = resDb.rows[0].id;
    } else {
      //User Logic (Check Email + CNIC) ---
      const resDb = await pool.query("SELECT id FROM users WHERE email=$1 AND cnic=$2", [email, cnic]);
      if (resDb.rows.length === 0) throw new Error("User not found");
      entityId = resDb.rows[0].id;
    }
    // We prefix the ID (e.g. "party:5" or "user:5") to distinguish in Redis
    const redisKey = isParty ? `party:${entityId}` : `user:${entityId}`;
    await UserM.generateAndSendOtp(redisKey, email, 'Password Reset OTP');
    return res.json({ message: "OTP sent to email", id: entityId, type: isParty ? 'party' : 'user' });
  } catch (err) {
    await auditLogsM.logAction(req, 'FAILED_PASSWORD_RESET_REQUEST', req.body.email || 'UNKNOWN', { error: err.message, status: 'Error' });
    return res.status(400).json({ error: err.message });
  }
}
async resetPasswordWithOtp(req, res) {
  try {
    const { userId, otp, newPassword, type } = req.body; // type is required
    const isParty = type === 'party';
    
    // 1. Define Table & Prefix based on type
    const table = isParty ? 'party' : 'users';
    const redisKey = isParty ? `party:${userId}` : `user:${userId}`;

    // 2. Verify OTP (Using the prefixed key)
    await UserM.verifyOtp(redisKey, otp);

    // 3. Update Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE ${table} SET password = $1 WHERE id = $2`, [hashedPassword, userId]);

    // 4. Unlock Account (Clear Redis Login Attempts)
    const userRes = await pool.query(`SELECT email FROM ${table} WHERE id = $1`, [userId]);
    
    if (userRes.rows.length > 0) {
      const email = userRes.rows[0].email;
      await redisClient.del(`login:attempts:${email}`);
      await redisClient.del(`login:locked:${email}`);
    }
    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    await auditLogsM.logAction(req, 'FAILED_PASSWORD_RESET', `${req.body.type}_${req.body.userId}`,{ error: err.message, status: 'Error' });
    return res.status(400).json({ error: err.message });
  }
}
resendOtp = async (req, res) => {
  try {
    const { userId, email } = req.body;
    // This will throw an error if they click it too soon 
    await UserM.generateAndSendOtp(userId, email, 'Resend OTP');
    return res.json({ message: "New code sent!" });
  } catch (err) {
    await auditLogsM.logAction(req,'FAILED_RESEND_OTP','User_'+req.body.userId,{ error:err.message||'Failed to resend OTP' ,email:req.body.email,status: 'Error'});
    return res.status(429).json({ error: err.message });
  }
}

}
export default new UserC()