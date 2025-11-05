import { Router } from 'express';
import { GameController } from '../controllers/gameController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const gameController = new GameController();

router.get('/stats', authenticateToken, gameController.getUserStats.bind(gameController));
router.get('/badges', authenticateToken, gameController.getUserBadges.bind(gameController));
router.get('/badges/all', authenticateToken, gameController.getAllBadges.bind(gameController));
router.get('/badges/:badgeId/progress', authenticateToken, gameController.getBadgeProgress.bind(gameController));
router.post('/badges/check', authenticateToken, gameController.checkBadgeProgress.bind(gameController));

router.get('/leaderboard', authenticateToken, gameController.getLeaderboard.bind(gameController));
router.get('/rank', authenticateToken, gameController.getUserRank.bind(gameController));

router.get('/points/history', authenticateToken, gameController.getPointsHistory.bind(gameController));
router.get('/level', authenticateToken, gameController.getLevelInfo.bind(gameController));
router.post('/level/check', authenticateToken, gameController.checkLevelUp.bind(gameController));

router.get('/dashboard', authenticateToken, gameController.getDashboard.bind(gameController));
router.get('/monthly/:year/:month', authenticateToken, gameController.getMonthlyStats.bind(gameController));

// 新增的游戏化功能端点
router.get('/challenge/daily', authenticateToken, gameController.getDailyChallenge.bind(gameController));
router.post('/challenge/daily/complete', authenticateToken, gameController.completeDailyChallenge.bind(gameController));

router.get('/stats/weekly', authenticateToken, gameController.getWeeklyStats.bind(gameController));
router.get('/recommendations', authenticateToken, gameController.getPersonalizedRecommendations.bind(gameController));

export default router;