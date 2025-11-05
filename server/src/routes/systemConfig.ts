import express from 'express';
import { SystemConfigController } from '../controllers/systemConfigController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const systemConfigController = new SystemConfigController();

// 公开配置（无需认证）
router.get('/public', (req, res) => systemConfigController.getPublicConfigs(req, res));

// 需要认证的路由
router.use(authenticateToken);

// 获取所有配置（管理员）
router.get('/', (req, res) => systemConfigController.getAllConfigs(req, res));

// 根据分类获取配置（管理员）
router.get('/category/:category', (req, res) => systemConfigController.getConfigsByCategory(req, res));

// 获取单个配置
router.get('/:key', (req, res) => systemConfigController.getConfig(req, res));

// 获取配置值
router.get('/:key/value', (req, res) => systemConfigController.getConfigValue(req, res));

// 设置配置（管理员）
router.post('/', (req, res) => systemConfigController.setConfig(req, res));

// 批量更新配置（管理员）
router.patch('/batch', (req, res) => systemConfigController.updateConfigs(req, res));

// 删除配置（管理员）
router.delete('/:key', (req, res) => systemConfigController.deleteConfig(req, res));

// 重置为默认配置（管理员）
router.post('/reset', (req, res) => systemConfigController.resetToDefaults(req, res));

// 导出配置（管理员）
router.get('/admin/export', (req, res) => systemConfigController.exportConfigs(req, res));

// 导入配置（管理员）
router.post('/admin/import', (req, res) => systemConfigController.importConfigs(req, res));

// 获取系统信息（管理员）
router.get('/admin/system-info', (req, res) => systemConfigController.getSystemInfo(req, res));

export default router;