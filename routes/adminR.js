import express from 'express';
import ElectionC from '../controllers/ElectionC.js';
import cityC from '../controllers/cityC.js';
import AreasC from '../controllers/areaC.js';
import multer from 'multer';
import ProvinceC from '../controllers/ProvinceC.js';
import ConstituencyC from '../controllers/ConstituencyC.js';
import partyC from '../controllers/partyC.js'; // standardized import
import userC from '../controllers/userC.js';
import { authenicator } from '../middleware/authenicator.js';
import adminC from '../controllers/adminC.js';
import CandidateC from '../controllers/candidateC.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

// Parties
/**
 * @swagger
 * /api/admin/parties:
 *   get:
 *     summary: Get all parties (Admin View)
 *     tags: [Admin]
 */
router.get('/parties', authenicator, partyC.getParties);

// Candidates
/**
 * @swagger
 * /api/admin/candidates:
 *   get:
 *     summary: Get all candidates (Admin View)
 *     tags: [Admin]
 */
router.get('/candidates', authenicator, CandidateC.getCandidates);

// Users
router.get('/fetch/users', authenicator, userC.fetchUsers);

// Areas CSV Upload
router.post('/area/upload-csv', authenicator, upload.single('file'), AreasC.AddAreasCsv);

// Cities CSV Upload
router.post('/cities/upload-csv', authenicator, upload.single('file'), cityC.AddCitycsv);

// Elections Session
router.post("/elections/addSession", authenicator, ElectionC.CreateEllection);

// Provinces CSV Upload
router.post('/province/upload-csv', authenicator, upload.single('file'), ProvinceC.AddProvincesCsv);

// Constituencies CSV Upload
router.post('/constituencies/upload-csv', authenicator, upload.single('file'), ConstituencyC.addConstituency);

// Parties CSV Upload
router.post('/party/upload-csv', authenicator, upload.single('file'), partyC.AddPartiesCsv);

// Admin Signin
router.post('/auth/signin', adminC.adminSignin);

// Admin Verify MFA
router.post('/auth/verify-mfa', adminC.adminVerifyMFA);

// Edit Profile
router.post('/EditProfile', authenicator, userC.EditProfile);

// Verify Election Integrity
router.get('/verify/integrity/:electionId', authenicator, ElectionC.verifyElectionIntegrity);

// Audit Logs
router.get('/view/auditLogs', authenicator, adminC.FetchAuditLogs);

// Parties with Candidates
router.get('/parties/candidates/aggregated', authenicator, adminC.fetchPartiesWithCandidates);

// Reject Party Registration
router.post('/reject/PartyRegistration/:partyId', authenicator, partyC.RejectPartyRegistration);

// End Election
router.post('/end-election/:id', authenicator, adminC.EndEllections);

// Recent Activity
router.get("/recent-activity", authenicator, adminC.getRecentActivity);

export default router;
