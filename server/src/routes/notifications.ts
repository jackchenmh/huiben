import express from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const notificationController = new NotificationController();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取通知列表
router.get('/', (req, res) => notificationController.getNotifications(req, res));

// 获取未读通知数量
router.get('/unread-count', (req, res) => notificationController.getUnreadCount(req, res));

// 获取通知统计
router.get('/stats', (req, res) => notificationController.getNotificationStats(req, res));

// 标记单个通知为已读
router.patch('/:notificationId/read', (req, res) => notificationController.markAsRead(req, res));

// 标记所有通知为已读
router.patch('/mark-all-read', (req, res) => notificationController.markAllAsRead(req, res));

// 删除单个通知
router.delete('/:notificationId', (req, res) => notificationController.deleteNotification(req, res));

// 批量删除已读通知
router.delete('/read-notifications', (req, res) => notificationController.deleteReadNotifications(req, res));

// 管理员功能：手动触发阅读提醒
router.post('/trigger-reminders', (req, res) => notificationController.triggerReadingReminders(req, res));

// 老师功能：发送自定义通知
router.post('/send-custom', (req, res) => notificationController.sendCustomNotification(req, res));

export default router;