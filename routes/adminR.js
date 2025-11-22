import express from 'express';
import ElectionC from '../controllers/ElectionC.js';
import cityC from '../controllers/cityC.js';
import AreasC from '../controllers/areaC.js';
import multer from 'multer';
import ProvinceC from '../controllers/ProvinceC.js';
import ConstituencyC from '../controllers/ConstituencyC.js';
import Parties from '../controllers/partyC.js';
import userC from '../controllers/userC.js';
import { authenicator } from '../middleware/authenicator.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // temporary storage

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */
/**
 * @swagger
 * /api/admin/fetch/users:
 *   get:
 *     summary: Get all Registered Users
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all political parties
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                
 *       500:
 *         description: Server error
 */
router.get('/fetch/users',authenicator, userC.fetchUsers);

/**
 * @swagger
 * /api/admin/area/upload-csv:
 *   post:
 *     summary: Upload areas via CSV file
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing area data (name , city)
 *     responses:
 *       200:
 *         description: Areas uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 inserted:
 *                   type: integer
 *       400:
 *         description: Bad request - Invalid file or format
 *       500:
 *         description: Server error
 */
router.post('/area/upload-csv',authenicator, upload.single('file'), AreasC.AddAreasCsv);


/**
 * @swagger
 * /api/admin/cities/upload-csv:
 *   post:
 *     summary: Upload cities via CSV file
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing city data (name, province)
 *     responses:
 *       200:
 *         description: Cities uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 inserted:
 *                   type: integer
 *       400:
 *         description: Bad request - Invalid file or format
 *       500:
 *         description: Server error
 */
router.post('/cities/upload-csv',authenicator, upload.single('file'), cityC.AddCitycsv);

/**
* @swagger
* /api/admin/elections/addSession:
*   post:
*     summary: Add a new election session
*     tags: [Admin]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - name
*               - startDate
*               - endDate
*               - seatType
*               - Province
*             properties:
*               name:
*                 type: string
*                 description: Name of the election session
*                 example: "General Elections 2025"
*               startDate:
*                 type: string
*                 format: date
*                 description: Start date of the election session
*                 example: "2025-11-01"
*               endDate:
*                 type: string
*                 format: date
*                 description: End date of the election session
*                 example: "2025-11-15"
*               seatType:
*                 type: string
*                 enum: [National, Provincial]
*                 description: Type of seat for this session
*                 example: "National"
*               Province:
*                 type: string
*                 description: Province for which the election session applies
*                 example: "Sindh"
*     responses:
*       200:
*         description: Election session added successfully
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Election session added successfully"
*                 sessionId:
*                   type: integer
*                   example: 101
*       400:
*         description: Bad request - Missing or invalid fields
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Missing required field: seatType"
*       500:
*         description: Server error
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Failed to add election session"
*/

router.post("/elections/addSession",authenicator,ElectionC.CreateEllection);

/**
 * @swagger
 * /api/admin/province/upload-csv:
 *   post:
 *     summary: Upload provinces via CSV file
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing province data (name)
 *     responses:
 *       200:
 *         description: Provinces uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Invalid file or format
 *       500:
 *         description: Server error
 */
router.post('/province/upload-csv',authenicator, upload.single('file'), ProvinceC.AddProvincesCsv);

/**
 * @swagger
 * /api/admin/constituencies/upload-csv:
 *   post:
 *     summary: Upload constituencies via CSV file
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing constituencies data (code , name, seatType, areas)
 *     responses:
 *       200:
 *         description: Constituencies uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 inserted:
 *                   type: integer
 *       400:
 *         description: Bad request - Invalid file or format
 *       500:
 *         description: Server error
 */
router.post('/constituencies/upload-csv',authenicator,upload.single('file'), ConstituencyC.addConstituency);
/**
 * @swagger
 * /api/admin/party/upload-csv:
 *   post:
 *     summary: Upload political parties via CSV file
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing political party data (name, abbreviation, logo, email, password)
 *     responses:
 *       200:
 *         description: Parties uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 inserted:
 *                   type: integer
 *       400:
 *         description: Bad request - Invalid file or CSV format
 *       500:
 *         description: Server error
 */
router.post('/party/upload-csv',authenicator, upload.single('file'), Parties.AddPartiesCsv);
/**
 * @swagger
 * /api/admin/auth/signin:
 *   post:
 *     summary: Admin Login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, cnic]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@vote.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "admin123"
 *               cnic:
 *                 type: string
 *                 example: "00000-0000000-0"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 UserData:
 *                   type: object
 *       401:
 *         description: Invalid credentials or CNIC
 *       500:
 *         description: Server error
 */
router.post('/auth/signin', userC.adminSignin);


/**
 * @swagger
 * /api/admin/auth/verify-mfa:
 *   post:
 *     summary: Admin Login Step 2 — Verify OTP
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, otp]
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               otp:
 *                 type: string
 *                 example: "999888"
 *     responses:
 *       200:
 *         description: Login successful, token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 userData:
 *                   type: object
 *       401:
 *         description: Invalid OTP
 */
router.post('/auth/verify-mfa', userC.adminVerifyMFA);


/**
 * @swagger
 * /api/admin/EditProfile:
 *   post:
 *     summary: Edit Admin profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "newPassword123"
 *             description: At least one field must be provided
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: No fields provided for update
 *       500:
 *         description: Server error
 */
router.post('/EditProfile', authenicator, userC.EditProfile);


/**
 * @swagger
 * /api/admin/verify/integrity/{electionId}:
 *   get:
 *     summary: Verify Election Integrity (Blockchain Audit)
 *     description: Checks the cryptographic hash chain for a specific election to detect tampering.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the election to verify
 *         example: 5
 *     responses:
 *       200:
 *         description: Verification result (Secure or Compromised)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [Secure, Clean, Compromised]
 *                   example: "Secure"
 *                 message:
 *                   type: string
 *                   example: " Verification Passed. All hashes match."
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       brokenAtVoteID:
 *                         type: integer
 *                       expected:
 *                         type: string
 *                       found:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get('/verify/integrity/:electionId', authenicator, ElectionC.verifyElectionIntegrity);

export default router;
