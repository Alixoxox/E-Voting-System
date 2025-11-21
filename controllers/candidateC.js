import candidateM from '../models/candidateM.js';
import bcrypt from 'bcrypt';
import { redisClient } from '../server.js';
import auditLogsM from '../models/auditLogsM.js';
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
    await auditLogsM.logAction(req,'FAILED_FETCH_CANDIDATES' ,'SYSTEM',{ error:err.message||'Failed to fetch candidates' ,email:req.user.email,status: 'Error'});
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
    await auditLogsM.logAction(req,'FAILED_FETCH_CANDIDATES_BY_PARTY_ID' ,'Party_'+req.user.id,{ error:err.message||'Failed to fetch candidates by party ID' ,email:req.user.email,status: 'Error'});
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
    const result=await candidateM.createCandidate(name,email, cnic, hashedPassword, province, city, area, partyId, manifesto,imageUrl);
    await auditLogsM.logAction(req,'ADD_CANDIDATE' ,'Candidate_'+result.candId,{ email: email, msg: "Candidate creation successful" ,status: 'Success'});
    return res.json({message:'Candidate created successfully'});
  }catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'FAILED_ADD_CANDIDATE' ,'Candidate_CREATION_FAILED',{ error:err.message||'Failed to create candidate' ,email:req.user.email,status: 'Error'});
    res.status(500).json({ error:err.message|| 'Failed to create candidate' });
  }

}
kickCandidate=async(req, res)=>{
try{
  const partyId=req.user.id;
const {candidateId}=req.params;
await candidateM.kickCandidate(candidateId, partyId);
await auditLogsM.logAction(req,'KICK_CANDIDATE' ,'Candidate_'+candidateId,{ msg: "Candidate kicked successfully" ,status: 'Success'});
}catch(err){
  console.error(err);
  await auditLogsM.logAction(req,'FAILED_KICK_CANDIDATE' ,'Candidate_'+req.params.candidateId,{error:err.message||'Failed to kick candidate' ,email:req.user.email,status: 'Error'});
  res.status(500).json({ error:err.message|| 'Failed to kick candidate' });
}
}
}

export default new CandiateC();