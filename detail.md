# Backend Workshop - RESTful API Documentation

## Overview
This document provides detailed technical documentation for the RESTful API built with Node.js, Express, TypeScript, JWT authentication, and SQLite database.

## System Architecture

### Technology Stack
- **Backend Framework**: Node.js + Express.js + TypeScript
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Database**: SQLite with sql.js library
- **Documentation**: Swagger/OpenAPI 3.0
- **Development**: nodemon, dotenv, CORS middleware

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        string id PK "Primary Key (timestamp-based)"
        string email UK "Unique email address"
        string password "Bcrypt hashed password"
        string firstName "User's first name (nullable)"
        string lastName "User's last name (nullable)"
        string phone "Phone number (nullable)"
        string membershipLevel "Bronze, Silver, Gold, Platinum"
        integer points "Loyalty points (default: 0)"
        datetime created_at "Record creation timestamp"
    }
    
    JWT_TOKENS {
        string userId FK "References USERS.id"
        string token "JWT token string"
        datetime issued_at "Token issue time"
        datetime expires_at "Token expiration time"
    }
    
    USERS ||--o{ JWT_TOKENS : "has"
```

### Database Specifications
- **Primary Key**: Timestamp-based string ID for better scalability
- **Email Uniqueness**: Enforced at database level
- **Password Security**: bcrypt with 10 salt rounds
- **Membership Levels**: Enum validation (Bronze, Silver, Gold, Platinum)
- **Default Values**: membershipLevel='Bronze', points=0

## API Flows

### Authentication Flow - Register & Login

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant JWT as JWT Utils
    participant DB as SQLite Database
    participant HASH as bcrypt

    Note over C,DB: User Registration Flow
    C->>+API: POST /auth/register
    Note right of C: { email, password }
    
    API->>+DB: findUserByEmail(email)
    DB-->>-API: null (user not exists)
    
    API->>+HASH: hashPassword(password, 10)
    HASH-->>-API: hashedPassword
    
    API->>+DB: createUser(email, hashedPassword)
    DB-->>-API: newUser
    
    API->>+JWT: generateToken(userId)
    JWT-->>-API: jwtToken
    
    API-->>-C: { token, user: { id, email, membershipLevel, points } }

    Note over C,DB: User Login Flow
    C->>+API: POST /auth/login
    Note right of C: { email, password }
    
    API->>+DB: findUserByEmail(email)
    DB-->>-API: existingUser
    
    API->>+HASH: comparePassword(password, user.password)
    HASH-->>-API: isValid
    
    alt Password Valid
        API->>+JWT: generateToken(userId)
        JWT-->>-API: jwtToken
        API-->>C: { token, user: { id, email, membershipLevel, points } }
    else Password Invalid
        API-->>-C: 401 Unauthorized
    end
```

### Profile Management Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant AUTH as Auth Middleware
    participant JWT as JWT Utils
    participant DB as SQLite Database

    Note over C,DB: Get Profile Flow
    C->>+API: GET /auth/profile
    Note right of C: Authorization: Bearer <token>
    
    API->>+AUTH: authenticateToken(request)
    AUTH->>+JWT: verifyToken(token)
    JWT-->>-AUTH: decoded { userId }
    AUTH->>+DB: findUserById(userId)
    DB-->>-AUTH: user
    AUTH-->>-API: req.user = user
    
    API->>+DB: findUserById(req.user.id)
    DB-->>-API: userProfile
    
    API-->>-C: { email, firstName, lastName, phone, membershipLevel, points }

    Note over C,DB: Update Profile Flow
    C->>+API: PUT /auth/profile
    Note right of C: { firstName, lastName, phone, membershipLevel, points }
    
    API->>+AUTH: authenticateToken(request)
    AUTH->>JWT: verifyToken(token)
    AUTH->>DB: findUserById(userId)
    AUTH-->>-API: req.user = user

    API->>API: validateInput(body)
    Note right of API: Validate membershipLevel enum<br/>Validate points >= 0

    alt Validation Passed
        API->>+DB: updateUserProfile(userId, updates)
        DB-->>-API: updatedUser
        API-->>C: { email, firstName, lastName, phone, membershipLevel, points }
    else Validation Failed
        API-->>-C: 400 Bad Request
    end
```

### Error Handling Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant AUTH as Auth Middleware
    participant DB as SQLite Database

    Note over C,DB: Authentication Error Flow
    C->>+API: GET/PUT /auth/profile
    Note right of C: Invalid/Missing Token
    
    API->>+AUTH: authenticateToken(request)
    
    alt No Token
        AUTH-->>API: 401 "Access token required"
    else Invalid Token
        AUTH->>AUTH: jwt.verify() throws error
        AUTH-->>API: 403 "Invalid token"
    else User Not Found
        AUTH->>DB: findUserById(userId)
        DB-->>AUTH: undefined
        AUTH-->>API: 403 "User not found"
    end
    
    API-->>-C: Error Response with appropriate status code

    Note over C,DB: Database Error Flow
    C->>+API: Any database operation
    API->>+DB: database operation
    DB-->>-API: throws error
    API->>API: catch(error)
    API-->>-C: 500 "Internal Server Error"
```

## Security Features

### Password Security
- **Hashing Algorithm**: bcrypt with 10 salt rounds
- **Storage**: Only hashed passwords stored, never plaintext
- **Validation**: Secure comparison using bcrypt.compare()

### JWT Token Security
- **Secret Key**: Environment variable (JWT_SECRET)
- **Expiration**: Configurable token lifetime
- **Validation**: Signature verification on every protected request
- **Payload**: Minimal data (userId only)

### Input Validation
- **Email Format**: RFC compliant email validation
- **Membership Levels**: Enum validation (Bronze, Silver, Gold, Platinum)
- **Points**: Non-negative integer validation
- **SQL Injection**: Prepared statements with parameterized queries

## API Endpoints Summary

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication

### Profile Management Endpoints
- `GET /auth/profile` - Retrieve user profile (Protected)
- `PUT /auth/profile` - Update user profile (Protected)

### System Endpoints
- `GET /` - Health check endpoint
- `GET /api-docs` - Swagger documentation

## Database Operations

### User Management
```sql
-- Create user
INSERT INTO users (id, email, password, firstName, lastName, phone, membershipLevel, points, created_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

-- Find user by email
SELECT id, email, password, firstName, lastName, phone, membershipLevel, points, created_at 
FROM users WHERE email = ?

-- Find user by ID  
SELECT id, email, password, firstName, lastName, phone, membershipLevel, points, created_at 
FROM users WHERE id = ?

-- Update user profile
UPDATE users SET firstName = ?, lastName = ?, phone = ?, membershipLevel = ?, points = ? 
WHERE id = ?
```

### Schema Migration
The system includes automatic schema migration functionality that:
1. Detects missing columns on startup
2. Backs up existing user data
3. Recreates table with new schema
4. Restores user data with default values for new columns

## Error Codes and Messages

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Invalid input data or validation failure |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but user not found |
| 404 | Not Found | Requested resource not found |
| 409 | Conflict | Email already exists during registration |
| 500 | Internal Server Error | Database or server error |

## Sample API Usage

### Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword123"}'
```

### Get Profile
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Profile
```bash
curl -X PUT http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "สมชาย",
    "lastName": "ใจดี", 
    "phone": "081-234-5678",
    "membershipLevel": "Gold",
    "points": 15420
  }'
```

## Development & Testing

### Environment Setup
1. Install dependencies: `npm install`
2. Create `.env` file with `JWT_SECRET` and `PORT`
3. Build project: `npm run build`
4. Start development server: `npm run dev`

### Testing
- Authentication tests: `node test-auth-detailed.js`
- Profile management tests: `node test-profile.js`
- Interactive API testing: Visit `http://localhost:3000/api-docs`

## Production Considerations

### Security Enhancements
- Rate limiting for authentication endpoints
- HTTPS enforcement
- Environment-specific CORS configuration
- JWT token refresh mechanism
- Password complexity requirements

### Performance Optimizations
- Database connection pooling
- Response caching for read operations
- Database indexing on frequently queried fields
- Request/response compression

### Monitoring & Logging
- Structured logging with appropriate log levels
- Authentication attempt monitoring
- Performance metrics collection
- Error tracking and alerting

---

*Generated on September 18, 2025 - RESTful API Workshop Documentation*