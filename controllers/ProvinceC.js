import ProvinceM from '../models/ProvinceM.js';
import parseCsvWithValidation from '../utils/parseCsv.js';
class ProvinceC {
  getProvinces = async (req, res) => {
    try {
        const provinces = await ProvinceM.getAllProvinces();
        return res.json(provinces);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch provinces' });
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
        return res.json({ message: 'Provinces added successfully' });

    }    catch(err){
        console.error(err);
        res.status(500).json({ error: 'Failed to add provinces from CSV\n'+err });}

    }
}
export default new ProvinceC();