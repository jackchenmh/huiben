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

  // 新增：家长/老师查看孩子的分析数据
  async getChildAnalytics(childId: number, parentId: number, userRole: string): Promise<any> {
    // 验证权限
    const hasPermission = await this.verifyChildAccess(childId, parentId, userRole);
    if (!hasPermission) {
      throw new Error('无权访问该孩子的数据');
    }

    const [
      basicStats,
      readingTrends,
      difficultyProgress,
      ageGroupStats,
      recentActivity,
      badgeProgress
    ] = await Promise.all([
      this.getUserStats(childId),
      this.getReadingTrends(childId, 30),
      this.getDifficultyProgress(childId),
      this.getAgeGroupStats(childId),
      this.getRecentActivity(childId, 20),
      this.getBadgeAnalytics(childId)
    ]);

    return {
      basicStats,
      readingTrends,
      difficultyProgress,
      ageGroupStats,
      recentActivity,
      badgeProgress
    };
  }

  private async verifyChildAccess(childId: number, parentId: number, userRole: string): Promise<boolean> {
    if (userRole === 'parent') {
      const relationship = await db.get(
        'SELECT id FROM user_relationships WHERE parentId = ? AND childId = ? AND relationshipType = "parent-child"',
        [parentId, childId]
      );
      return !!relationship;
    } else if (userRole === 'teacher') {
      const relationship = await db.get(
        'SELECT id FROM user_relationships WHERE parentId = ? AND childId = ? AND relationshipType = "teacher-student"',
        [parentId, childId]
      );
      return !!relationship;
    }
    return false;
  }

  private async getBadgeAnalytics(userId: number): Promise<any> {
    const [earnedBadges, totalBadges] = await Promise.all([
      db.all(`
        SELECT b.*, ub.earnedAt
        FROM badges b
        JOIN user_badges ub ON b.id = ub.badgeId
        WHERE ub.userId = ?
        ORDER BY ub.earnedAt DESC
      `, [userId]),
      db.get('SELECT COUNT(*) as count FROM badges')
    ]);

    const badgesByMonth = await db.all(`
      SELECT
        strftime('%Y-%m', ub.earnedAt) as month,
        COUNT(*) as count
      FROM user_badges ub
      WHERE ub.userId = ?
      GROUP BY strftime('%Y-%m', ub.earnedAt)
      ORDER BY month
    `, [userId]);

    return {
      earnedBadges,
      totalBadges: totalBadges.count,
      earnedCount: earnedBadges.length,
      completionRate: (earnedBadges.length / totalBadges.count * 100).toFixed(1),
      badgesByMonth
    };
  }

  // 班级分析（老师功能）
  async getClassAnalytics(teacherId: number): Promise<any> {
    // 获取老师的所有学生
    const students = await db.all(`
      SELECT u.id, u.displayName, u.avatar
      FROM users u
      JOIN user_relationships ur ON u.id = ur.childId
      WHERE ur.parentId = ? AND ur.relationshipType = 'teacher-student'
    `, [teacherId]);

    if (students.length === 0) {
      return { message: '暂无学生数据' };
    }

    const studentIds = students.map(s => s.id);
    const placeholders = studentIds.map(() => '?').join(',');

    const [classStats, topReaders, activitySummary, difficultyDistribution] = await Promise.all([
      this.getClassStats(studentIds, placeholders),
      this.getTopReaders(studentIds, placeholders),
      this.getClassActivitySummary(studentIds, placeholders),
      this.getClassDifficultyDistribution(studentIds, placeholders)
    ]);

    return {
      classSize: students.length,
      classStats,
      topReaders,
      activitySummary,
      difficultyDistribution,
      students
    };
  }

  private async getClassStats(studentIds: number[], placeholders: string): Promise<any> {
    return db.get(`
      SELECT
        COUNT(DISTINCT c.userId) as activeStudents,
        COUNT(c.id) as totalCheckins,
        COUNT(DISTINCT c.bookId) as uniqueBooks,
        SUM(c.readingTime) as totalReadingTime,
        AVG(us.totalPoints) as avgPoints,
        AVG(us.level) as avgLevel
      FROM checkins c
      LEFT JOIN user_stats us ON c.userId = us.userId
      WHERE c.userId IN (${placeholders})
    `, studentIds);
  }

  private async getTopReaders(studentIds: number[], placeholders: string): Promise<any> {
    return db.all(`
      SELECT
        u.id,
        u.displayName,
        u.avatar,
        us.totalBooks,
        us.totalReadingTime,
        us.totalPoints,
        us.level,
        us.consecutiveDays
      FROM users u
      JOIN user_stats us ON u.id = us.userId
      WHERE u.id IN (${placeholders})
      ORDER BY us.totalPoints DESC
      LIMIT 10
    `, studentIds);
  }

  private async getClassActivitySummary(studentIds: number[], placeholders: string): Promise<any> {
    const last7Days = format(subDays(new Date(), 7), 'yyyy-MM-dd');

    return db.all(`
      SELECT
        DATE(c.checkinDate) as date,
        COUNT(DISTINCT c.userId) as activeStudents,
        COUNT(c.id) as totalCheckins,
        SUM(c.readingTime) as totalTime
      FROM checkins c
      WHERE c.userId IN (${placeholders})
        AND c.checkinDate >= ?
      GROUP BY DATE(c.checkinDate)
      ORDER BY date
    `, [...studentIds, last7Days]);
  }

  private async getClassDifficultyDistribution(studentIds: number[], placeholders: string): Promise<any> {
    return db.all(`
      SELECT
        b.difficulty,
        COUNT(c.id) as checkinCount,
        COUNT(DISTINCT c.userId) as studentCount
      FROM checkins c
      JOIN books b ON c.bookId = b.id
      WHERE c.userId IN (${placeholders})
      GROUP BY b.difficulty
      ORDER BY b.difficulty
    `, studentIds);
  }

  // 个人进步分析
  async getProgressAnalysis(userId: number): Promise<any> {
    const [currentMonth, lastMonth, streakAnalysis, readingPatterns] = await Promise.all([
      this.getMonthlyComparison(userId, 0),
      this.getMonthlyComparison(userId, 1),
      this.getStreakAnalysis(userId),
      this.getReadingPatterns(userId)
    ]);

    const improvement = {
      books: currentMonth.uniqueBooks - lastMonth.uniqueBooks,
      time: currentMonth.totalTime - lastMonth.totalTime,
      checkins: currentMonth.totalCheckins - lastMonth.totalCheckins
    };

    return {
      currentMonth,
      lastMonth,
      improvement,
      streakAnalysis,
      readingPatterns
    };
  }

  private async getMonthlyComparison(userId: number, monthsAgo: number): Promise<any> {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - monthsAgo);
    const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');

    return db.get(`
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
  }

  private async getStreakAnalysis(userId: number): Promise<any> {
    const allCheckins = await db.all(`
      SELECT DISTINCT checkinDate
      FROM checkins
      WHERE userId = ?
      ORDER BY checkinDate DESC
    `, [userId]);

    if (allCheckins.length === 0) {
      return { currentStreak: 0, longestStreak: 0, streakHistory: [] };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    const streakHistory: any[] = [];

    const dates = allCheckins.map(c => new Date(c.checkinDate));

    // 计算当前连续天数
    const today = new Date();
    const yesterday = subDays(today, 1);
    const latestDate = dates[0];

    if (format(latestDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ||
        format(latestDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      currentStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const dayDiff = Math.abs((dates[i-1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // 计算历史最长连续天数
    for (let i = 1; i < dates.length; i++) {
      const dayDiff = Math.abs((dates[i-1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      longestStreak,
      totalActiveDays: allCheckins.length
    };
  }

  private async getReadingPatterns(userId: number): Promise<any> {
    // 分析阅读时间偏好（假设创建时间反映阅读时间）
    const timePatterns = await db.all(`
      SELECT
        CASE
          WHEN strftime('%H', createdAt) BETWEEN '06' AND '11' THEN '上午'
          WHEN strftime('%H', createdAt) BETWEEN '12' AND '17' THEN '下午'
          WHEN strftime('%H', createdAt) BETWEEN '18' AND '22' THEN '晚上'
          ELSE '深夜'
        END as timeSlot,
        COUNT(*) as count,
        AVG(readingTime) as avgReadingTime
      FROM checkins
      WHERE userId = ?
      GROUP BY timeSlot
      ORDER BY count DESC
    `, [userId]);

    // 分析周几阅读偏好
    const weekdayPatterns = await db.all(`
      SELECT
        CASE strftime('%w', checkinDate)
          WHEN '0' THEN '周日'
          WHEN '1' THEN '周一'
          WHEN '2' THEN '周二'
          WHEN '3' THEN '周三'
          WHEN '4' THEN '周四'
          WHEN '5' THEN '周五'
          WHEN '6' THEN '周六'
        END as weekday,
        COUNT(*) as count,
        AVG(readingTime) as avgReadingTime
      FROM checkins
      WHERE userId = ?
      GROUP BY strftime('%w', checkinDate)
      ORDER BY strftime('%w', checkinDate)
    `, [userId]);

    return {
      timePatterns,
      weekdayPatterns
    };
  }
}