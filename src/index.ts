import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import { setupSwagger } from './swagger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Swagger documentation
setupSwagger(app);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome endpoint
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: hello world
 */
// GET / endpoint returning JSON
app.get('/', (req: Request, res: Response) => {
  res.json({ message: "hello world" });
});

// Authentication routes
app.use('/auth', authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});