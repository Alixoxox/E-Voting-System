import candConstM from "../models/candConstM.js";

class candidateConstituencyC {

getCandConstByPartyAndElection = async (req, res) => {
  try {
    const {partyId,electionId} = req.query;
    console.log(partyId,electionId);
    const candConst = await candConstM.getCandidatesInConstituencyWrtPartyAndElection(partyId,electionId);
    return res.json(candConst);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch candidate-constituency data by candidate ID' });
  }
}
BookConstituencSeatForElectionForCandidate = async (req, res) => {
  try{
    const {candidateId, electionId, constituencyId} = req.body;
    await candConstM.allocateCandidateEllectionConst(candidateId, electionId, constituencyId);
    return  res.json({message:'Candidate allocated to election and constituency successfully'});
  }catch(Err){
    console.log(Err)
    return res.status(500).json({error:'Failed to allocate candidate to election and constituency'})
  }}
}
export default new candidateConstituencyC();