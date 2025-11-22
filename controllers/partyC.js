import partyM from "../models/partyM.js";
import bcrypt from "bcrypt"
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { redisClient } from "../server.js";
dotenv.config(); // loads variables from .env into process.env

const SECRET_KEY = process.env.SECRET_KEY;
import parseCsvWithValidation from "../utils/parseCsv.js";
import auditLogsM from "../models/auditLogsM.js";
import userM from "../models/userM.js";
import pool from "../config/db.js";
class Parties {
  getParties = async (req, res) => {
    try {
      if(await redisClient.exists("AllPartiesInfo")){
        let cachedParty=await redisClient.get("AllPartiesInfo");
        return res.json(JSON.parse(cachedParty));
      }
      const parties = await partyM.getAllParties();
      await redisClient.setEx("AllPartiesInfo", 3600, JSON.stringify(parties));
      return res.json(parties);
    } catch (err) {
      console.error(err);
      await auditLogsM.logAction(req,'FETCH_PARTIES_FAILED','FETCH_PARTIES_FAILED',{error:err.message,status: 'Error'});
      res.status(500).json({ error: err.message||"Failed to fetch parties" });
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
        await partyM.addParties(data)
        await auditLogsM.logAction(req,'PARTY_CSV_UPLOAD','PARTY_CSV_UPLOAD',{rowsAdded:data.length,status: 'Success'});
        res.json({ message: "Parties added successfully from CSV" });
      
    } catch (err) {
      console.error(err);
      await auditLogsM.logAction(req,'PARTY_CSV_UPLOAD_FAILED','PARTY_CSV_UPLOAD_FAILED',{error:err.message,status: 'Error'});
      res.status(500).json({ error: "Failed to add parties from CSV\n"+err });
    }
  };
  async createParty(req, res) {
    try {
      const imageUrl = req.file.path; 
      const { name, abbreviation, email, password } = req.body;
      let hashedpass=bcrypt.hash(password,10)
      let result= await partyM.createParty(name, abbreviation, imageUrl,email,hashedpass);
      await userM.generateAndSendOtp(`party:${result.id}`, email, 'Party Account Verification');
      await auditLogsM.logAction(req, 'PARTY_REGISTERED', `Party_${result.id}`, { partyName: result.name, status: 'Pending Verification' });
      return res.json({message: "Party registered. Please verify your email to activate account.", partyId: result.id });     
    } catch (Err) {
      console.log(Err);
      await auditLogsM.logAction(req,'PARTY_CREATION_FAILED','PARTY_CREATION_FAILED',{error:Err.message,status: 'Error'});
      return res.status(500).json({ error: Err.message||"Failed to create party" });
    }
  }
  async verifyParty(req, res) {
    try {
      const { partyId, otp } = req.body;
        await userM.verifyOtp(`party:${partyId}`, otp);
  
      // 2. Update Status to 'Approved'
      await partyM.markVerified(partyId);
  
      return res.json({ message: "Account Approved! You can now log in." });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
  async LoginParty(req, res) {
    try {
      const { email, password } = req.body;
      const result = await partyM.LoginParty(email, password);
      const PartyData={id:result.id,name:result.name,email:result.email};
      const token=jwt.sign(PartyData, SECRET_KEY, {expiresIn:'24h'})
      return res.json({ message: "Party logged in successfully",PartyData,token });
    } catch (err) {
      console.error(err);
      await auditLogsM.logAction(req,'PARTY_LOGIN_FAILED','PARTY_LOGIN_FAILED',{email:req.body.email,error:err.message,status: 'Error'});
      return res.status(500).json({ error: err.message||"Failed to login party" });
    }
  }
  async RejectPartyRegistration(req, res) {
    try {
      const { partyId } = req.params;
      await pool.query(`UPDATE party SET approvalStatus = 'Rejected' WHERE id = $1`, [partyId]);
      auditLogsM.logAction(req,'PARTY_REGISTRATION_REJECTED',`Party_${partyId}`,{status: 'Success'});
      return res.json({ message: "Party registration rejected successfully" });
    } catch (err) {
      console.error(err);
      auditLogsM.logAction(req,'PARTY_REGISTRATION_REJECTION_FAILED',`Party_${req.params.partyId}`,{error:err.message,status: 'Error'});
      return res.status(500).json({ error: err.message||"Failed to reject party registration" });
    }
  }
}

export default new Parties();
