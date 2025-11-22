import jwt from "jsonwebtoken";
import userM from "../models/userM.js";
import auditLogsM from "../models/auditLogsM.js";
import pool from "../config/db.js";
import dotenv from "dotenv";
import { redisClient } from "../server.js";
import partyM from "../models/partyM.js";
import candConstM from "../models/candConstM.js";
import ConstituencyM from "../models/ConstituencyM.js";
dotenv.config(); // loads variables from .env into process.env

const SECRET_KEY = process.env.SECRET_KEY;
class adminC {
  async adminSignin(req, res) {
    const { email, password } = req.body;
    try {
      const result = await userM.signinUser(email, password);
      await userM.generateAndSendOtp(result.id, result.email);
      return res.json({
        message: "Credentials verified. OTP sent to email.",
        userId: result.id, // Frontend needs this ID to confirm the OTP
        mfaRequired: true,
      });
    } catch (err) {
      console.error(err);
      await auditLogsM.logAction(req, "FAILED_ADMIN_SIGNIN", "SYSTEM", {
        error: err.message || "Failed to sign in as admin",
        email: req.body.email,
        status: "Error",
      });
      return res
        .status(500)
        .json({ error: err.message || "Failed to sign in as admin" });
    }
  }
  adminVerifyMFA = async (req, res) => {
    try {
      const { userId, otp } = req.body;

      // 1. Verify OTP against Redis Cache
      await userM.verifyOtp(userId, otp);

      // 2. Fetch User details again (needed to ensure latest role/data is in JWT)
      const user = (
        await pool.query(`SELECT id, name, email,areaid FROM users WHERE id=$1`, [
          userId,
        ])
      ).rows[0];

      // 3. Issue Token
      const UserData = { id: user.id, name: user.name, email: user.email, areaid: user.areaid };
      const token = jwt.sign(UserData, SECRET_KEY, { expiresIn: "24h" });
      return res.json({ message: "Login successful", token, UserData });
    } catch (err) {
      // Note: Errors here are typically 'Invalid OTP' or 'OTP expired'
      await auditLogsM.logAction(req, "MFA_FAILED", `User_${req.body.userId}`, {
        error: err.message,
      });
      return res.status(401).json({ error: err.message });
    }
  };

  async FetchAuditLogs(req, res) {
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const logs = await auditLogsM.getAuditLogs(page,limit, offset);
        return res.json(logs);
    }catch(err){
        console.error(err);
        await auditLogsM.logAction(req,'FETCH_AUDIT_LOGS_FAILED','ADMIN_'+req.user.id,{ error:err.message||'Failed to fetch audit logs' ,status: 'Error'});
        res.status(500).json({ error: err.message||'Failed to fetch audit logs' });
      }
    }
    async getDashboardStats(req, res){
    try {
      // Run parallel queries for speed
      const [users, elections, votes] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']),
        pool.query('SELECT COUNT(*) FROM elections WHERE status = $1', ['Active']),
        pool.query('SELECT Count(*) from party'),
        pool.query('SELECT Count(*) from candidate'),
        pool.query('SELECT Count(*) from constituency'),
        pool.query('SELECT Count(*) from area'),
        pool.query('SELECT Count(*) from province'),
        pool.query('SELECT Count(*) from city')
      ]);
      const result={
        totalVoters: parseInt(users.rows[0].count),
        activeElections: parseInt(elections.rows[0].count),
        totalParties: parseInt(votes.rows[0].count),   
        totalCandidates: parseInt(votes.rows[0].count),
        totalConstituencies: parseInt(votes.rows[0].count),
        totalAreas: parseInt(votes.rows[0].count),
        totalProvinces: parseInt(votes.rows[0].count),
        totalCities: parseInt(votes.rows[0].count),
      }
      redisClient.SETEX('dashboard_stats', 300, JSON.stringify(result));
      return res.json(result);
    } catch (err) {
        await auditLogsM.logAction(req,'FAILED_LOAD_DASHBOARD_STATS','ADMIN_'+req.user.id,{ error:err.message||'Failed to load stats' ,status: 'Error'});
     return res.status(500).json({ error: err.message||'Failed to load stats' });
    }
  }
async healthCheck(req, res) {
try{
    // Check DB Connection
    await pool.query('SELECT 1');
    // Check Redis Connection
    await redisClient.ping();
    return res.json({ status: "OK", message: "System is healthy" });
}catch(err){
    console.error(err);
    await auditLogsM.logAction(req,'HEALTH_CHECK_FAILED','SYSTEM',{ error:err.message||'Health check failed' ,status: 'Error'});
    return res.status(500).json({ status: "Error", message: "Health check failed" });
}
}
async publishElectionResults(req, res) {
        try {
          const { electionId } = req.params;
          await db.query(`UPDATE elections SET is_published = TRUE WHERE id = $1`, [electionId]);
          await auditLogsM.logAction(req, 'PUBLISH_RESULTS', electionId, { status: 'Public' });
          res.json({ message: "Election results are now public." });
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      }
    
      fetchPartiesWithCandidates = async (req, res) => {
        try {
          const page = req.query.page || 1;
          const limit = req.query.limit || 10;
          const result = await partyM.getAllPartiesWithCandidates(page, limit);
          return res.json(result);
      
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      }
      fetchAtiveProvisionalConstituencies = async (req, res) => {
        try {
          const result = await ConstituencyM.getAtiveProvisionalConstituencies();
          return res.json(result);
        } catch (err) {
            await auditLogsM.logAction(req,'FAILED_FETCH_PROVINCIAL_CONSTITUENCIES' ,'SYSTEM',{ error:err.message||'Failed to fetch provincial constituencies' ,email:req.user.email,status: 'Error'});
          res.status(500).json({ error: err.message });
        }
      }
      fetchActiveNationalConstituencies = async (req, res) => {
        try {
          const result = await ConstituencyM.getActiveNationalConstituencies();
          return res.json(result);
        } catch (err) {
            await auditLogsM.logAction(req,'FAILED_FETCH_NATIONAL_CONSTITUENCIES' ,'SYSTEM',{ error:err.message||'Failed to fetch national constituencies' ,email:req.user.email,status: 'Error'});
          res.status(500).json({ error: err.message });
        }
      }
}
export default new adminC();