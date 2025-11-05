import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// 个人分析
router.get('/dashboard', authenticateToken, analyticsController.getDashboard.bind(analyticsController));
router.get('/trends', authenticateToken, analyticsController.getReadingTrends.bind(analyticsController));
router.get('/heatmap', authenticateToken, analyticsController.getReadingHeatmap.bind(analyticsController));
router.get('/age-groups', authenticateToken, analyticsController.getAgeGroupStats.bind(analyticsController));
router.get('/difficulty', authenticateToken, analyticsController.getDifficultyProgress.bind(analyticsController));
router.get('/progress', authenticateToken, analyticsController.getProgressAnalysis.bind(analyticsController));

// 家长/老师查看孩子的分析
router.get('/child/:childId', authenticateToken, analyticsController.getChildAnalytics.bind(analyticsController));
router.get('/child/:childId/progress', authenticateToken, analyticsController.getChildProgressAnalysis.bind(analyticsController));

// 班级分析（老师功能）
router.get('/class', authenticateToken, analyticsController.getClassAnalytics.bind(analyticsController));

// 全局统计（公开）
router.get('/global', analyticsController.getGlobalStats.bind(analyticsController));

export default router;