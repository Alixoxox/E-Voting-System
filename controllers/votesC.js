import votesM from "../models/votesM.js";
class VotesC{
getVotes = async (req, res) => {
  try {
    const votes = await votesM.getAllVotes();
    return res.json(votes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message||'Failed to fetch votes' });
  }
}
}

export default new VotesC();