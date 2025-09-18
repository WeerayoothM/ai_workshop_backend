import express, { Request, Response } from 'express';

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// GET / endpoint returning JSON
app.get('/', (req: Request, res: Response) => {
  res.json({ message: "hello world" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});