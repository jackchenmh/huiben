import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath);
  }

  async initialize(): Promise<void> {
    await this.createTables();
    await this.insertInitialData();
    await this.initializeSystemConfigs();
  }

  private async createTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT CHECK(role IN ('child', 'parent', 'teacher')) NOT NULL,
        displayName TEXT NOT NULL,
        avatar TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT,
        cover TEXT,
        description TEXT,
        ageGroup TEXT NOT NULL,
        difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 5) DEFAULT 1,
        pages INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        bookId INTEGER NOT NULL,
        checkinDate DATE NOT NULL,
        readingTime INTEGER DEFAULT 0,
        notes TEXT,
        images TEXT,
        parentComment TEXT,
        teacherComment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id),
        FOREIGN KEY (bookId) REFERENCES books (id),
        UNIQUE(userId, bookId, checkinDate)
      )`,

      `CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER UNIQUE NOT NULL,
        totalBooks INTEGER DEFAULT 0,
        totalReadingTime INTEGER DEFAULT 0,
        consecutiveDays INTEGER DEFAULT 0,
        longestStreak INTEGER DEFAULT 0,
        totalPoints INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        condition TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        badgeId INTEGER NOT NULL,
        earnedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id),
        FOREIGN KEY (badgeId) REFERENCES badges (id),
        UNIQUE(userId, badgeId)
      )`,

      `CREATE TABLE IF NOT EXISTS points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        relatedId INTEGER,
        relatedType TEXT CHECK(relatedType IN ('checkin', 'badge', 'streak')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS user_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parentId INTEGER NOT NULL,
        childId INTEGER NOT NULL,
        relationshipType TEXT CHECK(relationshipType IN ('parent-child', 'teacher-student')) DEFAULT 'parent-child',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parentId) REFERENCES users (id),
        FOREIGN KEY (childId) REFERENCES users (id),
        UNIQUE(parentId, childId)
      )`,

      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        type TEXT CHECK(type IN ('system', 'reminder', 'achievement', 'social')) NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        relatedId INTEGER,
        relatedType TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS system_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        category TEXT CHECK(category IN ('system', 'notification', 'game', 'security', 'ui')) DEFAULT 'system',
        dataType TEXT CHECK(dataType IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
        isPublic BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
  }

  private async insertInitialData(): Promise<void> {
    // 插入演示用户数据
    const userCount = await this.get('SELECT COUNT(*) as count FROM users');

    if (userCount.count === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      const demoUsers = [
        { username: 'child01', password: hashedPassword, email: 'child01@demo.com', role: 'child', displayName: '小明' },
        { username: 'parent01', password: hashedPassword, email: 'parent01@demo.com', role: 'parent', displayName: '张妈妈' },
        { username: 'teacher01', password: hashedPassword, email: 'teacher01@demo.com', role: 'teacher', displayName: '李老师' }
      ];

      for (const user of demoUsers) {
        const result = await this.run(
          'INSERT INTO users (username, password, email, role, displayName) VALUES (?, ?, ?, ?, ?)',
          [user.username, user.password, user.email, user.role, user.displayName]
        );

        // 为每个用户创建初始统计数据
        await this.run(
          'INSERT INTO user_stats (userId) VALUES (?)',
          [result.lastID]
        );
      }
    }

    const badgeCount = await this.get('SELECT COUNT(*) as count FROM badges');

    if (badgeCount.count === 0) {
      const badges = [
        { name: '初读者', description: '完成第一次阅读打卡', icon: '📖', condition: 'first_checkin', points: 10 },
        { name: '坚持者', description: '连续打卡7天', icon: '🏃', condition: 'streak_7', points: 50 },
        { name: '阅读达人', description: '连续打卡30天', icon: '🏆', condition: 'streak_30', points: 200 },
        { name: '书虫', description: '阅读100本绘本', icon: '🐛', condition: 'books_100', points: 300 },
        { name: '时光旅行者', description: '累计阅读100小时', icon: '⏰', condition: 'time_100h', points: 500 },
        { name: '评论家', description: '写下50条阅读心得', icon: '✍️', condition: 'notes_50', points: 100 }
      ];

      for (const badge of badges) {
        await this.run(
          'INSERT INTO badges (name, description, icon, condition, points) VALUES (?, ?, ?, ?, ?)',
          [badge.name, badge.description, badge.icon, badge.condition, badge.points]
        );
      }
    }

    const bookCount = await this.get('SELECT COUNT(*) as count FROM books');

    if (bookCount.count === 0) {
      const books = [
        { title: '小红帽', author: '格林兄弟', ageGroup: '3-6岁', difficulty: 1, pages: 24 },
        { title: '三只小猪', author: '约瑟夫·雅各布斯', ageGroup: '3-6岁', difficulty: 1, pages: 32 },
        { title: '丑小鸭', author: '安徒生', ageGroup: '4-7岁', difficulty: 2, pages: 40 },
        { title: '白雪公主', author: '格林兄弟', ageGroup: '4-8岁', difficulty: 2, pages: 48 },
        { title: '爱丽丝梦游仙境', author: '刘易斯·卡罗尔', ageGroup: '6-10岁', difficulty: 3, pages: 64 }
      ];

      for (const book of books) {
        await this.run(
          'INSERT INTO books (title, author, ageGroup, difficulty, pages) VALUES (?, ?, ?, ?, ?)',
          [book.title, book.author, book.ageGroup, book.difficulty, book.pages]
        );
      }
    }
  }

  private async initializeSystemConfigs(): Promise<void> {
    const { SystemConfigService } = await import('../services/systemConfigService');
    const configService = new SystemConfigService();
    await configService.initializeDefaultConfigs();
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve(this); // this context contains lastID, changes, etc.
        }
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

export const db = new Database(process.env.DB_PATH || './data/reading_journey.db');