import areaM from "../models/areaM.js";
import parseCsvWithValidation from "../utils/parseCsv.js";

class AreasC{ getAreas = async (req, res) => {
  try {
    const areas = await areaM.getAllAreas();
    return res.json(areas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch areas' });
  }
}

 AddAreasCsv = async (req, res) => {
  try{
    const required = ['name', 'city'];
    const data = await parseCsvWithValidation(req.file.path, required);
    // now insert to db
    areaM.AddAreasCsv(data)
    return res.json({ message: 'Areas added successfully' });    
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Failed to add areas from CSV\n'+err });
  }
}}
export default new AreasC();