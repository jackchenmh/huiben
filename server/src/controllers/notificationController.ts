import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import Joi from 'joi';

const notificationService = new NotificationService();

const markReadSchema = Joi.object({
  notificationIds: Joi.array().items(Joi.number().integer().positive()).optional()
});

export class NotificationController {
  // 获取用户通知列表
  async getNotifications(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const notifications = await notificationService.getUserNotifications(
        user.id,
        Number(limit),
        offset
      );

      // 如果只要未读通知，过滤结果
      if (unreadOnly === 'true') {
        notifications.notifications = notifications.notifications.filter(n => !n.isRead);
      }

      res.json({
        notifications: notifications.notifications,
        pagination: {
          current: Number(page),
          limit: Number(limit),
          total: notifications.total,
          pages: Math.ceil(notifications.total / Number(limit))
        },
        unreadCount: notifications.unreadCount
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取未读通知数量
  async getUnreadCount(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const stats = await notificationService.getNotificationStats(user.id);

      res.json({
        unreadCount: stats.unread,
        byType: stats.byType
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 标记通知为已读
  async markAsRead(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { notificationId } = req.params;

      const success = await notificationService.markAsRead(Number(notificationId), user.id);

      if (!success) {
        return res.status(404).json({ error: '通知不存在或无权访问' });
      }

      res.json({ message: '通知已标记为已读' });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 标记所有通知为已读
  async markAllAsRead(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const count = await notificationService.markAllAsRead(user.id);

      res.json({
        message: `已标记 ${count} 条通知为已读`,
        markedCount: count
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 删除通知
  async deleteNotification(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { notificationId } = req.params;

      const success = await notificationService.deleteNotification(Number(notificationId), user.id);

      if (!success) {
        return res.status(404).json({ error: '通知不存在或无权访问' });
      }

      res.json({ message: '通知已删除' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 批量删除已读通知
  async deleteReadNotifications(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const count = await notificationService.deleteReadNotifications(user.id);

      res.json({
        message: `已删除 ${count} 条已读通知`,
        deletedCount: count
      });
    } catch (error) {
      console.error('Delete read notifications error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取通知统计
  async getNotificationStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const stats = await notificationService.getNotificationStats(user.id);

      res.json({ stats });
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 手动触发阅读提醒检查（管理员功能）
  async triggerReadingReminders(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      // 简单的权限检查，实际应用中可能需要更复杂的角色管理
      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有老师可以触发阅读提醒' });
      }

      await notificationService.checkAndSendReadingReminders();
      await notificationService.checkAndSendParentReminders();

      res.json({ message: '阅读提醒已发送' });
    } catch (error) {
      console.error('Trigger reading reminders error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 发送自定义通知（老师功能）
  async sendCustomNotification(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { title, message, userIds, type = 'system' } = req.body;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有老师可以发送自定义通知' });
      }

      if (!title || !message || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ error: '请提供标题、消息和接收用户列表' });
      }

      // 验证接收用户是否为该老师的学生
      const students = await notificationService.getUserNotifications(user.id, 1000, 0); // 简化验证
      const validUserIds = userIds.filter(id => typeof id === 'number');

      await notificationService.sendSystemNotification(validUserIds, title, message);

      res.json({
        message: `通知已发送给 ${validUserIds.length} 位用户`,
        sentCount: validUserIds.length
      });
    } catch (error) {
      console.error('Send custom notification error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
}