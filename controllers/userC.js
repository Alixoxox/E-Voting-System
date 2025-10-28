import UserM from '../models/userM.js';
import bcrypt from 'bcrypt';

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
    const User=await UserM.createUser(name, email, cnic, hashedPassword, province, city, area, 'user');
    return res.json({message:'User created successfully',UserData:User});
  }catch(Err){
    console.log(Err)
    return res.status(500).json({error:'Failed to create user'})
  }
}
signinUser = async (req, res) => {
  try{
    const {email, password} = req.body;
    const UserData=await UserM.signinUser(email, password);
    return res.json({message:'User signed in successfully',UserData:UserData});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:'Failed to sign in'});
  }
}
//search from candidate constituency
async viewCandidatesForUserElection(req,res){
  try{
    const {areaId,electionId}=req.body;
    const candidates=await UserM.viewCandidatesForUserElection(areaId,electionId);
    return res.json(candidates);
  }catch(err){
    console.error(err);
    return res.status(500).json({error:'Failed to fetch candidates for current Election'});
  }
}
async CastVote(req,res){
  try{
    const {candidateParticipatingId,userId,electionId}=req.body;
    let x=await UserM.CastVote(candidateParticipatingId,userId,electionId);
    return res.json({message:x.message});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:'Failed to fetch active elections for user'});
  }
}

async votingHistory(req,res){
try{
  const {userId}=req.query;
  console.log(userId);
  const votingHistory=await UserM.votingHistory(userId);
  return res.json(votingHistory);
}catch(err){
  console.error(err);
  throw err;
}}

}
export default new UserC()