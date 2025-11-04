import { db } from '../database';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export class AnalyticsService {
  async getDashboardData(userId: number): Promise<any> {
    const [
      userStats,
      todayCheckins,
      weeklyData,
      monthlyData,
      recentActivity,
      favoriteBooks
    ] = await Promise.all([
      this.getUserStats(userId),
      this.getTodayCheckins(userId),
      this.getWeeklyData(userId),
      this.getMonthlyData(userId),
      this.getRecentActivity(userId),
      this.getFavoriteBooks(userId)
    ]);

    return {
      userStats,
      todayCheckins,
      weeklyData,
      monthlyData,
      recentActivity,
      favoriteBooks
    };
  }

  private async getUserStats(userId: number): Promise<any> {
    const stats = await db.get(
      'SELECT * FROM user_stats WHERE userId = ?',
      [userId]
    );

    const badgeCount = await db.get(
      'SELECT COUNT(*) as count FROM user_badges WHERE userId = ?',
      [userId]
    );

    return {
      ...stats,
      badgeCount: badgeCount.count
    };
  }

  private async getTodayCheckins(userId: number): Promise<any> {
    const today = format(new Date(), 'yyyy-MM-dd');

    const checkins = await db.all(`
      SELECT c.*, b.title, b.cover
      FROM checkins c
      JOIN books b ON c.bookId = b.id
      WHERE c.userId = ? AND c.checkinDate = ?
      ORDER BY c.createdAt DESC
    `, [userId, today]);

    const totalTime = checkins.reduce((sum, c) => sum + (c.readingTime || 0), 0);

    return {
      count: checkins.length,
      totalTime,
      checkins
    };
  }

  private async getWeeklyData(userId: number): Promise<any> {
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

    const dailyData = await db.all(`
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
    `, [userId, weekStart, weekEnd]);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = format(subDays(endOfWeek(new Date()), 6 - i), 'yyyy-MM-dd');
      const dayData = dailyData.find(d => d.checkinDate === date);
      weekDays.push({
        date,
        count: dayData?.count || 0,
        totalTime: dayData?.totalTime || 0
      });
    }

    return weekDays;
  }

  private async getMonthlyData(userId: number): Promise<any> {
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const monthlyStats = await db.get(`
      SELECT
        COUNT(*) as totalCheckins,
        COUNT(DISTINCT bookId) as uniqueBooks,
        SUM(readingTime) as totalTime,
        COUNT(DISTINCT checkinDate) as activeDays
      FROM checkins
      WHERE userId = ?
        AND checkinDate >= ?
        AND checkinDate <= ?
    `, [userId, monthStart, monthEnd]);

    const weeklyBreakdown = await db.all(`
      SELECT
        strftime('%W', checkinDate) as week,
        COUNT(*) as count,
        SUM(readingTime) as totalTime
      FROM checkins
      WHERE userId = ?
        AND checkinDate >= ?
        AND checkinDate <= ?
      GROUP BY strftime('%W', checkinDate)
      ORDER BY week
    `, [userId, monthStart, monthEnd]);

    return {
      ...monthlyStats,
      weeklyBreakdown
    };
  }

  private async getRecentActivity(userId: number, limit: number = 10): Promise<any> {
    return db.all(`
      SELECT
        c.*,
        b.title as bookTitle,
        b.author as bookAuthor,
        b.cover as bookCover
      FROM checkins c
      JOIN books b ON c.bookId = b.id
      WHERE c.userId = ?
      ORDER BY c.createdAt DESC
      LIMIT ?
    `, [userId, limit]);
  }

  private async getFavoriteBooks(userId: number, limit: number = 5): Promise<any> {
    return db.all(`
      SELECT
        b.*,
        COUNT(c.id) as checkinCount,
        SUM(c.readingTime) as totalReadingTime,
        MAX(c.checkinDate) as lastRead
      FROM books b
      JOIN checkins c ON b.id = c.bookId
      WHERE c.userId = ?
      GROUP BY b.id
      ORDER BY checkinCount DESC, totalReadingTime DESC
      LIMIT ?
    `, [userId, limit]);
  }

  async getReadingTrends(userId: number, days: number = 30): Promise<any> {
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    const dailyTrends = await db.all(`
      SELECT
        checkinDate,
        COUNT(*) as checkins,
        SUM(readingTime) as totalTime,
        COUNT(DISTINCT bookId) as uniqueBooks
      FROM checkins
      WHERE userId = ?
        AND checkinDate >= ?
      GROUP BY checkinDate
      ORDER BY checkinDate
    `, [userId, startDate]);

    const trendData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayData = dailyTrends.find(d => d.checkinDate === date);
      trendData.push({
        date,
        checkins: dayData?.checkins || 0,
        totalTime: dayData?.totalTime || 0,
        uniqueBooks: dayData?.uniqueBooks || 0
      });
    }

    return trendData;
  }

  async getReadingHeatmap(userId: number, year: number): Promise<any> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const heatmapData = await db.all(`
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

    return heatmapData.reduce((heatmap: any, day: any) => {
      heatmap[day.checkinDate] = {
        count: day.count,
        totalTime: day.totalTime,
        level: Math.min(Math.floor(day.count / 2) + 1, 4) // 1-4 intensity levels
      };
      return heatmap;
    }, {});
  }

  async getAgeGroupStats(userId: number): Promise<any> {
    return db.all(`
      SELECT
        b.ageGroup,
        COUNT(c.id) as checkinCount,
        COUNT(DISTINCT c.bookId) as uniqueBooks,
        SUM(c.readingTime) as totalTime,
        AVG(b.difficulty) as avgDifficulty
      FROM checkins c
      JOIN books b ON c.bookId = b.id
      WHERE c.userId = ?
      GROUP BY b.ageGroup
      ORDER BY checkinCount DESC
    `, [userId]);
  }

  async getDifficultyProgress(userId: number): Promise<any> {
    return db.all(`
      SELECT
        b.difficulty,
        COUNT(c.id) as checkinCount,
        COUNT(DISTINCT c.bookId) as uniqueBooks,
        AVG(c.readingTime) as avgReadingTime
      FROM checkins c
      JOIN books b ON c.bookId = b.id
      WHERE c.userId = ?
      GROUP BY b.difficulty
      ORDER BY b.difficulty
    `, [userId]);
  }

  async getGlobalStats(): Promise<any> {
    const [totalUsers, totalBooks, totalCheckins, activeToday] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users WHERE role = "child"'),
      db.get('SELECT COUNT(*) as count FROM books'),
      db.get('SELECT COUNT(*) as count FROM checkins'),
      db.get(`
        SELECT COUNT(DISTINCT userId) as count
        FROM checkins
        WHERE checkinDate = date('now')
      `)
    ]);

    const topBooks = await db.all(`
      SELECT
        b.title,
        b.author,
        b.cover,
        COUNT(c.id) as checkinCount
      FROM books b
      JOIN checkins c ON b.id = c.bookId
      GROUP BY b.id
      ORDER BY checkinCount DESC
      LIMIT 10
    `);

    return {
      totalUsers: totalUsers.count,
      totalBooks: totalBooks.count,
      totalCheckins: totalCheckins.count,
      activeToday: activeToday.count,
      topBooks
    };
  }
}