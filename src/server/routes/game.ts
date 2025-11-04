import { Router } from 'express';
import { GameController } from '../controllers/gameController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const gameController = new GameController();

router.get('/stats', authenticateToken, gameController.getUserStats.bind(gameController));
router.get('/badges', authenticateToken, gameController.getUserBadges.bind(gameController));
router.get('/badges/all', authenticateToken, gameController.getAllBadges.bind(gameController));
router.get('/badges/:badgeId/progress', authenticateToken, gameController.getBadgeProgress.bind(gameController));

router.get('/leaderboard', authenticateToken, gameController.getLeaderboard.bind(gameController));
router.get('/rank', authenticateToken, gameController.getUserRank.bind(gameController));

router.get('/points/history', authenticateToken, gameController.getPointsHistory.bind(gameController));
router.get('/level', authenticateToken, gameController.getLevelInfo.bind(gameController));

router.get('/dashboard', authenticateToken, gameController.getDashboard.bind(gameController));
router.get('/monthly/:year/:month', authenticateToken, gameController.getMonthlyStats.bind(gameController));

export default router;