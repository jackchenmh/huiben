import { db } from '../database';
import { CheckIn, UserStats } from '../types';
import { format, isToday, subDays, startOfDay, endOfDay } from 'date-fns';

export class CheckInService {
  async createCheckIn(checkInData: Omit<CheckIn, 'id' | 'createdAt' | 'updatedAt'>): Promise<CheckIn> {
    const today = format(new Date(), 'yyyy-MM-dd');

    const existingCheckIn = await db.get(
      'SELECT id FROM checkins WHERE userId = ? AND bookId = ? AND checkinDate = ?',
      [checkInData.userId, checkInData.bookId, today]
    );

    if (existingCheckIn) {
      throw new Error('今天已经为此绘本打过卡了');
    }

    const result = await db.run(
      `INSERT INTO checkins (userId, bookId, checkinDate, readingTime, notes, images)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        checkInData.userId,
        checkInData.bookId,
        today,
        checkInData.readingTime || 0,
        checkInData.notes,
        checkInData.images
      ]
    );

    await this.updateUserStats(checkInData.userId);
    await this.checkAndAwardBadges(checkInData.userId);

    const checkIn = await this.getCheckInById(result.lastID);
    if (!checkIn) {
      throw new Error('Failed to create check-in');
    }
    return checkIn;
  }

  async getCheckInById(id: number): Promise<CheckIn | null> {
    return db.get(`
      SELECT c.*, b.title as bookTitle, b.author as bookAuthor, b.cover as bookCover
      FROM checkins c
      JOIN books b ON c.bookId = b.id
      WHERE c.id = ?
    `, [id]);
  }

  async getUserCheckIns(userId: number, options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ checkins: CheckIn[]; total: number }> {
    let whereClause = 'WHERE c.userId = ?';
    let params: any[] = [userId];

    if (options?.startDate) {
      whereClause += ' AND c.checkinDate >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      whereClause += ' AND c.checkinDate <= ?';
      params.push(options.endDate);
    }

    const countQuery = `SELECT COUNT(*) as total FROM checkins c ${whereClause}`;
    const { total } = await db.get(countQuery, params);

    let query = `
      SELECT c.*, b.title as bookTitle, b.author as bookAuthor, b.cover as bookCover
      FROM checkins c
      JOIN books b ON c.bookId = b.id
      ${whereClause}
      ORDER BY c.checkinDate DESC, c.createdAt DESC
    `;

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options?.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const checkins = await db.all(query, params);

    return { checkins, total };
  }

  async getTodayCheckIn(userId: number): Promise<CheckIn[]> {
    const today = format(new Date(), 'yyyy-MM-dd');

    return db.all(`
      SELECT c.*, b.title as bookTitle, b.author as bookAuthor, b.cover as bookCover
      FROM checkins c
      JOIN books b ON c.bookId = b.id
      WHERE c.userId = ? AND c.checkinDate = ?
      ORDER BY c.createdAt DESC
    `, [userId, today]);
  }

  async getCheckInStreak(userId: number): Promise<number> {
    const checkins = await db.all(
      'SELECT DISTINCT checkinDate FROM checkins WHERE userId = ? ORDER BY checkinDate DESC',
      [userId]
    );

    if (checkins.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();

    for (const checkin of checkins) {
      const checkinDate = new Date(checkin.checkinDate);

      if (streak === 0 && !isToday(checkinDate) && format(subDays(currentDate, 1), 'yyyy-MM-dd') !== checkin.checkinDate) {
        break;
      }

      if (format(currentDate, 'yyyy-MM-dd') === checkin.checkinDate ||
          format(subDays(currentDate, 1), 'yyyy-MM-dd') === checkin.checkinDate) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }

    return streak;
  }

  async updateCheckIn(id: number, updates: Partial<CheckIn>): Promise<CheckIn | null> {
    const allowedFields = ['readingTime', 'notes', 'images', 'parentComment', 'teacherComment'];
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return this.getCheckInById(id);
    }

    values.push(id);
    await db.run(
      `UPDATE checkins SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.getCheckInById(id);
  }

  async deleteCheckIn(id: number, userId: number): Promise<boolean> {
    const checkIn = await db.get(
      'SELECT userId FROM checkins WHERE id = ?',
      [id]
    );

    if (!checkIn || checkIn.userId !== userId) {
      return false;
    }

    const result = await db.run('DELETE FROM checkins WHERE id = ?', [id]);

    if (result.changes > 0) {
      await this.updateUserStats(userId);
    }

    return result.changes > 0;
  }

  async getReadingCalendar(userId: number, year: number, month: number): Promise<any> {
    const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');

    const checkins = await db.all(`
      SELECT
        checkinDate,
        COUNT(*) as count,
        SUM(readingTime) as totalTime
      FROM checkins
      WHERE userId = ?
        AND checkinDate >= ?
        AND checkinDate <= ?
      GROUP BY checkinDate
      ORDER BY checkinDate
    `, [userId, startDate, endDate]);

    return checkins.reduce((calendar: any, checkin: any) => {
      calendar[checkin.checkinDate] = {
        count: checkin.count,
        totalTime: checkin.totalTime
      };
      return calendar;
    }, {});
  }

  private async updateUserStats(userId: number): Promise<void> {
    const stats = await db.get(`
      SELECT
        COUNT(DISTINCT bookId) as totalBooks,
        SUM(readingTime) as totalReadingTime,
        COUNT(*) as totalCheckins
      FROM checkins
      WHERE userId = ?
    `, [userId]);

    const streak = await this.getCheckInStreak(userId);

    const existingStats = await db.get(
      'SELECT longestStreak FROM user_stats WHERE userId = ?',
      [userId]
    );

    const longestStreak = Math.max(streak, existingStats?.longestStreak || 0);
    const level = Math.floor((stats.totalBooks || 0) / 10) + 1;

    await db.run(`
      INSERT OR REPLACE INTO user_stats
      (userId, totalBooks, totalReadingTime, consecutiveDays, longestStreak, level, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      userId,
      stats.totalBooks || 0,
      stats.totalReadingTime || 0,
      streak,
      longestStreak,
      level
    ]);
  }

  private async checkAndAwardBadges(userId: number): Promise<void> {
    const stats = await db.get('SELECT * FROM user_stats WHERE userId = ?', [userId]);
    if (!stats) return;

    const badges = await db.all('SELECT * FROM badges');
    const userBadges = await db.all('SELECT badgeId FROM user_badges WHERE userId = ?', [userId]);
    const earnedBadgeIds = userBadges.map(b => b.badgeId);

    for (const badge of badges) {
      if (earnedBadgeIds.includes(badge.id)) continue;

      let shouldAward = false;

      switch (badge.condition) {
        case 'first_checkin':
          shouldAward = stats.totalBooks >= 1;
          break;
        case 'streak_7':
          shouldAward = stats.consecutiveDays >= 7;
          break;
        case 'streak_30':
          shouldAward = stats.consecutiveDays >= 30;
          break;
        case 'books_100':
          shouldAward = stats.totalBooks >= 100;
          break;
        case 'time_100h':
          shouldAward = stats.totalReadingTime >= 6000; // 100 hours in minutes
          break;
        case 'notes_50':
          const notesCount = await db.get(
            'SELECT COUNT(*) as count FROM checkins WHERE userId = ? AND notes IS NOT NULL AND notes != ""',
            [userId]
          );
          shouldAward = notesCount.count >= 50;
          break;
      }

      if (shouldAward) {
        await db.run(
          'INSERT INTO user_badges (userId, badgeId) VALUES (?, ?)',
          [userId, badge.id]
        );

        await db.run(
          'INSERT INTO points (userId, points, reason, relatedId, relatedType) VALUES (?, ?, ?, ?, ?)',
          [userId, badge.points, `获得徽章：${badge.name}`, badge.id, 'badge']
        );

        await db.run(
          'UPDATE user_stats SET totalPoints = totalPoints + ? WHERE userId = ?',
          [badge.points, userId]
        );
      }
    }
  }
}