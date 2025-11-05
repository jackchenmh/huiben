import { Request, Response } from 'express';
import { SystemConfigService } from '../services/systemConfigService';
import Joi from 'joi';

const systemConfigService = new SystemConfigService();

const configSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.any().required(),
  description: Joi.string().optional(),
  category: Joi.string().valid('system', 'notification', 'game', 'security', 'ui').optional(),
  dataType: Joi.string().valid('string', 'number', 'boolean', 'json').optional(),
  isPublic: Joi.boolean().optional()
});

const batchUpdateSchema = Joi.object({
  configs: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      value: Joi.any().required()
    })
  ).required()
});

export class SystemConfigController {
  // 获取所有配置（管理员）
  async getAllConfigs(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以查看所有配置' });
      }

      const configs = await systemConfigService.getAllConfigs();
      res.json({ configs });
    } catch (error) {
      console.error('Get all configs error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取公开配置
  async getPublicConfigs(req: Request, res: Response) {
    try {
      const configs = await systemConfigService.getPublicConfigs();
      res.json({ configs });
    } catch (error) {
      console.error('Get public configs error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 根据分类获取配置
  async getConfigsByCategory(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { category } = req.params;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以查看配置' });
      }

      const configs = await systemConfigService.getConfigsByCategory(category);
      res.json({ configs });
    } catch (error) {
      console.error('Get configs by category error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取单个配置
  async getConfig(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const user = (req as any).user;

      const config = await systemConfigService.getConfig(key);
      if (!config) {
        return res.status(404).json({ error: '配置不存在' });
      }

      // 检查权限：非公开配置需要管理员权限
      if (!config.isPublic && user.role !== 'teacher') {
        return res.status(403).json({ error: '无权访问此配置' });
      }

      res.json({ config });
    } catch (error) {
      console.error('Get config error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取配置值
  async getConfigValue(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const user = (req as any).user;

      const config = await systemConfigService.getConfig(key);
      if (!config) {
        return res.status(404).json({ error: '配置不存在' });
      }

      // 检查权限：非公开配置需要管理员权限
      if (!config.isPublic && user.role !== 'teacher') {
        return res.status(403).json({ error: '无权访问此配置' });
      }

      const value = await systemConfigService.getConfigValue(key);
      res.json({ value });
    } catch (error) {
      console.error('Get config value error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 设置配置（管理员）
  async setConfig(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以修改配置' });
      }

      const { error, value } = configSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // 验证配置值
      const validation = await systemConfigService.validateConfig(value.key, value.value);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      await systemConfigService.setConfig(value.key, value.value, {
        description: value.description,
        category: value.category,
        dataType: value.dataType,
        isPublic: value.isPublic
      });

      res.json({ message: '配置设置成功' });
    } catch (error) {
      console.error('Set config error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 批量更新配置（管理员）
  async updateConfigs(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以修改配置' });
      }

      const { error, value } = batchUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // 验证所有配置值
      for (const config of value.configs) {
        const validation = await systemConfigService.validateConfig(config.key, config.value);
        if (!validation.valid) {
          return res.status(400).json({
            error: `配置 ${config.key} 验证失败: ${validation.error}`
          });
        }
      }

      await systemConfigService.updateConfigs(value.configs);

      res.json({
        message: '配置批量更新成功',
        updated: value.configs.length
      });
    } catch (error) {
      console.error('Update configs error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 删除配置（管理员）
  async deleteConfig(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { key } = req.params;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以删除配置' });
      }

      // 防止删除关键系统配置
      const protectedKeys = [
        'app.name',
        'app.version',
        'security.jwt_secret',
        'security.token_expiry'
      ];

      if (protectedKeys.includes(key)) {
        return res.status(400).json({ error: '此配置受保护，无法删除' });
      }

      const success = await systemConfigService.deleteConfig(key);
      if (!success) {
        return res.status(404).json({ error: '配置不存在' });
      }

      res.json({ message: '配置删除成功' });
    } catch (error) {
      console.error('Delete config error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 重置为默认配置（管理员）
  async resetToDefaults(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以重置配置' });
      }

      await systemConfigService.resetToDefaults();

      res.json({ message: '配置已重置为默认值' });
    } catch (error) {
      console.error('Reset configs error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 导出配置（管理员）
  async exportConfigs(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以导出配置' });
      }

      const configs = await systemConfigService.exportConfigs();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="system-configs.json"');
      res.json({ configs, exportedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Export configs error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 导入配置（管理员）
  async importConfigs(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以导入配置' });
      }

      const { configs } = req.body;

      if (!Array.isArray(configs)) {
        return res.status(400).json({ error: '配置数据格式不正确' });
      }

      const result = await systemConfigService.importConfigs(configs);

      res.json({
        message: '配置导入完成',
        result: {
          success: result.success,
          failed: result.failed,
          total: configs.length
        }
      });
    } catch (error) {
      console.error('Import configs error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取系统信息（管理员）
  async getSystemInfo(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有管理员可以查看系统信息' });
      }

      const [appName, appVersion, maintenanceMode] = await Promise.all([
        systemConfigService.getConfigValue('app.name'),
        systemConfigService.getConfigValue('app.version'),
        systemConfigService.getConfigValue('app.maintenance_mode')
      ]);

      const systemInfo = {
        app: {
          name: appName,
          version: appVersion,
          maintenanceMode
        },
        server: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        },
        database: {
          type: 'SQLite',
          path: process.env.DB_PATH || './data/reading_journey.db'
        }
      };

      res.json({ systemInfo });
    } catch (error) {
      console.error('Get system info error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
}