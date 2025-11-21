import ProvinceM from '../models/ProvinceM.js';
import parseCsvWithValidation from '../utils/parseCsv.js';
import { redisClient } from '../server.js';
import auditLogsM from '../models/auditLogsM.js';
class ProvinceC {
  getProvinces = async (req, res) => {
    try {
        if(await redisClient.exists("AllProvincesInfo")){
            let cachedProvinces =await  redisClient.get("AllProvincesInfo");
            return res.json(JSON.parse(cachedProvinces));
        }
        const provinces = await ProvinceM.getAllProvinces();
        await redisClient.setEx("AllProvincesInfo", 3600, JSON.stringify(provinces));
        return res.json(provinces);
    } catch (err) {
        console.error(err);
        await auditLogsM.logAction(req,'FETCH_PROVINCES_FAILED','FETCH_PROVINCES_FAILED',{error:err.message,status: 'Error'});
        res.status(500).json({ error: err.message||'Failed to fetch provinces' });
    }
}
 AddProvincesCsv = async (req, res) => {
    try{
        const required = ['name'];
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded' });
          }
      
        const data = await parseCsvWithValidation(req.file.path, required);
        if(data.length === 0) return res.status(400).json({ error: 'CSV file is empty or has no valid data' });
        // now insert to db
        await ProvinceM.AddProvinceCsv(data)
        await  auditLogsM.logAction(req,'PROVINCES_CSV_UPLOAD','PROVINCES_CSV_UPLOAD',{rowsAdded:data.length,status: 'Success'});
        return res.json({ message: 'Provinces added successfully' });

    }    catch(err){
        console.error(err);
        await auditLogsM.logAction(req,'PROVINCES_CSV_UPLOAD_FAILED','PROVINCES_CSV_UPLOAD_FAILED',{error:err.message,status: 'Error'});
        res.status(500).json({ error: 'Failed to add provinces from CSV\n'+err });}

    }
}
export default new ProvinceC();