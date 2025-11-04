import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

router.get('/dashboard', authenticateToken, analyticsController.getDashboard.bind(analyticsController));
router.get('/trends', authenticateToken, analyticsController.getReadingTrends.bind(analyticsController));
router.get('/heatmap', authenticateToken, analyticsController.getReadingHeatmap.bind(analyticsController));
router.get('/age-groups', authenticateToken, analyticsController.getAgeGroupStats.bind(analyticsController));
router.get('/difficulty', authenticateToken, analyticsController.getDifficultyProgress.bind(analyticsController));
router.get('/global', analyticsController.getGlobalStats.bind(analyticsController));

export default router;