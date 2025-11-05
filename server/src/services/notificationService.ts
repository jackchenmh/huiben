import { db } from '../database';

export interface Notification {
  id?: number;
  userId: number;
  type: 'system' | 'reminder' | 'achievement' | 'social';
  title: string;
  message: string;
  isRead?: boolean;
  relatedId?: number;
  relatedType?: string;
  createdAt?: string;
}

export class NotificationService {
  // 创建通知
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<number> {
    const result = await db.run(
      `INSERT INTO notifications (userId, type, title, message, relatedId, relatedType)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
      ]
    );

    return result.lastID;
  }

  // 获取用户的通知列表
  async getUserNotifications(userId: number, limit: number = 20, offset: number = 0): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const [notifications, total, unreadCount] = await Promise.all([
      db.all(
        `SELECT * FROM notifications
         WHERE userId = ?
         ORDER BY createdAt DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      ),
      db.get('SELECT COUNT(*) as count FROM notifications WHERE userId = ?', [userId]),
      db.get('SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = FALSE', [userId])
    ]);

    return {
      notifications,
      total: total.count,
      unreadCount: unreadCount.count
    };
  }

  // 标记通知为已读
  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await db.run(
      'UPDATE notifications SET isRead = TRUE WHERE id = ? AND userId = ?',
      [notificationId, userId]
    );

    return result.changes > 0;
  }

  // 标记所有通知为已读
  async markAllAsRead(userId: number): Promise<number> {
    const result = await db.run(
      'UPDATE notifications SET isRead = TRUE WHERE userId = ? AND isRead = FALSE',
      [userId]
    );

    return result.changes;
  }

  // 删除通知
  async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    const result = await db.run(
      'DELETE FROM notifications WHERE id = ? AND userId = ?',
      [notificationId, userId]
    );

    return result.changes > 0;
  }

  // 批量删除已读通知
  async deleteReadNotifications(userId: number): Promise<number> {
    const result = await db.run(
      'DELETE FROM notifications WHERE userId = ? AND isRead = TRUE',
      [userId]
    );

    return result.changes;
  }

  // 系统通知相关方法
  async sendSystemNotification(userIds: number[], title: string, message: string): Promise<void> {
    for (const userId of userIds) {
      await this.createNotification({
        userId,
        type: 'system',
        title,
        message
      });
    }
  }

  // 发送成就通知
  async sendAchievementNotification(userId: number, achievementType: string, achievementName: string, points?: number): Promise<void> {
    let title = '';
    let message = '';

    switch (achievementType) {
      case 'badge':
        title = '🏆 获得新徽章！';
        message = `恭喜你获得了"${achievementName}"徽章！`;
        if (points) {
          message += `获得 ${points} 积分奖励！`;
        }
        break;
      case 'level_up':
        title = '🎉 等级提升！';
        message = `恭喜你升级到 ${achievementName}！继续加油！`;
        break;
      case 'streak':
        title = '🔥 连续阅读成就！';
        message = `太棒了！你已经连续阅读 ${achievementName} 天了！`;
        break;
      default:
        title = '🌟 新成就解锁！';
        message = `恭喜你达成了新成就：${achievementName}！`;
    }

    await this.createNotification({
      userId,
      type: 'achievement',
      title,
      message,
      relatedType: achievementType
    });
  }

  // 发送阅读提醒
  async sendReadingReminder(userId: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'reminder',
      title: '📚 该读书啦！',
      message: '今天还没有阅读打卡呢，快来选择一本喜欢的绘本开始阅读吧！'
    });
  }

  // 发送家长提醒
  async sendParentReminder(parentId: number, childName: string, days: number): Promise<void> {
    await this.createNotification({
      userId: parentId,
      type: 'reminder',
      title: '👨‍👩‍👧‍👦 孩子阅读提醒',
      message: `${childName} 已经 ${days} 天没有阅读打卡了，请督促孩子保持阅读习惯。`
    });
  }

  // 发送社交通知（评论、点赞等）
  async sendSocialNotification(userId: number, type: 'comment' | 'like', fromUserName: string, content?: string): Promise<void> {
    let title = '';
    let message = '';

    switch (type) {
      case 'comment':
        title = '💬 收到新评论';
        message = `${fromUserName} 评论了你的阅读记录：${content}`;
        break;
      case 'like':
        title = '👍 收到点赞';
        message = `${fromUserName} 为你的阅读记录点赞了！`;
        break;
    }

    await this.createNotification({
      userId,
      type: 'social',
      title,
      message
    });
  }

  // 定时任务：检查并发送阅读提醒
  async checkAndSendReadingReminders(): Promise<void> {
    // 查找今天没有打卡的活跃用户
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const inactiveUsers = await db.all(`
      SELECT DISTINCT u.id, u.displayName
      FROM users u
      LEFT JOIN checkins c ON u.id = c.userId AND c.checkinDate = ?
      WHERE u.role = 'child'
        AND c.id IS NULL
        AND EXISTS (
          SELECT 1 FROM checkins c2
          WHERE c2.userId = u.id
          AND c2.checkinDate >= ?
        )
    `, [today, yesterdayStr]);

    for (const user of inactiveUsers) {
      // 检查是否已经发送过今天的提醒
      const existingReminder = await db.get(
        `SELECT id FROM notifications
         WHERE userId = ? AND type = 'reminder'
         AND DATE(createdAt) = ?
         AND title LIKE '%该读书啦%'`,
        [user.id, today]
      );

      if (!existingReminder) {
        await this.sendReadingReminder(user.id);
      }
    }
  }

  // 定时任务：检查并发送家长提醒
  async checkAndSendParentReminders(): Promise<void> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    // 查找3天没有打卡的孩子及其家长
    const inactiveChildren = await db.all(`
      SELECT
        u.id as childId,
        u.displayName as childName,
        p.id as parentId,
        MAX(c.checkinDate) as lastCheckin
      FROM users u
      JOIN user_relationships ur ON u.id = ur.childId
      JOIN users p ON ur.parentId = p.id
      LEFT JOIN checkins c ON u.id = c.userId
      WHERE u.role = 'child'
        AND ur.relationshipType = 'parent-child'
        AND (c.checkinDate IS NULL OR c.checkinDate < ?)
      GROUP BY u.id, p.id
      HAVING MAX(c.checkinDate) < ? OR MAX(c.checkinDate) IS NULL
    `, [threeDaysAgoStr, threeDaysAgoStr]);

    for (const child of inactiveChildren) {
      const today = new Date().toISOString().split('T')[0];

      // 检查是否已经发送过今天的家长提醒
      const existingReminder = await db.get(
        `SELECT id FROM notifications
         WHERE userId = ? AND type = 'reminder'
         AND DATE(createdAt) = ?
         AND title LIKE '%孩子阅读提醒%'`,
        [child.parentId, today]
      );

      if (!existingReminder) {
        const daysSinceLastCheckin = child.lastCheckin ?
          Math.floor((Date.now() - new Date(child.lastCheckin).getTime()) / (1000 * 60 * 60 * 24)) :
          7; // 如果从未打卡，默认为7天

        await this.sendParentReminder(child.parentId, child.childName, daysSinceLastCheckin);
      }
    }
  }

  // 清理旧通知（定时任务）
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString();

    const result = await db.run(
      'DELETE FROM notifications WHERE createdAt < ?',
      [cutoffDateStr]
    );

    return result.changes;
  }

  // 获取通知统计
  async getNotificationStats(userId: number): Promise<{
    total: number;
    unread: number;
    byType: Array<{ type: string; count: number }>;
  }> {
    const [total, unread, byType] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM notifications WHERE userId = ?', [userId]),
      db.get('SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = FALSE', [userId]),
      db.all(`
        SELECT type, COUNT(*) as count
        FROM notifications
        WHERE userId = ? AND isRead = FALSE
        GROUP BY type
      `, [userId])
    ]);

    return {
      total: total.count,
      unread: unread.count,
      byType
    };
  }
}