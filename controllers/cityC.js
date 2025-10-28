import cityM from "../models/cityM.js";
import parseCsvWithValidation from "../utils/parseCsv.js";
class cityC{
  getCities = async (req, res) => {
  try {
    const cities = await cityM.getAllCities();
    return res.json(cities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
}
AddCitycsv = async (req, res) => {
  try{
    const required = ['name', 'province'];
    const data = await parseCsvWithValidation(req.file.path, required);
    // now insert to db
    console.log("all good here")
    await cityM.AddCitycsv(data)
    return res.json({ message: 'Cities added successfully' });
    
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Failed to add cities from CSV\n'+err });
  }
}
}
export default new cityC();