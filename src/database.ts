import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlDatabase } from 'sql.js';

export interface User {
  id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  membershipLevel: string;
  points: number;
  createdAt: Date;
}

export class Database {
  private dbPath: string;
  private db: SqlDatabase | null = null;
  private SQL: any;
  private initPromise: Promise<void>;

  constructor() {
    this.dbPath = path.join(__dirname, '../data/database.sqlite');
    this.initPromise = this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    try {
      // Initialize sql.js
      this.SQL = await initSqlJs();
      
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
        
        // Check if we need to migrate the schema
        await this.migrateSchema();
      } else {
        this.db = new this.SQL.Database();
        this.createTables();
        this.saveDatabase();
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      // Fallback to in-memory database
      this.SQL = await initSqlJs();
      this.db = new this.SQL.Database();
      this.createTables();
    }
  }

  private async migrateSchema(): Promise<void> {
    if (!this.db) return;

    try {
      // Check if new columns exist
      const result = this.db.exec("PRAGMA table_info(users)");
      const columns = result[0]?.values.map((row: any[]) => row[1]) || [];
      
      console.log('Current columns:', columns);
      
      // If we don't have the new columns, recreate the table
      const requiredColumns = ['firstName', 'lastName', 'phone', 'membershipLevel', 'points'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('Missing columns detected, migrating database...');
        
        // Backup existing users
        const backupResult = this.db.exec("SELECT id, email, password, created_at FROM users");
        const existingUsers = backupResult[0]?.values || [];
        
        // Drop and recreate table
        this.db.run("DROP TABLE IF EXISTS users");
        this.createTables();
        
        // Restore users with default values for new columns
        if (existingUsers.length > 0) {
          const stmt = this.db.prepare(`
            INSERT INTO users (id, email, password, firstName, lastName, phone, membershipLevel, points, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          for (const user of existingUsers) {
            stmt.run([user[0], user[1], user[2], null, null, null, 'Bronze', 0, user[3]]);
          }
          stmt.free();
        }
        
        this.saveDatabase();
        console.log('Database migration completed successfully');
      }
    } catch (error) {
      console.error('Migration error:', error);
      // If migration fails, recreate the table
      console.log('Migration failed, recreating table...');
      this.db.run("DROP TABLE IF EXISTS users");
      this.createTables();
      this.saveDatabase();
    }
  }

  private createTables(): void {
    if (!this.db) return;
    
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        phone TEXT,
        membershipLevel TEXT DEFAULT 'Bronze',
        points INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.run(createUsersTable);
  }

  private saveDatabase(): void {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, data);
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  public async createUser(email: string, hashedPassword: string): Promise<User> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const userId = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (id, email, password, firstName, lastName, phone, membershipLevel, points, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([userId, email, hashedPassword, null, null, null, 'Bronze', 0, createdAt]);
      stmt.free();
      
      this.saveDatabase();
      
      return {
        id: userId,
        email,
        password: hashedPassword,
        firstName: undefined,
        lastName: undefined,
        phone: undefined,
        membershipLevel: 'Bronze',
        points: 0,
        createdAt: new Date(createdAt)
      };
    } catch (error) {
      console.error('Create user error:', error);
      throw new Error('Failed to create user');
    }
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    if (!this.db) return undefined;

    try {
      const stmt = this.db.prepare('SELECT id, email, password, firstName, lastName, phone, membershipLevel, points, created_at FROM users WHERE email = ?');
      const result = stmt.get([email]);
      stmt.free();

      if (!result || result.length === 0) return undefined;

      return {
        id: String(result[0]),
        email: String(result[1]),
        password: String(result[2]),
        firstName: result[3] !== null ? String(result[3]) : undefined,
        lastName: result[4] !== null ? String(result[4]) : undefined,
        phone: result[5] !== null ? String(result[5]) : undefined,
        membershipLevel: String(result[6] || 'Bronze'),
        points: Number(result[7] || 0),
        createdAt: new Date(String(result[8]))
      };
    } catch (error) {
      console.error('Find user by email error:', error);
      return undefined;
    }
  }

  public async findUserById(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    if (!this.db) return undefined;

    try {
      const stmt = this.db.prepare('SELECT id, email, password, firstName, lastName, phone, membershipLevel, points, created_at FROM users WHERE id = ?');
      const result = stmt.get([id]);
      stmt.free();

      if (!result || result.length === 0) return undefined;

      return {
        id: String(result[0]),
        email: String(result[1]), 
        password: String(result[2]),
        firstName: result[3] !== null ? String(result[3]) : undefined,
        lastName: result[4] !== null ? String(result[4]) : undefined,
        phone: result[5] !== null ? String(result[5]) : undefined,
        membershipLevel: String(result[6] || 'Bronze'),
        points: Number(result[7] || 0),
        createdAt: new Date(String(result[8]))
      };
    } catch (error) {
      console.error('Find user by ID error:', error);
      return undefined;
    }
  }

  public async updateUserProfile(
    userId: string, 
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      membershipLevel?: string;
      points?: number;
    }
  ): Promise<User | undefined> {
    await this.ensureInitialized();
    if (!this.db) return undefined;

    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (updates.firstName !== undefined) {
        updateFields.push('firstName = ?');
        values.push(updates.firstName);
      }
      if (updates.lastName !== undefined) {
        updateFields.push('lastName = ?');
        values.push(updates.lastName);
      }
      if (updates.phone !== undefined) {
        updateFields.push('phone = ?');
        values.push(updates.phone);
      }
      if (updates.membershipLevel !== undefined) {
        updateFields.push('membershipLevel = ?');
        values.push(updates.membershipLevel);
      }
      if (updates.points !== undefined) {
        updateFields.push('points = ?');
        values.push(updates.points);
      }

      if (updateFields.length === 0) {
        return this.findUserById(userId);
      }

      values.push(userId);
      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      
      const stmt = this.db.prepare(sql);
      stmt.run(values);
      stmt.free();
      
      this.saveDatabase();
      
      return this.findUserById(userId);
    } catch (error) {
      console.error('Update user profile error:', error);
      return undefined;
    }
  }
}