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
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
  }

  private async insertInitialData(): Promise<void> {
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

  async run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
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
      this.db.get(sql, params, (err, row) => {
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
      this.db.all(sql, params, (err, rows) => {
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