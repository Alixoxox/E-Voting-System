import jwt from "jsonwebtoken";
import userM from "../models/userM.js";
import auditLogsM from "../models/auditLogsM.js";
import pool from "../config/db.js";
import dotenv from "dotenv";
dotenv.config(); // loads variables from .env into process.env

const SECRET_KEY = process.env.SECRET_KEY;
class adminC {
  async adminSignin(req, res) {
    const { email, password } = req.body;
    try {
      const result = await userM.signinUser(email, password);

      // Return Success but NO TOKEN yet
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
        await pool.query(`SELECT id, name, email FROM users WHERE id=$1`, [
          userId,
        ])
      ).rows[0];

      // 3. Issue Token
      const UserData = { id: user.id, name: user.name, email: user.email };
      const token = jwt.sign(UserData, SECRET_KEY, { expiresIn: "24h" });
      return res.json({ message: "Login successful", token, UserData });
    } catch (err) {
      // Note: Errors here are typically 'Invalid OTP' or 'OTP expired'
      await logAction(req, "MFA_FAILED", `User_${req.body.userId}`, {
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
    }}

export default new adminC();