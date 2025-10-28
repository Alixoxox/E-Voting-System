import ConstituencyM from "../models/ConstituencyM.js";
import parseCsvWithValidation from "../utils/parseCsv.js";

  class ConstituencyC{
getConstituencies = async (req, res) => {
  try {
    const constituencies = await ConstituencyM.getAllConstituencies();
    return res.json(constituencies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch constituencies' });
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
    const {constituencyid} = req.query;
    const constituency = await ConstituencyM.getAreaByConstituency(constituencyid);
    return res.json(constituency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch areas by constituencies ID' });
  }

}}
export default new ConstituencyC();