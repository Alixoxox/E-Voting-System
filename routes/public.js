import express from 'express';
import ElectionC from '../controllers/ElectionC.js';
import CandidateC from '../controllers/candidateC.js';
import cityC from '../controllers/cityC.js';
import AreasC from '../controllers/areaC.js';
import ProvinceC from '../controllers/ProvinceC.js';
import ConstituencyC from '../controllers/ConstituencyC.js';
import Parties from '../controllers/partyC.js';
import userC from '../controllers/userC.js';
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Publically Accessible endpoints
 */
/**
 * @swagger
 * /api/public/parties:
 *   get:
 *     summary: Get all political parties
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of all political parties
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   party_id:
 *                     type: integer
 *                   party_name:
 *                     type: string
 *                   party_symbol:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/parties', Parties.getParties);

/**
 * @swagger
 * /api/public/areas:
 *   get:
 *     summary: Get all areas
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of all areas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   city:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/areas', AreasC.getAreas);

/**
 * @swagger
 * /api/public/cities:
 *   get:
 *     summary: Get all cities
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of all cities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   city_id:
 *                     type: integer
 *                   city_name:
 *                     type: string
 *                   province_id:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get('/cities', cityC.getCities);

/**
 * @swagger
 * /api/public/password/forgot:
 *   post:
 *     summary: Request Password Reset (Sends OTP) (Step 1 password reset) [For both User And Admin]
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, cnic]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               cnic:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       404:
 *         description: User not found
 */
router.post('/password/forgot', userC.forgotPasswordRequest);
/**
 * @swagger
 * /api/public/password/reset:
 *   post:
 *     summary: Reset Password Using OTP (Step 2 password reset) [For both User And Admin]
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, otp, newPassword]
 *             properties:
 *               userId:
 *                 type: integer
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid OTP
 */
router.post('/password/reset', userC.resetPasswordWithOtp);

/**
 * @swagger
 * /api/public/elections:
 *   get:
 *     summary: Get all elections held
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of all Elections Held
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
router.get('/elections', ElectionC.getElections);
/**
 * @swagger
 * /api/public/candidates:
 *   get:
 *     summary: Get all registered candidates
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of all candidates
 *       500:
 *         description: Server error
 */

router.get('/candidates', CandidateC.getCandidates);
/**
 * @swagger
 * /api/public/province:
 *   get:
 *     summary: Get all provinces
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of all provinces
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/province', ProvinceC.getProvinces);


/**
 * @swagger
 * /api/public/constituencies:
 *   get:
 *     summary: Get all constituencies
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of all constituencies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
router.get('/constituencies', ConstituencyC.getConstituencies);
/**
 * @swagger
 * /api/public/area/constituency/{constituencyid}:
 *   get:
 *     summary: Get areas by Constituency ID
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: constituencyid
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the constituency to fetch its areas
 *     responses:
 *       200:
 *         description: Areas retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Missing or invalid constituency ID
 *       500:
 *         description: Server error while fetching areas
 */

router.get('/area/constituency/:constituencyid', ConstituencyC.getAreaByConstituency);

/**
 * @swagger
 * /api/public/active/Elections:
 *   get:
 *     summary: Get Active Elections being Held
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Currently Active Elections Data returned
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Failed to fetch Elections Data
 */
router.get('/active/Elections', ElectionC.getActiveElections);

/**
 * @swagger
 * /api/public/resend/otp:
 *   post:
 *     summary: Resend Verification/MFA OTP
 *     description: Sends a new OTP to the user's email with cooldown and rate limit protection [For both user and admin].
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, email]
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 55
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP resent successfully.
 *       429:
 *         description: Too many requests – cooldown/rate limit triggered.
 *       500:
 *         description: Failed to send email.
 */
router.post('/resend/otp', userC.resendOtp);
export default router;