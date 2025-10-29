import UserM from '../models/userM.js';
import bcrypt from 'bcrypt';
import {io} from '../server.js';
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
async castVote(req,res) {
  const { candidateParticipatingId, userId, electionId } = req.body;

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
  const {userId}=req.params;
  console.log(userId);
  const votingHistory=await UserM.votingHistory(userId);
  return res.json(votingHistory);
}catch(err){
  console.error(err);
  throw err;
}}

}
export default new UserC()