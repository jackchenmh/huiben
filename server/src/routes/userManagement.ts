import express from 'express';
import { UserManagementController } from '../controllers/userManagementController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const userManagementController = new UserManagementController();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取我的孩子/学生列表
router.get('/my-children', (req, res) => userManagementController.getMyChildren(req, res));

// 获取我的监护人列表（孩子用户）
router.get('/my-parents', (req, res) => userManagementController.getMyParents(req, res));

// 搜索用户
router.get('/search', (req, res) => userManagementController.searchUsers(req, res));

// 获取用户详细信息
router.get('/details/:userId', (req, res) => userManagementController.getUserDetails(req, res));

// 添加孩子关系
router.post('/add-child', (req, res) => userManagementController.addChild(req, res));

// 移除孩子关系
router.delete('/remove-child/:childId', (req, res) => userManagementController.removeChild(req, res));

// 批量添加孩子（老师功能）
router.post('/batch-add-children', (req, res) => userManagementController.batchAddChildren(req, res));

export default router;