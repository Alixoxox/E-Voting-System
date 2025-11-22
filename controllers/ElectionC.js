import auditLogsM from "../models/auditLogsM.js";
import ElectionM from "../models/ElectionM.js";
import votesM from "../models/votesM.js";
import { redisClient } from "../server.js";
class ElectionC{
getElections = async (req, res) => {
  try {
    if(await redisClient.exists("AllElectionsInfo")){
      let cachedElections=await redisClient.get("AllElectionsInfo");
      return res.json(JSON.parse(cachedElections));
    }
    const elections = await ElectionM.getAllElections();
    await redisClient.setEx("AllElectionsInfo", 3600, JSON.stringify(elections));
    return res.json(elections);
  } catch (err) {
    console.error(err);
    await auditLogsM.logAction(req,'FAILED_FETCH_ELECTIONS' ,'User_'+req.user.id,{ error:err.message||'Failed to fetch elections' ,email:req.user.email,status: 'Error'});
    res.status(500).json({ error: err.message||'Failed to fetch elections' });
  }
}
CreateEllection = async (req, res) => { 
  try{
    const {name , startDate, endDate, seatType , Province} = req.body;
    if(seatType.tolowerCase()=="national"){
      Province=null;
    }
    await ElectionM.createElection(name , startDate, endDate, seatType , Province);
    await auditLogsM.logAction(req,'CREATE_ELECTION' ,'User_'+req.user.id,{ msg:'Created election '+name ,email:req.user.email,status: 'Success'});
    return  res.json({message:'Election created successfully'});
  }catch(Err){
    console.log(Err)
    await auditLogsM.logAction(req,'FAILED_CREATE_ELECTION' ,'User_'+req.user.id,{ error:Err.message||'Failed to create election' ,email:req.user.email,status: 'Error'});
    return res.status(500).json({error:Err.message||'Failed to create election'})
  }}
 getActiveElections=async(req, res)=>{
  try{
    let curentDate=new Date().toISOString().split('T')[0];
    if(await redisClient.exists(`getActiveElections:${curentDate}`)){
      let cached=await redisClient.get(`getActiveElections:${curentDate}`)
      return res.json(JSON.parse(cached))
    }
    const elections = await ElectionM.getActiveElections(curentDate);
    await redisClient.setEx(`getActiveElections:${curentDate}`,3600,JSON.stringify(elections))
    return res.json(elections);
  }catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'FAILED_FETCH_ACTIVE_ELECTIONS' ,'User_'+req.user.id,{ error:err.message||'Failed to fetch active elections' ,email:req.user.email,status: 'Error'});
    res.status(500).json({ error: err.message||'Failed to fetch active elections' });
  }}

  async verifyElectionIntegrity(req,rea){
    try{
      const {electionId}=req.params;
      const result=await votesM.verifyElectionIntegrity(electionId);
      await auditLogsM.logAction(req,'VERIFY_ELECTION_INTEGRITY' ,'Votes_'+req.user.id,{ electionId: electionId, msg: "Election integrity verified successfully" ,status: 'Success'});
      return res.json({message:'Election integrity verified successfully',result});
    }catch(err){
      console.error(err);
      await auditLogsM.logAction(req,'FAILED_VERIFY_ELECTION_INTEGRITY' ,'Votes_',{ error:err.message||'Failed to verify election integrity' ,email:req.user.email,status: 'Error'});
      res.status(500).json({ error: err.message||'Failed to verify election integrity' });
    }
  }

getPastResults = async (req, res) => {
  try {
    const results = await ElectionM.getPastElectionResults();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
}
export default new ElectionC();