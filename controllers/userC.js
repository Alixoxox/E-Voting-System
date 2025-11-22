import UserM from '../models/userM.js';
import bcrypt from 'bcrypt';
import {io} from '../server.js';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import { redisClient } from '../server.js';
import votesM from '../models/votesM.js';
import userM from '../models/userM.js';
import auditLogsM from '../models/auditLogsM.js';
import pool from '../config/db.js';
dotenv.config(); // loads variables from .env into process.env

const SECRET_KEY = process.env.SECRET_KEY;
class UserC{
fetchUsers = async (req, res) => {
  try {
    const users = await UserM.getAllUsers();
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
    await UserM.generateAndSendOtp(result.id, email);
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
      return res.status(403).json({error:'Please verify your email before signing in.',userId: result.id});
    }
    const UserData={id:result.id,name:result.name,email:result.email};
    const token=jwt.sign(UserData, SECRET_KEY, {expiresIn:'24h'})
    return res.json({message:'User signed successfully',token,UserData});
  }catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'FAILED_USER_SIGNIN','User_',{ error:err.message||'Failed to sign in' ,email:req.body.email,status: 'Error'});
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
    const {electionId}=req.params;
    if(redisClient.exists(`viewCandidatesForUserElection:${areaId}:${electionId}`)){
      let cachedCandidates=await redisClient.get(`viewCandidatesForUserElection:${areaId}:${electionId}`);
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
}// Cast vote with leaderboard cache update
async castVote(req, res) {
  const { candidateParticipatingId, electionId } = req.body;
  const userId = req.user.id;
  try {
    const result = await votesM.CastVote(candidateParticipatingId, userId, electionId);
    res.status(200).json(result);
    setImmediate(async () => {
      try {
        const redisKey = `leaderboard:${result.areaId}:${result.electionId}`;
        let leaderboard;
        if(await redisClient.exists(redisKey)){
          leaderboard = await redisClient.get(redisKey);
          leaderboard = JSON.parse(leaderboard);
        } else {
          leaderboard = await UserM.viewCandidatesForUserElection(result.areaId, result.electionId);
          await redisClient.setEx(redisKey, 10,JSON.stringify(leaderboard)); // 10 sec TTL
        }
        // Emit updated leaderboard to clients
        const room = `const-${result.areaId}-${result.electionId}`;
        io.to(room).emit("leaderboardUpdate", {
          message: "Leaderboard updated",
          areaId: result.areaId,
          electionId: result.electionId,
          leaderboard,
        });
      } catch (err) {
        console.error("Error updating leaderboard cache:", err);
        return res.json({ error: err.message||"Error updating leaderboard cache" });
      }
    });
  } catch (err) {
    console.error("Error Casting Vote:", err);
    await auditLogsM.logAction(req,'FAILED_CAST_VOTE','User_'+userId,{ error:err.message||'Failed to cast vote' ,email:req.user.email,status: 'Error'});
    res.status(500).json({ error: err.message||"Error casting vote" });
  }
}

// Voting history with cache
async votingHistory(req, res) {
  const userId = req.user.id;
  const redisKey = `votingHistory:${userId}`;
  try {
    // 1️⃣ Try cache first
    let votingHistory ;
    if (await redisClient.exists(redisKey)) {
      votingHistory = await redisClient.get(redisKey);
      return res.json(JSON.parse(votingHistory));
    }
    votingHistory = await votesM.votingHistory(userId);
    await redisClient.setEx(redisKey, 120 ,JSON.stringify(votingHistory)); // 2 min TTL
    return res.json(votingHistory);
  } catch (err) {
    console.error("Error fetching voting history:", err);
    await auditLogsM.logAction(req,'FAILED_FETCH_VOTING_HISTORY','User_'+userId,{ error:err.message||'Failed to fetch voting history' ,email:req.user.email,status: 'Error'});
    return res.status(500).json({ error: err.message||"Failed to fetch voting history" });
  }
}
async adminSignin(req, res) {
  const {email,password}=req.body;
  try{
    const result=await UserM.signinUser(email, password);

    // Return Success but NO TOKEN yet
    return res.json({ 
      message: "Credentials verified. OTP sent to email.",
      userId: result.id, // Frontend needs this ID to confirm the OTP
      mfaRequired: true 
    });

  }catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'FAILED_ADMIN_SIGNIN','SYSTEM',{ error:err.message||'Failed to sign in as admin' ,email:req.body.email,status: 'Error'});
    return res.status(500).json({error:err.message||'Failed to sign in as admin'});
}}
adminVerifyMFA = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    // 1. Verify OTP against Redis Cache
    await UserM.verifyOtp(userId, otp);

    // 2. Fetch User details again (needed to ensure latest role/data is in JWT)
    const user = (await pool.query(`SELECT id, name, email FROM users WHERE id=$1`, [userId])).rows[0];

    // 3. Issue Token
    const UserData = { id: user.id,name:user.name ,email: user.email };
    const token = jwt.sign(UserData, SECRET_KEY, { expiresIn: '24h' });
    return res.json({ message: "Login successful", token, UserData });
  } catch (err) {
    // Note: Errors here are typically 'Invalid OTP' or 'OTP expired'
    await logAction(req, 'MFA_FAILED', `User_${req.body.userId}`, { error: err.message });
    return res.status(401).json({ error: err.message });
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
    const { email, cnic } = req.body;
    // Find User
    const resDb = await pool.query("SELECT id FROM users WHERE email=$1 AND cnic=$2", [email, cnic]);
    
    if (!resDb || resDb.rows.length === 0) throw new Error("User not found");
    
    const userId = resDb.rows[0].id;
    await UserM.generateAndSendOtp(userId, email);
    
    return res.json({ message: "OTP sent to email", userId });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
async resetPasswordWithOtp(req, res) {
  try {
    const { userId, otp, newPassword } = req.body;
    await UserM.verifyOtp(userId, otp);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId]);
    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
resendOtp = async (req, res) => {
  try {
    const { userId, email } = req.body;
    // This will throw an error if they click it too soon 
    await UserM.generateAndSendOtp(userId, email);
    return res.json({ message: "New code sent!" });
  } catch (err) {
    return res.status(429).json({ error: err.message });
  }
}
}
export default new UserC()