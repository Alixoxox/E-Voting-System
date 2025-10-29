import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
// Routes
import userRoutes from './routes/userR.js';
import AdminRoutes from './routes/adminR.js';
import partyRoutes from './routes/partyR.js';
import publicRoutes from './routes/public.js';
// DB initializer
import { initTables } from './models/initializer.js';

dotenv.config();

const app = express();
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
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
  });
})();