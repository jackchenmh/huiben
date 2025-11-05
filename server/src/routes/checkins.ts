import { Router } from 'express';
import { CheckInController } from '../controllers/checkinController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();
const checkinController = new CheckInController();

router.get('/', authenticateToken, checkinController.getUserCheckIns.bind(checkinController));
router.get('/today', authenticateToken, checkinController.getTodayCheckIn.bind(checkinController));
router.get('/streak', authenticateToken, checkinController.getCheckInStreak.bind(checkinController));
router.get('/calendar/:year/:month', authenticateToken, checkinController.getReadingCalendar.bind(checkinController));

router.post('/', authenticateToken, checkinController.createCheckIn.bind(checkinController));
router.put('/:id', authenticateToken, checkinController.updateCheckIn.bind(checkinController));
router.delete('/:id', authenticateToken, checkinController.deleteCheckIn.bind(checkinController));

router.post('/:id/comment', authenticateToken, authorizeRoles('parent', 'teacher'), checkinController.addComment.bind(checkinController));

export default router;