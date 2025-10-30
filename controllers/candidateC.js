import candidateM from '../models/candidateM.js';
import bcrypt from 'bcrypt';
import { redisClient } from '../server.js';
class CandiateC{
 getCandidates=async(req, res)=> {
  try {
    if(await redisClient.exists("AllCandidatesInfo")){
      let cachedCandidates=await redisClient.get("AllCandidatesInfo");
      return res.json(JSON.parse(cachedCandidates));
    }
    const candidates = await candidateM.getAllCandidates();
    await redisClient.setEx("AllCandidatesInfo", 3600, JSON.stringify(candidates));
    return res.json(candidates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:err.message|| 'Failed to fetch candidates' });
  }
}
getCandidatesByPartyId=async(req, res)=> {
  try {
    const partyId=req.user.id;
    if(redisClient.exists(`getCandidatesByPartyId:${partyId}`)){
      let cachedResults=await redisClient.get(`getCandidatesByPartyId:${partyId}`)
      return res.json(JSON.parse(cachedResults));
    }
    const candidates = await candidateM.getCandidatesByPartyId(partyId);
    await redisClient.setEx(`getCandidatesByPartyId:${partyId}`, 3600, JSON.stringify(candidates));
    return res.json(candidates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message||'Failed to fetch candidates by party ID' });
  }
}
CreateCandidate=async(req, res)=>{
  try{
    const imageUrl = req.file.path; 
    const {UserData,Candidate}=req.body;
    const {name,email, cnic, password, province, city, area}=UserData
    const {partyId, manifesto}=Candidate
    let hashedPassword = await bcrypt.hash(password, 10);
    await candidateM.createCandidate(name,email, cnic, hashedPassword, province, city, area, partyId, manifesto,imageUrl);
    return  res.json({message:'Candidate created successfully'});
  }catch(err){
    console.error(err);
    res.status(500).json({ error:err.message|| 'Failed to create candidate' });
  }

}
kickCandidate=async(req, res)=>{
try{
  const partyId=req.user.id;
const {candidateId}=req.params;
await candidateM.kickCandidate(candidateId, partyId);
}catch(err){
  console.error(err);
  res.status(500).json({ error:err.message|| 'Failed to kick candidate' });
}
}
}

export default new CandiateC();