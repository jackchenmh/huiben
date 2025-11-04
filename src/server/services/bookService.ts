import { db } from '../database';
import { Book } from '../types';

export class BookService {
  async createBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    const result = await db.run(
      `INSERT INTO books (title, author, isbn, cover, description, ageGroup, difficulty, pages)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookData.title,
        bookData.author,
        bookData.isbn,
        bookData.cover,
        bookData.description,
        bookData.ageGroup,
        bookData.difficulty,
        bookData.pages
      ]
    );

    const book = await this.getBookById(result.lastID);
    if (!book) {
      throw new Error('Failed to create book');
    }
    return book;
  }

  async getBookById(id: number): Promise<Book | null> {
    return db.get('SELECT * FROM books WHERE id = ?', [id]);
  }

  async getAllBooks(filters?: {
    ageGroup?: string;
    difficulty?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ books: Book[]; total: number }> {
    let whereClause = '';
    let params: any[] = [];
    let countParams: any[] = [];

    const conditions: string[] = [];

    if (filters?.ageGroup) {
      conditions.push('ageGroup = ?');
      params.push(filters.ageGroup);
      countParams.push(filters.ageGroup);
    }

    if (filters?.difficulty) {
      conditions.push('difficulty = ?');
      params.push(filters.difficulty);
      countParams.push(filters.difficulty);
    }

    if (filters?.search) {
      conditions.push('(title LIKE ? OR author LIKE ? OR description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const countQuery = `SELECT COUNT(*) as total FROM books ${whereClause}`;
    const { total } = await db.get(countQuery, countParams);

    let query = `SELECT * FROM books ${whereClause} ORDER BY createdAt DESC`;

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);

      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const books = await db.all(query, params);

    return { books, total };
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book | null> {
    const allowedFields = ['title', 'author', 'isbn', 'cover', 'description', 'ageGroup', 'difficulty', 'pages'];
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return this.getBookById(id);
    }

    values.push(id);
    await db.run(
      `UPDATE books SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.getBookById(id);
  }

  async deleteBook(id: number): Promise<boolean> {
    const checkinCount = await db.get(
      'SELECT COUNT(*) as count FROM checkins WHERE bookId = ?',
      [id]
    );

    if (checkinCount.count > 0) {
      throw new Error('无法删除已有打卡记录的绘本');
    }

    const result = await db.run('DELETE FROM books WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getPopularBooks(limit: number = 10): Promise<Book[]> {
    return db.all(
      `SELECT b.*, COUNT(c.id) as checkinCount
       FROM books b
       LEFT JOIN checkins c ON b.id = c.bookId
       GROUP BY b.id
       ORDER BY checkinCount DESC, b.createdAt DESC
       LIMIT ?`,
      [limit]
    );
  }

  async getRecommendedBooks(userId: number, limit: number = 5): Promise<Book[]> {
    const userStats = await db.get(
      'SELECT level FROM user_stats WHERE userId = ?',
      [userId]
    );

    const userLevel = userStats?.level || 1;
    const recommendedDifficulty = Math.min(userLevel + 1, 5);

    return db.all(
      `SELECT b.* FROM books b
       WHERE b.difficulty <= ?
       AND b.id NOT IN (
         SELECT DISTINCT bookId FROM checkins WHERE userId = ?
       )
       ORDER BY b.difficulty DESC, RANDOM()
       LIMIT ?`,
      [recommendedDifficulty, userId, limit]
    );
  }

  async getBooksByAgeGroup(ageGroup: string): Promise<Book[]> {
    return db.all(
      'SELECT * FROM books WHERE ageGroup = ? ORDER BY difficulty, title',
      [ageGroup]
    );
  }

  async searchBooks(query: string, limit: number = 20): Promise<Book[]> {
    const searchTerm = `%${query}%`;
    return db.all(
      `SELECT * FROM books
       WHERE title LIKE ? OR author LIKE ? OR description LIKE ?
       ORDER BY
         CASE
           WHEN title LIKE ? THEN 1
           WHEN author LIKE ? THEN 2
           ELSE 3
         END,
         title
       LIMIT ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit]
    );
  }
}