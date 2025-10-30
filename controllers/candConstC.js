import candConstM from "../models/candConstM.js";
import { redisClient } from "../server.js";
class candidateConstituencyC {

getCandConstByPartyAndElection = async (req, res) => {
  try {
    const partyId = req.user.id;
    const {electionId} = req.params;
    if(await redisClient.exists(`getCandConstByPartyAndElection:${partyId}:${electionId}`)){
      let cachedResults=await redisClient.get(`getCandConstByPartyAndElection:${partyId}:${electionId}`)
      return res.json(JSON.parse(cachedResults));
    }
    const candConst = await candConstM.getCandidatesInConstituencyWrtPartyAndElection(partyId,electionId);
    await redisClient.setEx(`getCandConstByPartyAndElection:${partyId}:${electionId}`, 600, JSON.stringify(candConst));
    return res.json(candConst);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message||'Failed to fetch candidate-constituency data by candidate ID' });
  }
}
BookConstituencSeatForElectionForCandidate = async (req, res) => {
  try{
    const {candidateId, electionId, constituencyId} = req.body;
    
    await candConstM.allocateCandidateEllectionConst(candidateId, electionId, constituencyId);
    return  res.json({message:'Candidate allocated to election and constituency successfully'});
  }catch(Err){
    console.log(Err)
    return res.status(500).json({error:Err.message||'Failed to allocate candidate to election and constituency'})
  }}

ChooseSeat =async(req, res)=>{
  try{
    const {electionId,constituencyId,candidateId}=req.body
    await candConstM.chooseSeat(candidateId,electionId,constituencyId);
    return res.json({message:'Seat chosen successfully'});
  }
  catch(err){
    console.error(err);
    res.status(500).json({ error: err.message||'Failed to choose seat for candidate' });
  }
}

GetwonSeats=async(req, res)=>{
try{
  const candidateId = req.params; // candidate must be logged in
  if(await redisClient.exists(`GetwonSeats:${candidateId}`)){
    let cachedResults=await redisClient.get(`GetwonSeats:${candidateId}`)
    return res.json(JSON.parse(cachedResults));
  }
  const data=await candConstM.getWonSeats(candidateId);
  redisClient.setEx(`GetwonSeats:${candidateId}`,3600,JSON.stringify(data));
  return res.json(data);
}catch(err){
  console.error(err);
  res.status(500).json({ error: err.message||'Failed to fetch won seats for candidate' });
}
}}
export default new candidateConstituencyC();