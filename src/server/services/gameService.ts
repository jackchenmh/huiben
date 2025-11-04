import { db } from '../database';
import { UserStats, Badge, UserBadge, Point } from '../types';

export class GameService {
  async getUserStats(userId: number): Promise<UserStats | null> {
    return db.get('SELECT * FROM user_stats WHERE userId = ?', [userId]);
  }

  async addPoints(userId: number, points: number, reason: string, relatedId?: number, relatedType?: string): Promise<void> {
    await db.run(
      'INSERT INTO points (userId, points, reason, relatedId, relatedType) VALUES (?, ?, ?, ?, ?)',
      [userId, points, reason, relatedId, relatedType]
    );

    await db.run(
      'UPDATE user_stats SET totalPoints = totalPoints + ? WHERE userId = ?',
      [points, userId]
    );
  }

  async getUserBadges(userId: number): Promise<(Badge & { earnedAt: string })[]> {
    return db.all(`
      SELECT b.*, ub.earnedAt
      FROM badges b
      JOIN user_badges ub ON b.id = ub.badgeId
      WHERE ub.userId = ?
      ORDER BY ub.earnedAt DESC
    `, [userId]);
  }

  async getAllBadges(): Promise<Badge[]> {
    return db.all('SELECT * FROM badges ORDER BY points ASC');
  }

  async getUserPointsHistory(userId: number, limit: number = 50): Promise<Point[]> {
    return db.all(
      'SELECT * FROM points WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
      [userId, limit]
    );
  }

  async getLeaderboard(type: 'points' | 'books' | 'streak' = 'points', limit: number = 20): Promise<any[]> {
    let orderBy: string;

    switch (type) {
      case 'points':
        orderBy = 'totalPoints DESC';
        break;
      case 'books':
        orderBy = 'totalBooks DESC';
        break;
      case 'streak':
        orderBy = 'longestStreak DESC';
        break;
      default:
        orderBy = 'totalPoints DESC';
    }

    return db.all(`
      SELECT
        u.id,
        u.displayName,
        u.avatar,
        us.totalPoints,
        us.totalBooks,
        us.consecutiveDays,
        us.longestStreak,
        us.level,
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
      FROM user_stats us
      JOIN users u ON us.userId = u.id
      WHERE u.role = 'child'
      ORDER BY ${orderBy}
      LIMIT ?
    `, [limit]);
  }

  async getUserRank(userId: number, type: 'points' | 'books' | 'streak' = 'points'): Promise<number> {
    let orderBy: string;

    switch (type) {
      case 'points':
        orderBy = 'totalPoints DESC';
        break;
      case 'books':
        orderBy = 'totalBooks DESC';
        break;
      case 'streak':
        orderBy = 'longestStreak DESC';
        break;
      default:
        orderBy = 'totalPoints DESC';
    }

    const result = await db.get(`
      SELECT rank FROM (
        SELECT
          userId,
          ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
        FROM user_stats us
        JOIN users u ON us.userId = u.id
        WHERE u.role = 'child'
      ) ranked
      WHERE userId = ?
    `, [userId]);

    return result?.rank || 0;
  }

  async getAvailableBadges(userId: number): Promise<Badge[]> {
    const userBadges = await db.all(
      'SELECT badgeId FROM user_badges WHERE userId = ?',
      [userId]
    );

    const earnedBadgeIds = userBadges.map(b => b.badgeId);

    if (earnedBadgeIds.length === 0) {
      return this.getAllBadges();
    }

    return db.all(
      `SELECT * FROM badges WHERE id NOT IN (${earnedBadgeIds.join(',')}) ORDER BY points ASC`
    );
  }

  async getBadgeProgress(userId: number, badgeId: number): Promise<{ current: number; target: number; percentage: number }> {
    const badge = await db.get('SELECT * FROM badges WHERE id = ?', [badgeId]);
    if (!badge) {
      return { current: 0, target: 1, percentage: 0 };
    }

    const stats = await this.getUserStats(userId);
    if (!stats) {
      return { current: 0, target: 1, percentage: 0 };
    }

    let current = 0;
    let target = 1;

    switch (badge.condition) {
      case 'first_checkin':
        current = stats.totalBooks > 0 ? 1 : 0;
        target = 1;
        break;
      case 'streak_7':
        current = stats.consecutiveDays;
        target = 7;
        break;
      case 'streak_30':
        current = stats.consecutiveDays;
        target = 30;
        break;
      case 'books_100':
        current = stats.totalBooks;
        target = 100;
        break;
      case 'time_100h':
        current = Math.floor(stats.totalReadingTime / 60); // Convert to hours
        target = 100;
        break;
      case 'notes_50':
        const notesCount = await db.get(
          'SELECT COUNT(*) as count FROM checkins WHERE userId = ? AND notes IS NOT NULL AND notes != ""',
          [userId]
        );
        current = notesCount.count;
        target = 50;
        break;
    }

    const percentage = Math.min((current / target) * 100, 100);

    return { current, target, percentage };
  }

  async getMonthlyStats(userId: number, year: number, month: number): Promise<any> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate()}`;

    const checkins = await db.all(`
      SELECT
        DATE(checkinDate) as date,
        COUNT(*) as count,
        SUM(readingTime) as totalTime
      FROM checkins
      WHERE userId = ?
        AND checkinDate >= ?
        AND checkinDate <= ?
      GROUP BY DATE(checkinDate)
      ORDER BY date
    `, [userId, startDate, endDateStr]);

    const totalBooks = await db.get(`
      SELECT COUNT(DISTINCT bookId) as count
      FROM checkins
      WHERE userId = ?
        AND checkinDate >= ?
        AND checkinDate <= ?
    `, [userId, startDate, endDateStr]);

    const totalTime = await db.get(`
      SELECT SUM(readingTime) as total
      FROM checkins
      WHERE userId = ?
        AND checkinDate >= ?
        AND checkinDate <= ?
    `, [userId, startDate, endDateStr]);

    return {
      checkins,
      totalBooks: totalBooks.count || 0,
      totalTime: totalTime.total || 0,
      daysActive: checkins.length
    };
  }

  async awardDailyPoints(userId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const existingDailyPoints = await db.get(
      `SELECT id FROM points
       WHERE userId = ? AND reason = '每日阅读奖励'
       AND DATE(createdAt) = ?`,
      [userId, today]
    );

    if (existingDailyPoints) {
      return;
    }

    await this.addPoints(userId, 10, '每日阅读奖励');
  }

  async awardStreakBonus(userId: number, streak: number): Promise<void> {
    const bonusPoints = Math.floor(streak / 7) * 25;

    if (bonusPoints > 0 && streak % 7 === 0) {
      await this.addPoints(userId, bonusPoints, `连续阅读${streak}天奖励`, streak, 'streak');
    }
  }

  async getLevelInfo(level: number): Promise<{ currentLevel: number; nextLevel: number; booksNeeded: number; benefits: string[] }> {
    const currentLevelBooks = (level - 1) * 10;
    const nextLevelBooks = level * 10;
    const booksNeeded = nextLevelBooks - currentLevelBooks;

    const benefits = [
      '解锁更多高级绘本',
      '获得专属头像框',
      '参与高级挑战',
      '获得更多积分奖励'
    ];

    return {
      currentLevel: level,
      nextLevel: level + 1,
      booksNeeded,
      benefits
    };
  }
}