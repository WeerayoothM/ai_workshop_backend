import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
}

export class Database {
  private dbPath: string;
  private users: User[] = [];

  constructor() {
    this.dbPath = path.join(__dirname, '../data/users.json');
    this.initDatabase();
  }

  private initDatabase(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      const data = fs.readFileSync(this.dbPath, 'utf-8');
      this.users = JSON.parse(data);
    } else {
      this.saveUsers();
    }
  }

  private saveUsers(): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.users, null, 2));
  }

  public createUser(email: string, hashedPassword: string): User {
    const user: User = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    this.users.push(user);
    this.saveUsers();
    return user;
  }

  public findUserByEmail(email: string): User | undefined {
    return this.users.find(user => user.email === email);
  }

  public findUserById(id: string): User | undefined {
    return this.users.find(user => user.id === id);
  }
}