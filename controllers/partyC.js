import partyM from "../models/partyM.js";
import bcrypt from "bcrypt"
import parseCsvWithValidation from "../utils/parseCsv.js";
class Parties {
  getParties = async (req, res) => {
    try {
      const parties = await partyM.getAllParties();
      return res.json(parties);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch parties" });
    }
  };
  AddPartiesCsv = async (req, res) => {
    try {
      const required = ["name", "abbreviation", "logo","email","password"];
      // validate file existence
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }
      const data = await parseCsvWithValidation(req.file.path, required);
      if (data.length === 0)
        return res
          .status(400)
          .json({ error: "CSV file is empty or has no valid data" });
      // now insert to db
      partyM.addParties(data).then(() => {
        res.json({ message: "Parties added successfully from CSV" });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add parties from CSV\n"+err });
    }
  };
  async createParty(req, res) {
    try {
      const imageUrl = req.file.path; 
      console.log(imageUrl)
      const { name, abbreviation, email, password } = req.body;
      let hashedpass=bcrypt.hash(password,10)
      await partyM.createParty(name, abbreviation, imageUrl,email,hashedpass);
      return res.json({ message: "Party created successfully" });
    } catch (Err) {
      console.log(Err);
      return res.status(500).json({ error: "Failed to create party" });
    }
  }
  async LoginParty(req, res) {
    try {
      const { email, password } = req.body;
      const partyData = await partyM.LoginParty(email, password);
      return res.json({ message: "Party logged in successfully", partyData: partyData });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to login party" });
    }
  }
}

export default new Parties();
