import ConstituencyM from "../models/ConstituencyM.js";
import parseCsvWithValidation from "../utils/parseCsv.js";
import { redisClient } from "../server.js";
  class ConstituencyC{
getConstituencies = async (req, res) => {
  try {
    if(await redisClient.exists("AllConstituenciesInfo")){
      let cachedConstituency= await redisClient.get("AllConstituenciesInfo")
      return res.json(JSON.parse(cachedConstituency));
    }
    const constituencies = await ConstituencyM.getAllConstituencies();
    await redisClient.setEx("AllConstituenciesInfo", 3600, JSON.stringify(constituencies));
    return res.json(constituencies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message||'Failed to fetch constituencies' });
  }
}
   addConstituency = async (req, res) => {
    try{
          const required = ['code', 'name', 'seatType', 'areas'];
          const data = await parseCsvWithValidation(req.file.path, required);
          await ConstituencyM.insertConstituenciesFastest(data);
          return res.json({ message: 'Constituencies added successfully' });
    }catch(Err){
      console.log(Err)
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
    res.status(500).json({ error: err.message||'Failed to fetch areas by constituencies ID' });
  }

}}
export default new ConstituencyC();