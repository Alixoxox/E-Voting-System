import ConstituencyM from "../models/ConstituencyM.js";
import parseCsvWithValidation from "../utils/parseCsv.js";
import { redisClient } from "../server.js";
import auditLogsM from "../models/auditLogsM.js";
  class ConstituencyC{
getConstituencies = async (req, res) => {
  try {
    const constituencies = await ConstituencyM.getAllConstituencies();
    return res.json(constituencies);
  } catch (err) {
    console.error(err);
    await auditLogsM.logAction(req,'FETCH_CONSTITUENCIES_FAILED','FETCH_CONSTITUENCIES_FAILED',{error:err.message,status: 'Error'});
    res.status(500).json({ error: err.message||'Failed to fetch constituencies' });
  }
}
   addConstituency = async (req, res) => {
    try{
          const required = ['code', 'name', 'seatType', 'areas'];
          const data = await parseCsvWithValidation(req.file.path, required);
          await ConstituencyM.insertConstituenciesFastest(data);
          await auditLogsM.logAction(req,'CONSTITUENCY_CSV_UPLOAD','CONSTITUENCY_CSV_UPLOAD',{rowsAdded:data.length,status: 'Success'});
          return res.json({ message: 'Constituencies added successfully' });
    }catch(Err){
      console.log(Err)
      await auditLogsM.logAction(req,'CONSTITUENCY_CSV_UPLOAD_FAILED','CONSTITUENCY_CSV_UPLOAD_FAILED',{error:Err.message,status: 'Error'});
      return res.status(500).json({error:'Failed to add constituency'})
    }
}
getAreaByConstituency = async (req, res) => {
  try {
    const {constituencyid} = req.params;
    if(await redisClient.exists(`getAreaByConstituency:${constituencyid}`)){
      let cachedResults=await redisClient.get(`getAreaByConstituency:${constituencyid}`)
      return res.json(JSON.parse(cachedResults));
    }
    const constituency = await ConstituencyM.getAreaByConstituency(constituencyid);
    await redisClient.setEx(`getAreaByConstituency:${constituencyid}`,3600, JSON.stringify(constituency))
    return res.json(constituency);
  } catch (err) {
    console.error(err);
    await auditLogsM.logAction(req,'FETCH_AREA_BY_CONSTITUENCY_FAILED','FETCH_AREA_BY_CONSTITUENCY_FAILED',{error:err.message,constituencyId:req.params.constituencyid,status: 'Error'});
    res.status(500).json({ error: err.message||'Failed to fetch areas by constituencies ID' });
  }

}}
export default new ConstituencyC();