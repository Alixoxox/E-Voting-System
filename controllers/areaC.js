import areaM from "../models/areaM.js";
import parseCsvWithValidation from "../utils/parseCsv.js";
import { redisClient } from "../server.js";
import auditLogsM from "../models/auditLogsM.js";
class AreasC{
  getAreas = async (req, res) => {
  try {
    if(await redisClient.exists("AllAreasInfo")){
      let cachedAreas=await redisClient.get("AllAreasInfo");
      return res.json(JSON.parse(cachedAreas));
    }
    const areas = await areaM.getAllAreas();
    await redisClient.setEx("AllAreasInfo", 3600, JSON.stringify(areas));
    return res.json(areas);
  } catch (err) {
    console.error(err);
    await auditLogsM.logAction(req,'FETCH_AREAS_FAILED','FETCH_AREAS_FAILED',{error:err.message,status: 'Error'});
    res.status(500).json({ error: 'Failed to fetch areas' });
  }
}

 AddAreasCsv = async (req, res) => {
  try{
    const required = ['name', 'city'];
    const data = await parseCsvWithValidation(req.file.path, required);
    // now insert to db
    areaM.AddAreasCsv(data)
    await auditLogsM.logAction(req,'AREAS_CSV_UPLOAD','AREAS_CSV_UPLOAD',{rowsAdded:data.length,status: 'Success'});
    return res.json({ message: 'Areas added successfully' });    
  }catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'AREAS_CSV_UPLOAD_FAILED','AREAS_CSV_UPLOAD_FAILED',{error:err.message,status: 'Error'});
    res.status(500).json({ error: 'Failed to add areas from CSV\n'+err });
  }
}}
export default new AreasC();