import auditLogsM from "../models/auditLogsM.js";
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
    await auditLogsM.logAction(req,'ALLOCATE_CANDIDATE_ELECTION_CONST' ,'Candidate_'+candidateId,{ electionId: electionId, constituencyId: constituencyId, msg: "Candidate allocated to election and constituency successfully" ,status: 'Success'});
    return  res.json({message:'Candidate allocated to election and constituency successfully'});
  }catch(Err){
    console.log(Err)
    await auditLogsM.logAction(req,'FAILED_ALLOCATE_CANDIDATE_ELECTION_CONST' ,'Candidate_'+req.body.candidateId,{ error:Err.message||'Failed to allocate candidate to election and constituency' ,email:req.user.email,status: 'Error'});
    return res.status(500).json({error:Err.message||'Failed to allocate candidate to election and constituency'})
  }}

ChooseSeat =async(req, res)=>{
  try{
    const {electionId,constituencyId,candidateId}=req.body
    await candConstM.chooseSeat(candidateId,electionId,constituencyId);
    await auditLogsM.logAction(req,'SEAT_CHOSEN' ,'Candidate_'+candidateId,{ electionId: electionId, constituencyId: constituencyId, msg: "Seat chosen successfully" ,status: 'Success'});
    return res.json({message:'Seat chosen successfully'});
  }
  catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'FAILED_SEAT_CHOSEN' ,'Candidate_'+req.body.candidateId,{ error:err.message||'Failed to choose seat' ,email:req.user.email,status: 'Error'});
    res.status(500).json({ error: err.message||'Failed to choose seat for candidate' });
  }
}

GetwonSeats=async(req, res)=>{
try{
  const candidateId = Number(req.params.candidateId);
  console.log(candidateId);
  if(await redisClient.exists(`GetwonSeats:${candidateId}`)){
    let cachedResults=await redisClient.get(`GetwonSeats:${candidateId}`)
    return res.json(JSON.parse(cachedResults));
  }
  const data=await candConstM.getWonSeats(candidateId);
  redisClient.setEx(`GetwonSeats:${candidateId}`,3600,JSON.stringify(data));
  await auditLogsM.logAction(req,'FETCH_WON_SEATS' ,'Candidate_'+candidateId,{ msg: "Fetched won seats successfully" ,status: 'Success'});
  return res.json(data);
}catch(err){
  console.error(err);
  await auditLogsM.logAction(req,'FAILED_FETCH_WON_SEATS' ,'Candidate_'+req.params.candidateId,{ error:err.message||'Failed to fetch won seats' ,email:req.user.email,status: 'Error'});
  res.status(500).json({ error: err.message||'Failed to fetch won seats for candidate' });
}
}

// Controller
GetPartyWonSeats = async (req, res) => {
  try {
    const partyId = req.user.id;

    // Check Redis cache
    if (await redisClient.exists(`PartyWonSeats:${partyId}`)) {
      const cachedResults = await redisClient.get(`PartyWonSeats:${partyId}`);
      return res.json(JSON.parse(cachedResults));
    }

    // Fetch won seats for all candidates under this party
    const data = await candConstM.getPartyWonSeats(partyId);

    // Cache results for 1 hour
    await redisClient.setEx(`PartyWonSeats:${partyId}`, 3600, JSON.stringify(data));

    // Log action
    await auditLogsM.logAction(req, 'FETCH_WON_SEATS', `Party_${partyId}`, {
      msg: "Fetched all candidates' won seats successfully",
      status: 'Success'
    });

    return res.json(data);
  } catch (err) {
    console.error(err);
    await auditLogsM.logAction(req, 'FAILED_FETCH_WON_SEATS', `Party_${req.user.id}`, {
      error: err.message || 'Failed to fetch won seats',
      email: req.user.email,
      status: 'Error'
    });
    res.status(500).json({ error: err.message || 'Failed to fetch won seats for party' });
  }
};}
export default new candidateConstituencyC();