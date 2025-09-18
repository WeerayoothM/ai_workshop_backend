# GitHub Copilot Instructions for Backend Workshop

## Project Overview
This is a RESTful API built with Node.js, Express, and TypeScript that provides user authentication and profile management with SQLite database. The API includes JWT authentication, password hashing with bcrypt, and comprehensive Swagger documentation.

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with sql.js (browser-compatible)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Documentation**: Swagger/OpenAPI 3.0
- **Development**: nodemon, ts-node, TypeScript compiler

## Core Dependencies
```json
{
  "express": "^5.1.0",
  "typescript": "^5.9.2",
  "sql.js": "^1.13.0",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^6.0.0",
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.1",
  "cors": "^2.8.5",
  "dotenv": "^17.2.2"
}
```

## Project Structure
```
src/
├── index.ts              # Main server file with Express setup
├── database.ts           # SQLite database management with sql.js
├── routes/
│   └── auth.ts          # Authentication and profile routes
├── utils/
│   └── jwt.ts           # JWT utilities and authentication middleware
└── swagger.ts           # Swagger configuration
```

## Code Patterns & Best Practices

### 1. Express Server Setup
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Essential middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: "hello world" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### 2. Database Layer (sql.js Patterns)
```typescript
import initSqlJs, { Database as SqlDatabase } from 'sql.js';

export class Database {
  private db: SqlDatabase | null = null;
  private SQL: any;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    this.SQL = await initSqlJs();
    this.db = new this.SQL.Database();
    this.createTables();
  }

  // Always use prepared statements for security
  public async findUserByEmail(email: string): Promise<User | undefined> {
    const stmt = this.db!.prepare('SELECT * FROM users WHERE email = ?');
    const result = stmt.get([email]); // sql.js returns array, not object
    stmt.free();

    if (!result || result.length === 0) return undefined;

    // Handle null values properly
    return {
      id: String(result[0]),
      email: String(result[1]),
      firstName: result[2] !== null ? String(result[2]) : undefined,
      // ... other fields
    };
  }
}
```

### 3. JWT Authentication Pattern
```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  }
}

// Authentication middleware
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

### 4. Route Handler Patterns
```typescript
import express, { Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../utils/jwt';

const router = express.Router();

// Public routes
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Business logic
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await AuthService.hashPassword(password);
    const user = await db.createUser(email, hashedPassword);
    const token = AuthService.generateToken(user.id, user.email);

    // Return without sensitive data
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ token, user: userWithoutPassword });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await db.findUserById(req.user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 5. Input Validation Patterns
```typescript
// Membership level validation
const validMembershipLevels = ['Bronze', 'Silver', 'Gold', 'Platinum'];
if (membershipLevel && !validMembershipLevels.includes(membershipLevel)) {
  return res.status(400).json({
    error: 'Invalid membership level. Must be one of: Bronze, Silver, Gold, Platinum'
  });
}

// Phone number validation
if (phone && !/^[0-9\-+\s()]+$/.test(phone)) {
  return res.status(400).json({ error: 'Invalid phone number format' });
}

// Points validation
if (points !== undefined && (typeof points !== 'number' || points < 0)) {
  return res.status(400).json({ error: 'Points must be a non-negative number' });
}
```

### 6. Swagger Documentation Pattern
```typescript
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRequest'
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
```

## Database Schema
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  firstName TEXT,
  lastName TEXT,
  phone TEXT,
  membershipLevel TEXT DEFAULT 'Bronze',
  points INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Common Tasks

### Adding New API Endpoints
1. Create route handler in appropriate file (`src/routes/`)
2. Add Swagger documentation
3. Implement input validation
4. Add database operations if needed
5. Update main router in `index.ts`

### Adding Database Fields
1. Update `User` interface in `database.ts`
2. Modify `createTables()` method
3. Update `findUserByEmail/findUserById` methods
4. Add migration logic in `migrateSchema()`
5. Update route handlers to handle new fields

### Adding Authentication to New Routes
1. Import `authenticateToken` middleware
2. Use `AuthenticatedRequest` type for protected routes
3. Add `req.user` validation
4. Return appropriate error responses

## Error Handling Patterns
- Use try-catch blocks in all async operations
- Return appropriate HTTP status codes (400, 401, 403, 404, 500)
- Log errors for debugging
- Don't expose sensitive information in error messages
- Validate inputs before processing

## Security Best Practices
- Hash passwords with bcrypt (10+ salt rounds)
- Use JWT tokens with reasonable expiration
- Validate all inputs on both client and server
- Use prepared statements to prevent SQL injection
- Don't log sensitive data (passwords, tokens)
- Use environment variables for secrets

## Development Workflow
1. `npm run dev` - Start development server with hot reload
2. `npm run build` - Compile TypeScript to JavaScript
3. `npm start` - Run production server
4. Access Swagger docs at `http://localhost:3000/api-docs`

## Testing Patterns
- Test authentication endpoints with different scenarios
- Test profile management with various data combinations
- Verify input validation works correctly
- Test error handling for edge cases
- Use tools like Postman or curl for API testing

## File Naming Conventions
- Use kebab-case for directories: `src/utils/jwt.ts`
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_SNAKE_CASE for constants

## Code Style Guidelines
- Use async/await for asynchronous operations
- Use TypeScript interfaces for type safety
- Add JSDoc comments for complex functions
- Use meaningful variable names
- Keep functions small and focused
- Handle errors gracefully
- Use environment variables for configuration</content>
<parameter name="filePath">c:\workspace\training\ai-workshop\backend-workshop\.github\copilot-instructions.md
