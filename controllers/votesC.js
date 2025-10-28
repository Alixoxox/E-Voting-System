import votesM from "../models/votesM.js";
class VotesC{
getVotes = async (req, res) => {
  try {
    const votes = await votesM.getAllVotes();
    return res.json(votes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
}
  
// castVotes= async (req, res) => {
//   try{
//         const {electionId, constituencyCode, candidateId} = req.body;
//         await votesM.castVotes(electionId, constituencyCode, candidateId, votesCount);
//         return res.json({ message: 'Votes cast successfully' });
//   }catch(Err){
//     console.log(Err)
//     return res.status(500).json({error:'Failed to cast votes'})
//   }
// }

}

export default new VotesC();