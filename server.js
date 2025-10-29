import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
// Routes
import userRoutes from './routes/userR.js';
import AdminRoutes from './routes/adminR.js';
import partyRoutes from './routes/partyR.js';
import publicRoutes from './routes/public.js';
import userM from './models/userM.js';
// DB initializer
import { initTables } from './models/initializer.js';

dotenv.config();
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
export const io = new Server(server, { cors: { origin: "*" } });

// Pass `io` to routes if needed
app.set("io", io);

app.use(express.json());
app.use(express.text({ type: 'text/csv' }));

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VoteSphere API',
      version: '1.0.0',
      description: 'API Documentation for VoteSphere Voting System',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'], // Will scan your route files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

(async () => {
  // 1️⃣ Initialize DB tables
  await initTables();

  // 2️⃣ Swagger UI route (add BEFORE your API routes)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // 3️⃣ Register all API routes
  app.use('/api/public',publicRoutes );
  app.use('/api/users', userRoutes);
  app.use('/api/parties', partyRoutes);
  app.use('/api/admin',AdminRoutes);
  // 4️⃣ Start server
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);
  
    socket.on("joinRoom", async (room) => {
      socket.join(room);
      console.log(`✅ Joined room: ${room}`);
  
      // Extract areaId & electionId from room name: "const-<areaId>-<electionId>"
      const [_, areaId, electionId] = room.split("-");
  
      try {
        // Fetch current leaderboard even if no votes are cast yet
        const leaderboard = await userM.viewCandidatesForUserElection(areaId, electionId);
  
        // Emit directly to this user (not broadcast)
        socket.emit("leaderboardUpdate", { leaderboard });
        console.log(`📤 Sent initial leaderboard to ${socket.id}`);
      } catch (err) {
        console.error("❌ Error fetching leaderboard:", err.message);
      }
    });
  
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
  server.listen(5000, () => {
    console.log(`✅ Server running on port 5000`);
    console.log(`📚 Swagger docs: http://localhost:5000/api-docs`);
  });
  
})();