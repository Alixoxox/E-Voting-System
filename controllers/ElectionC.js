import ElectionM from "../models/ElectionM.js";
class ElectionC{
getElections = async (req, res) => {
  try {
    const elections = await ElectionM.getAllElections();
    return res.json(elections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
}
CreateEllection = async (req, res) => { 
  try{
    const {name , startDate, endDate, seatType , Province} = req.body;
    if(seatType.tolowerCase()=="national"){
      Province=null;
    }
    await ElectionM.createElection(name , startDate, endDate, seatType , Province);
    return  res.json({message:'Election created successfully'});
  }catch(Err){
    console.log(Err)
    return res.status(500).json({error:'Failed to create election'})
  }}
 getActiveElections=async(req, res)=>{
  try{
    let curentDate=new Date().toISOString().split('T')[0];
    const elections = await ElectionM.getActiveElections(curentDate);
    return res.json(elections);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active elections' });
  }}
}
export default new ElectionC();