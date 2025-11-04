import { Router } from 'express';
import { BookController } from '../controllers/bookController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();
const bookController = new BookController();

router.get('/', authenticateToken, bookController.getAllBooks.bind(bookController));
router.get('/popular', authenticateToken, bookController.getPopularBooks.bind(bookController));
router.get('/recommended', authenticateToken, bookController.getRecommendedBooks.bind(bookController));
router.get('/search', authenticateToken, bookController.searchBooks.bind(bookController));
router.get('/age-group/:ageGroup', authenticateToken, bookController.getBooksByAgeGroup.bind(bookController));
router.get('/:id', authenticateToken, bookController.getBookById.bind(bookController));

router.post('/', authenticateToken, authorizeRoles('teacher'), bookController.createBook.bind(bookController));
router.put('/:id', authenticateToken, authorizeRoles('teacher'), bookController.updateBook.bind(bookController));
router.delete('/:id', authenticateToken, authorizeRoles('teacher'), bookController.deleteBook.bind(bookController));

export default router;