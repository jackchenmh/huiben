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

  async awardBadge(userId: number, badgeId: number): Promise<boolean> {
    try {
      // 检查用户是否已经拥有该徽章
      const existingBadge = await db.get(
        'SELECT id FROM user_badges WHERE userId = ? AND badgeId = ?',
        [userId, badgeId]
      );

      if (existingBadge) {
        return false;
      }

      // 获取徽章信息
      const badge = await db.get('SELECT * FROM badges WHERE id = ?', [badgeId]);
      if (!badge) {
        return false;
      }

      // 检查用户是否满足徽章条件
      const progress = await this.getBadgeProgress(userId, badgeId);
      if (progress.percentage < 100) {
        return false;
      }

      // 授予徽章
      await db.run(
        'INSERT INTO user_badges (userId, badgeId) VALUES (?, ?)',
        [userId, badgeId]
      );

      // 奖励积分
      if (badge.points > 0) {
        await this.addPoints(userId, badge.points, `获得徽章: ${badge.name}`, badgeId, 'badge');
      }

      return true;
    } catch (error) {
      console.error('Award badge error:', error);
      return false;
    }
  }

  async checkAndAwardBadges(userId: number): Promise<Badge[]> {
    const availableBadges = await this.getAvailableBadges(userId);
    const awardedBadges: Badge[] = [];

    for (const badge of availableBadges) {
      const awarded = await this.awardBadge(userId, badge.id);
      if (awarded) {
        awardedBadges.push(badge);
      }
    }

    return awardedBadges;
  }

  async updateLevel(userId: number): Promise<{ levelUp: boolean; newLevel: number; oldLevel: number }> {
    const stats = await this.getUserStats(userId);
    if (!stats) {
      return { levelUp: false, newLevel: 1, oldLevel: 1 };
    }

    const oldLevel = stats.level;
    const newLevel = Math.floor(stats.totalBooks / 10) + 1;

    if (newLevel > oldLevel) {
      await db.run(
        'UPDATE user_stats SET level = ? WHERE userId = ?',
        [newLevel, userId]
      );

      // 升级奖励积分
      const levelUpBonus = newLevel * 50;
      await this.addPoints(userId, levelUpBonus, `升级到等级 ${newLevel}`, newLevel, 'level_up');

      return { levelUp: true, newLevel, oldLevel };
    }

    return { levelUp: false, newLevel: oldLevel, oldLevel };
  }

  async getDailyChallenge(userId: number): Promise<{
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    reward: number;
    completed: boolean;
  } | null> {
    const today = new Date().toISOString().split('T')[0];

    // 检查今天是否已完成挑战
    const existingChallenge = await db.get(
      `SELECT id FROM points
       WHERE userId = ? AND reason = '每日挑战完成'
       AND DATE(createdAt) = ?`,
      [userId, today]
    );

    const completed = !!existingChallenge;

    // 获取今天的阅读时间
    const todayReading = await db.get(
      `SELECT SUM(readingTime) as total
       FROM checkins
       WHERE userId = ? AND DATE(checkinDate) = ?`,
      [userId, today]
    );

    const current = todayReading?.total || 0;
    const target = 30; // 30分钟阅读目标

    return {
      id: `daily_${today}`,
      title: '每日阅读挑战',
      description: '今天阅读30分钟获得额外奖励',
      target,
      current,
      reward: 50,
      completed
    };
  }

  async completeDailyChallenge(userId: number): Promise<boolean> {
    const challenge = await this.getDailyChallenge(userId);

    if (!challenge || challenge.completed || challenge.current < challenge.target) {
      return false;
    }

    await this.addPoints(userId, challenge.reward, '每日挑战完成');
    return true;
  }

  async getWeeklyStats(userId: number): Promise<{
    thisWeek: any;
    lastWeek: any;
    growth: { books: number; time: number; points: number };
  }> {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(currentWeekStart);
    lastWeekEnd.setDate(currentWeekStart.getDate() - 1);

    const [thisWeek, lastWeek] = await Promise.all([
      this.getStatsForPeriod(userId, currentWeekStart.toISOString().split('T')[0], now.toISOString().split('T')[0]),
      this.getStatsForPeriod(userId, lastWeekStart.toISOString().split('T')[0], lastWeekEnd.toISOString().split('T')[0])
    ]);

    const growth = {
      books: thisWeek.totalBooks - lastWeek.totalBooks,
      time: thisWeek.totalTime - lastWeek.totalTime,
      points: thisWeek.totalPoints - lastWeek.totalPoints
    };

    return { thisWeek, lastWeek, growth };
  }

  private async getStatsForPeriod(userId: number, startDate: string, endDate: string): Promise<{
    totalBooks: number;
    totalTime: number;
    totalPoints: number;
    checkinDays: number;
  }> {
    const [books, time, points, days] = await Promise.all([
      db.get(
        `SELECT COUNT(DISTINCT bookId) as count
         FROM checkins
         WHERE userId = ? AND checkinDate >= ? AND checkinDate <= ?`,
        [userId, startDate, endDate]
      ),
      db.get(
        `SELECT SUM(readingTime) as total
         FROM checkins
         WHERE userId = ? AND checkinDate >= ? AND checkinDate <= ?`,
        [userId, startDate, endDate]
      ),
      db.get(
        `SELECT SUM(points) as total
         FROM points
         WHERE userId = ? AND DATE(createdAt) >= ? AND DATE(createdAt) <= ?`,
        [userId, startDate, endDate]
      ),
      db.get(
        `SELECT COUNT(DISTINCT DATE(checkinDate)) as count
         FROM checkins
         WHERE userId = ? AND checkinDate >= ? AND checkinDate <= ?`,
        [userId, startDate, endDate]
      )
    ]);

    return {
      totalBooks: books.count || 0,
      totalTime: time.total || 0,
      totalPoints: points.total || 0,
      checkinDays: days.count || 0
    };
  }

  async getPersonalizedRecommendations(userId: number): Promise<{
    badges: Badge[];
    challenges: string[];
    tips: string[];
  }> {
    const stats = await this.getUserStats(userId);
    const availableBadges = await this.getAvailableBadges(userId);

    // 推荐接近完成的徽章
    const nearCompletionBadges: Badge[] = [];
    for (const badge of availableBadges.slice(0, 3)) {
      const progress = await this.getBadgeProgress(userId, badge.id);
      if (progress.percentage >= 70) {
        nearCompletionBadges.push(badge);
      }
    }

    // 基于用户数据生成个性化挑战
    const challenges: string[] = [];
    if (stats) {
      if (stats.consecutiveDays < 7) {
        challenges.push(`连续阅读${7 - stats.consecutiveDays}天解锁坚持者徽章`);
      }
      if (stats.totalBooks < 10) {
        challenges.push(`再读${10 - stats.totalBooks}本书升级到下一等级`);
      }
      if (stats.totalReadingTime < 3600) { // 60小时
        challenges.push('累计阅读60小时解锁时光旅行者徽章');
      }
    }

    // 阅读建议
    const tips = [
      '每天固定时间阅读，养成良好习惯',
      '和家长一起阅读，分享读书心得',
      '尝试不同类型的绘本，开拓视野',
      '记录阅读感受，提高理解能力',
      '参与班级阅读活动，与同学交流'
    ];

    return {
      badges: nearCompletionBadges,
      challenges: challenges.slice(0, 3),
      tips: tips.slice(0, 3)
    };
  }

  async getLevelInfo(level: number): Promise<{
    level: number;
    title: string;
    booksRequired: number;
    nextLevelBooks: number;
    rewards: string[];
  }> {
    const booksRequired = (level - 1) * 10;
    const nextLevelBooks = level * 10;

    const levelTitles = [
      '初级读者', '阅读爱好者', '书虫小子', '阅读达人', '故事专家',
      '绘本大师', '阅读冠军', '书籍收藏家', '阅读传奇', '智慧之星'
    ];

    const title = levelTitles[Math.min(level - 1, levelTitles.length - 1)] || `等级${level}读者`;

    const rewards = [
      `解锁等级${level}专属头像`,
      `获得${level * 50}积分奖励`,
      '解锁新的阅读挑战'
    ];

    return {
      level,
      title,
      booksRequired,
      nextLevelBooks,
      rewards
    };
  }
}