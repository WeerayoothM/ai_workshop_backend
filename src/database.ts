import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlDatabase } from 'sql.js';

export interface User {
  id: string;
  email: string;
  password: string;
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

  private createTables(): void {
    if (!this.db) return;
    
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
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
        INSERT INTO users (id, email, password, created_at) 
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run([userId, email, hashedPassword, createdAt]);
      stmt.free();
      
      this.saveDatabase();
      
      return {
        id: userId,
        email,
        password: hashedPassword,
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
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
      const result = stmt.get([email]);
      stmt.free();

      if (!result) return undefined;

      return {
        id: String(result[0]),
        email: String(result[1]),
        password: String(result[2]),
        createdAt: new Date(String(result[3]))
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
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const result = stmt.get([id]);
      stmt.free();

      if (!result) return undefined;

      return {
        id: String(result[0]),
        email: String(result[1]), 
        password: String(result[2]),
        createdAt: new Date(String(result[3]))
      };
    } catch (error) {
      console.error('Find user by ID error:', error);
      return undefined;
    }
  }
}