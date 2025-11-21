import UserM from '../models/userM.js';
import bcrypt from 'bcrypt';
import {io} from '../server.js';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import { redisClient } from '../server.js';
dotenv.config(); // loads variables from .env into process.env

const SECRET_KEY = process.env.SECRET_KEY;
class UserC{
fetchUsers = async (req, res) => {
  try {
    if(await redisClient.exists("AllUsersInfoAdmin")){
      let cachedUsers=await redisClient.get("AllUsersInfoAdmin");
      return res.json(JSON.parse(cachedUsers));
    }
    const users = await UserM.getAllUsers();
    await redisClient.setEx("AllUsersInfoAdmin", 900, JSON.stringify(users));
    return res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message||'Failed to fetch users' });
  }
};
createUser = async (req, res) => {
  try{
    const {name,email, cnic, password, province, city, area} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result=await UserM.createUser(name, email, cnic, hashedPassword, province, city, area, 'user');
    console.log('User created:', result);
    const user={id:result.id,name:result.name,email:result.email,cnic:result.cnic,role:result.role,areaId:result.areaid,cityId:result.cityid,provinceId:result.provinceid};
    const token=jwt.sign(user, SECRET_KEY, {expiresIn:'24h'})
    return res.json({message:'User created successfully',token,user});
  }catch(Err){
    console.log(Err)
    return res.status(500).json({error:Err.message||'Failed to create user'})
  }
}
signinUser = async (req, res) => {
  try{
    const {email, password} = req.body;
    const result=await UserM.signinUser(email, password, 'user');
    const UserData={id:result.id,name:result.name,email:result.email,cnic:result.cnic,role:result.role,areaId:result.areaid,cityId:result.cityid,provinceId:result.provinceid};
    const token=jwt.sign(UserData, SECRET_KEY, {expiresIn:'24h'})
    return res.json({message:'User signed successfully',token,UserData});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:err.message||'Failed to sign in'});
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
    return res.status(500).json({error:err.message||'Failed to fetch candidates for current Election'});
  }
}// Cast vote with leaderboard cache update
async castVote(req, res) {
  const { candidateParticipatingId, electionId } = req.body;
  const userId = req.user.id;
  try {
    const result = await UserM.CastVote(candidateParticipatingId, userId, electionId);
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
    votingHistory = await UserM.votingHistory(userId);
    await redisClient.setEx(redisKey, 120 ,JSON.stringify(votingHistory)); // 2 min TTL
    return res.json(votingHistory);
  } catch (err) {
    console.error("Error fetching voting history:", err);
    return res.status(500).json({ error: err.message||"Failed to fetch voting history" });
  }
}
async adminSignin(req, res) {
const {email,password,cnic}=req.body;
try{
  const result=await UserM.signinUser(email, password,'admin');
  const AdminData={id:result.id,name:result.name,email:result.email,cnic:result.cnic,role:result.role,areaId:result.areaid,cityId:result.cityid,provinceId:result.provinceid};
  const token=jwt.sign(AdminData, SECRET_KEY, {expiresIn:'24h'})
  return res.json({message:'Admin signed successfully',token,AdminData});
}catch(err){
  console.error(err);
  return res.status(500).json({error:err.message||'Failed to sign in as admin'});
}}
}
export default new UserC()