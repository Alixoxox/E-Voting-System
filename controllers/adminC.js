import jwt from "jsonwebtoken";
import userM from "../models/userM.js";
import auditLogsM from "../models/auditLogsM.js";
import pool from "../config/db.js";
import dotenv from "dotenv";
import { redisClient } from "../server.js";
import partyM from "../models/partyM.js";
import ConstituencyM from "../models/ConstituencyM.js";
import { admin } from "../models/initializer.js";
// Import the services logic
import { runAutoSeatChooser, runDailyElectionCheck } from "../utils/Services.js";

dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;

class adminC {
  async adminSignin(req, res) {
    const { email, password } = req.body;
    try {
      const result = await userM.signinUser(email, password, "admin");
      await userM.generateAndSendOtp(result.id, result.email);
      return res.json({
        message: "Credentials verified. OTP sent to email.",
        userId: result.id,
        mfaRequired: true,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  adminVerifyMFA = async (req, res) => {
    try {
      const { userId, otp } = req.body;
      await userM.verifyOtp(userId, otp);
      const user = (await pool.query(`SELECT id, name, email,areaid FROM users WHERE id=$1`, [userId])).rows[0];
      const UserData = { id: user.id, name: user.name, email: user.email, areaid: user.areaid };
      const token = jwt.sign(UserData, SECRET_KEY, { expiresIn: "24h" });
      return res.json({ message: "Login successful", token, UserData });
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }
  };

  async FetchAuditLogs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const logs = await auditLogsM.getAuditLogs(page, limit, offset);
      return res.json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const [users, elections, parties, candidates, constituencies, areas, provinces, cities] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']),
        pool.query('SELECT COUNT(*) FROM elections WHERE status = $1', ['Active']),
        pool.query('SELECT COUNT(*) FROM party'),
        pool.query('SELECT COUNT(*) FROM candidate'),
        pool.query('SELECT COUNT(*) FROM constituency'),
        pool.query('SELECT COUNT(*) FROM area'),
        pool.query('SELECT COUNT(*) FROM province'),
        pool.query('SELECT COUNT(*) FROM city')
      ]);

      const result = {
        totalVoters: parseInt(users.rows[0].count),
        activeElections: parseInt(elections.rows[0].count),
        totalParties: parseInt(parties.rows[0].count),
        totalCandidates: parseInt(candidates.rows[0].count),
        totalConstituencies: parseInt(constituencies.rows[0].count),
        totalAreas: parseInt(areas.rows[0].count),
        totalProvinces: parseInt(provinces.rows[0].count),
        totalCities: parseInt(cities.rows[0].count),
      };
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async healthCheck(req, res) {
    try {
      await pool.query('SELECT 1');
      await redisClient.ping();
      return res.json({ status: "OK", message: "System is healthy" });
    } catch (err) {
      return res.status(500).json({ status: "Error", message: "Health check failed" });
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
      res.status(500).json({ error: err.message });
    }
  }

  fetchActiveNationalConstituencies = async (req, res) => {
    try {
      const result = await ConstituencyM.getActiveNationalConstituencies();
      return res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getRecentActivity(req, res) {
    try {
      const adminNames = admin.map(a => a.name);
      const { rows } = await pool.query(`
        SELECT actor_name, action, details, timestamp
        FROM audit_logs
        WHERE actor_name = ANY($1::text[]) OR actor_name = 'SYSTEM'
        ORDER BY timestamp DESC
        LIMIT 20
      `, [adminNames]);

      const activities = rows.map(row => {
        const d = row.details ? JSON.parse(row.details) : {};
        let message = "";
        switch (row.action) {
          case "CREATE_ELECTION": message = `New election created: ${d.name || "Unknown"}`; break;
          case "PROVINCES_CSV_UPLOAD":
          case "PARTY_CSV_UPLOAD": message = `${row.actor_name} uploaded CSV: ${d.rowsAdded || 0} rows`; break;
          case "PARTY_REGISTERED": message = `${d.partyName} registered (${d.status})`; break;
          case "ELECTION_RESULTS_DECLARED": message = `Results declared for Election ${row.details?.id || ""}`; break;
          default: message = row.action;
        }
        return { actor: row.actor_name, message, timestamp: row.timestamp };
      });
      res.json(activities);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Trigger Election End
  async EndEllections(req, res) {
    const electionId = req.params.id;
    try {
      // Force update to meet NOW() criteria
      await pool.query(`UPDATE elections SET end_date = NOW() WHERE id = $1`, [electionId]);
      
      // Calculate winners
      await runDailyElectionCheck();
      
      // Drop extra seats if candidate won multiple
      await runAutoSeatChooser();

      res.json({ message: `Election ${electionId} ended and processed successfully.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
}

export default new adminC();