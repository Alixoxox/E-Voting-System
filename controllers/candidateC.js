import candidateM from '../models/candidateM.js';
import bcrypt from 'bcrypt';
class CandiateC{
 getCandidates=async(req, res)=> {
  try {
    const candidates = await candidateM.getAllCandidates();
    return res.json(candidates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
}
getCandidatesByPartyId=async(req, res)=> {
  try {
    const {partyId}=req.params;
    const candidates = await candidateM.getCandidatesByPartyId(partyId);
    return res.json(candidates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch candidates by party ID' });
  }
}
CreateCandidate=async(req, res)=>{
  try{
    const {UserData,Candidate}=req.body;
    const {name,email, cnic, password, province, city, area}=UserData
    const {partyId, manifesto}=Candidate
    let hashedPassword = await bcrypt.hash(password, 10);
    await candidateM.createCandidate(name,email, cnic, hashedPassword, province, city, area, partyId, manifesto);
    return  res.json({message:'Candidate created successfully'});
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Failed to create candidate' });
  }

}}

export default new CandiateC();