import UserM from '../models/userM.js';
import bcrypt from 'bcrypt';
import {io} from '../server.js';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";

dotenv.config(); // loads variables from .env into process.env

const SECRET_KEY = process.env.SECRET_KEY;
class UserC{
fetchUsers = async (req, res) => {
  try {
    const users = await UserM.getAllUsers();
    return res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
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
    const result=await UserM.signinUser(email, password);
    const UserData={id:result.id,name:result.name,email:result.email,cnic:result.cnic,role:result.role,areaId:result.areaid,cityId:result.cityid,provinceId:result.provinceid};
    const token=jwt.sign(UserData, SECRET_KEY, {expiresIn:'24h'})
    return res.json({message:'User signed successfully',token,UserData});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:'Failed to sign in'});
  }
}
//search from candidate constituency
async viewCandidatesForUserElection(req,res){
  try{
    const areaId=req.user.areaid;
    const {electionId}=req.params;
    const candidates=await UserM.viewCandidatesForUserElection(areaId,electionId);
    return res.json(candidates);
  }catch(err){
    console.error(err);
    return res.status(500).json({error:'Failed to fetch candidates for current Election'});
  }
}
async castVote(req,res) {
  const { candidateParticipatingId, electionId } = req.body;
  const userId = req.user.id;
  try {
    const result = await UserM.CastVote(candidateParticipatingId, userId, electionId);

    // ✅ Respond immediately
    res.status(200).json(result);

    // 🚀 Run leaderboard update in background (non-blocking)
    setImmediate(async () => {
      const leaderboard = await UserM.viewCandidatesForUserElection(result.areaId, result.electionId);
      const room = `const-${result.areaId}-${result.electionId}`;
      io.to(room).emit("leaderboardUpdate", {
        message: "Leaderboard updated",
        areaId: result.areaId,
        electionId: result.electionId,
        leaderboard,
      });
    });
  } catch (err) {
    console.error("Error Casting Vote:", err);
    res.status(500).json({ error: "Error casting vote" });
  }};

async votingHistory(req,res){
try{
  const userId=req.user.id;
  console.log(userId);
  const votingHistory=await UserM.votingHistory(userId);
  return res.json(votingHistory);
}catch(err){
  console.error(err);
  throw err;
}}

}
export default new UserC()