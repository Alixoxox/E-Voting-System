import express from 'express';
import UserC from '../controllers/userC.js';
const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users/account/create:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - cnic
 *               - password
 *               - province
 *               - city
 *               - area
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ali Ahmed
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ali@gmail.com
 *               cnic:
 *                 type: string
 *                 example: 42101-1234567-8
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secure123
 *               province:
 *                 type: string
 *                 example: Sindh
 *               city:
 *                 type: string
 *                 example: Karachi
 *               area:
 *                 type: string
 *                 example: Gulistan-e-Jauhar
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 UserData:
 *                   type: object
 *                   description: Created user data
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */

router.post("/account/create",UserC.createUser);/**
* @swagger
* /api/users/account/signin:
*   post:
*     summary: Sign in an existing user
*     tags: [User]
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
*                 format: email
*                 example: ali@gmail.com
*               password:
*                 type: string
*                 format: password
*                 example: secure123
*     responses:
*       200:
*         description: User signed in successfully
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: User signed in successfully
*                 UserData:
*                   type: object
*                   description: Authenticated user data
*       401:
*         description: Invalid credentials
*       500:
*         description: Server error
*/

router.post('/account/signin',UserC.signinUser);
/**
 * @swagger
 * /api/users/view/Candidates:
 *   post:
 *     summary: Get candidates for a user's election area and current election
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - areaId
 *               - electionId
 *             properties:
 *               areaId:
 *                 type: integer
 *                 example: 1
 *               electionId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: List of candidates
 *       500:
 *         description: Failed to fetch candidates
 */

router.post('/view/Candidates',UserC.viewCandidatesForUserElection);

/**
 * @swagger
 * /api/users/voting/history/{userId}:
 *   get:
 *     summary: Get voting history for a user
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose voting history is to be fetched
 *     responses:
 *       200:
 *         description: Voting history returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Missing or invalid user ID
 *       500:
 *         description: Failed to fetch voting history
 */

router.get('/voting/history/:userId',UserC.votingHistory);
/**
 * @swagger
 * /api/users/cast/vote:
 *   post:
 *     summary: Cast a vote for a candidate
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateParticipatingId
 *               - userId
 *               - electionId
 *             properties:
 *               candidateParticipatingId:
 *                 type: integer
 *                 example: 5
 *               userId:
 *                 type: integer
 *                 example: 10
 *               electionId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Vote cast successfully
 *       500:
 *         description: Failed to cast vote
 */

router.post('/cast/vote',UserC.castVote);


// candidate leaderboard Result according to the constituency the user belongs to

export default router;
