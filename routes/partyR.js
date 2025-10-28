import express from 'express';
import Parties from '../controllers/partyC.js';
import CandidateC from '../controllers/candidateC.js';
import candidateConstituencyC from '../controllers/candConstC.js';

import multer from 'multer';
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
 * /api/parties/candidates/fighting/elections:
 *   get:
 *     summary: Get all candidates with their fighting constituencies for a specific party and election
 *     tags: [Parties]
 *     parameters:
 *       - in: query
 *         name: partyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Party ID to filter candidates
 *       - in: query
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

router.get('/candidates/fighting/elections', candidateConstituencyC.getCandConstByPartyAndElection);
/**
 * @swagger
 * /api/parties/candidates:
 *   get:
 *     summary: Get all registered candidates wrt their parties
 *     tags: [Parties]
 *     parameters:
 *       - in: query
 *         name: partyId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter candidates by their parties
 *     responses:
 *       200:
 *         description: List of all candidates
 *       500:
 *         description: Server error
 */

router.get('/candidates', CandidateC.getCandidates);
/**
 * @swagger
 * /api/parties/create/candidate:
 *   post:
 *     summary: Create a new candidate
 *     tags: [Parties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
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
 *     responses:
 *       200:
 *         description: Candidate created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/create/candidate', CandidateC.CreateCandidate);
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
// todo : mass add candidates via csv

/**
 * @swagger
 * /api/parties/candidate/fighting/constituency:
 *   post:
 *     summary: Allocate Candidate Wrt Constituency Seat for Election
 *     tags: [Parties]
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
router.post('/candidate/fighting/constituency', candidateConstituencyC.BookConstituencSeatForElectionForCandidate);
export default router;