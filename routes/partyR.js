import express from 'express';
import Parties from '../controllers/partyC.js';
import CandidateC from '../controllers/candidateC.js';
import candidateConstituencyC from '../controllers/candConstC.js';

import multer from 'multer';
import { authenicator } from '../middleware/authenicator.js';
const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // temporary storage

/**
 * @swagger
 * tags:
 *   name: Parties
 *   description: Political party management endpoints
 */
/**
 * @swagger
 * /api/parties/candidates/fighting/elections/{electionId}:
 *   get:
 *     summary: Get all candidates with their fighting constituencies for a specific party and election
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: electionId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Election ID to filter candidates
 *     responses:
 *       200:
 *         description: List of candidates with their constituencies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   candidateId:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   partyName:
 *                     type: string
 *                   constituency:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/candidates/fighting/elections/:electionId', authenicator , candidateConstituencyC.getCandConstByPartyAndElection);
/**
 * @swagger
 * /api/parties/candidates:
 *   get:
 *     summary: Get all registered candidates for a specific party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of candidates for the specified party
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   candidateId:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   constituency:
 *                     type: string
 *       400:
 *         description: Invalid party ID
 *       500:
 *         description: Server error
 */
router.get('/candidates', authenicator,CandidateC.getCandidatesByPartyId);
/**
 * @swagger
 * /api/parties/create/candidate:
 *   post:
 *     summary: Create a new candidate
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               UserData:
 *                 type: object
 *                 properties:
 *                   name: { type: string }
 *                   email: { type: string }
 *                   cnic: { type: string }
 *                   password: { type: string }
 *                   province: { type: string }
 *                   city: { type: string }
 *                   area: { type: string }
 *               Candidate:
 *                 type: object
 *                 properties:
 *                   partyId: { type: integer }
 *                   manifesto: { type: string }
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Candidate created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/create/candidate',upload.single('image'),authenicator, CandidateC.CreateCandidate);
/**
 * @swagger
 * /api/parties/kick/candidate/{candidateId}:
 *   delete:
 *     summary: Remove a candidate from a specific party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the candidate to remove
 *     responses:
 *       200:
 *         description: Candidate removed successfully
 *       400:
 *         description: Invalid party or candidate ID
 *       500:
 *         description: Server error
 */

router.delete('/kick/candidate/:candidateId',authenicator ,CandidateC.kickCandidate);
/**
 * @swagger
 * /api/parties/account/register:
 *   post:
 *     summary: Create a new party account with image
 *     tags: [Parties]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - abbreviation
 *               - email
 *               - password
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *               abbreviation:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Party account created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */

router.post('/account/register',upload.single('image'), Parties.createParty);
/**
 * @swagger
 * /api/parties/account/signin:
 *   post:
 *     summary: Log Party account
 *     tags: [Parties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Party account Logged in
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/account/signin', Parties.LoginParty);

/**
 * @swagger
 * /api/parties/candidate/fighting/constituency:
 *   post:
 *     summary: Allocate Candidate Wrt Constituency Seat for Election
 *     tags: [Parties]
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateId
 *               - electionId
 *               - constituencyId
 *             properties:
 *               candidateId:
 *                 type: integer
 *               electionId:
 *                 type: integer
 *               constituencyId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Party account Logged in
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/candidate/fighting/constituency',authenicator ,candidateConstituencyC.BookConstituencSeatForElectionForCandidate);
/**
 * @swagger
 * /api/parties/candidates/{candidateId}/won/seats:
 *   get:
 *     summary: Get all won seats for a specific candidate
 *     tags: [Parties]
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the candidate
 *     responses:
 *       200:
 *         description: List of won seats
 *       500:
 *         description: Server error
 */
router.get('/candidates/:candidateId/won/seats',authenicator ,candidateConstituencyC.GetwonSeats);
/**
 * @swagger
 * /api/parties/candidate/choose/seat:
 *   post:
 *     summary: Choose a seat for a candidate in a specific election and constituency
 *     tags: [Parties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               electionId:
 *                 type: integer
 *                 example: 3
 *               constituencyId:
 *                 type: integer
 *                 example: 12
 *               candidateId:
 *                 type: integer
 *                 example: 45
 *     responses:
 *       200:
 *         description: Seat chosen successfully
 *       500:
 *         description: Failed to choose seat
 */

router.post('/candidate/choose/seat',authenicator ,candidateConstituencyC.ChooseSeat);

export default router;