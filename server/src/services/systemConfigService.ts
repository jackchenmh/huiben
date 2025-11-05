import { db } from '../database';

export interface SystemConfig {
  id?: number;
  key: string;
  value: string;
  description?: string;
  category: 'system' | 'notification' | 'game' | 'security' | 'ui';
  dataType: 'string' | 'number' | 'boolean' | 'json';
  isPublic: boolean;
  updatedAt?: string;
}

export class SystemConfigService {
  // 获取所有配置
  async getAllConfigs(): Promise<SystemConfig[]> {
    return db.all('SELECT * FROM system_configs ORDER BY category, key');
  }

  // 获取公开配置（前端可访问）
  async getPublicConfigs(): Promise<SystemConfig[]> {
    return db.all('SELECT * FROM system_configs WHERE isPublic = TRUE ORDER BY category, key');
  }

  // 根据分类获取配置
  async getConfigsByCategory(category: string): Promise<SystemConfig[]> {
    return db.all('SELECT * FROM system_configs WHERE category = ? ORDER BY key', [category]);
  }

  // 获取单个配置
  async getConfig(key: string): Promise<SystemConfig | null> {
    return db.get('SELECT * FROM system_configs WHERE key = ?', [key]);
  }

  // 获取配置值（解析数据类型）
  async getConfigValue(key: string): Promise<any> {
    const config = await this.getConfig(key);
    if (!config) return null;

    return this.parseConfigValue(config.value, config.dataType);
  }

  // 设置配置
  async setConfig(key: string, value: any, options?: {
    description?: string;
    category?: string;
    dataType?: string;
    isPublic?: boolean;
  }): Promise<void> {
    const stringValue = this.stringifyConfigValue(value, options?.dataType || 'string');

    const existingConfig = await this.getConfig(key);

    if (existingConfig) {
      await db.run(
        `UPDATE system_configs
         SET value = ?, description = COALESCE(?, description), updatedAt = CURRENT_TIMESTAMP
         WHERE key = ?`,
        [stringValue, options?.description, key]
      );
    } else {
      await db.run(
        `INSERT INTO system_configs (key, value, description, category, dataType, isPublic)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          key,
          stringValue,
          options?.description || '',
          options?.category || 'system',
          options?.dataType || 'string',
          options?.isPublic || false
        ]
      );
    }
  }

  // 批量更新配置
  async updateConfigs(configs: Array<{ key: string; value: any }>): Promise<void> {
    for (const config of configs) {
      const existingConfig = await this.getConfig(config.key);
      if (existingConfig) {
        const stringValue = this.stringifyConfigValue(config.value, existingConfig.dataType);
        await db.run(
          'UPDATE system_configs SET value = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?',
          [stringValue, config.key]
        );
      }
    }
  }

  // 删除配置
  async deleteConfig(key: string): Promise<boolean> {
    const result = await db.run('DELETE FROM system_configs WHERE key = ?', [key]);
    return result.changes > 0;
  }

  // 初始化默认配置
  async initializeDefaultConfigs(): Promise<void> {
    const defaultConfigs: Omit<SystemConfig, 'id' | 'updatedAt'>[] = [
      // 系统配置
      {
        key: 'app.name',
        value: '悦读之旅打卡系统',
        description: '应用程序名称',
        category: 'system',
        dataType: 'string',
        isPublic: true
      },
      {
        key: 'app.version',
        value: '1.0.0',
        description: '应用程序版本',
        category: 'system',
        dataType: 'string',
        isPublic: true
      },
      {
        key: 'app.maintenance_mode',
        value: 'false',
        description: '维护模式开关',
        category: 'system',
        dataType: 'boolean',
        isPublic: true
      },

      // 通知配置
      {
        key: 'notification.daily_reminder_hour',
        value: '20',
        description: '每日阅读提醒时间（小时）',
        category: 'notification',
        dataType: 'number',
        isPublic: false
      },
      {
        key: 'notification.parent_reminder_hour',
        value: '9',
        description: '家长提醒时间（小时）',
        category: 'notification',
        dataType: 'number',
        isPublic: false
      },
      {
        key: 'notification.cleanup_days',
        value: '30',
        description: '通知清理保留天数',
        category: 'notification',
        dataType: 'number',
        isPublic: false
      },
      {
        key: 'notification.enable_push',
        value: 'true',
        description: '启用推送通知',
        category: 'notification',
        dataType: 'boolean',
        isPublic: true
      },

      // 游戏化配置
      {
        key: 'game.daily_challenge_target',
        value: '30',
        description: '每日挑战阅读时间目标（分钟）',
        category: 'game',
        dataType: 'number',
        isPublic: true
      },
      {
        key: 'game.daily_challenge_reward',
        value: '50',
        description: '每日挑战奖励积分',
        category: 'game',
        dataType: 'number',
        isPublic: true
      },
      {
        key: 'game.level_up_books',
        value: '10',
        description: '升级所需书籍数量',
        category: 'game',
        dataType: 'number',
        isPublic: true
      },
      {
        key: 'game.streak_bonus_interval',
        value: '7',
        description: '连续阅读奖励间隔天数',
        category: 'game',
        dataType: 'number',
        isPublic: true
      },
      {
        key: 'game.streak_bonus_points',
        value: '25',
        description: '连续阅读奖励积分',
        category: 'game',
        dataType: 'number',
        isPublic: true
      },

      // 安全配置
      {
        key: 'security.jwt_secret',
        value: 'your-secret-key-change-in-production',
        description: 'JWT密钥',
        category: 'security',
        dataType: 'string',
        isPublic: false
      },
      {
        key: 'security.token_expiry',
        value: '7d',
        description: 'Token过期时间',
        category: 'security',
        dataType: 'string',
        isPublic: false
      },
      {
        key: 'security.rate_limit_window',
        value: '900000',
        description: '速率限制时间窗口（毫秒）',
        category: 'security',
        dataType: 'number',
        isPublic: false
      },
      {
        key: 'security.rate_limit_max',
        value: '100',
        description: '速率限制最大请求数',
        category: 'security',
        dataType: 'number',
        isPublic: false
      },

      // UI配置
      {
        key: 'ui.theme',
        value: 'default',
        description: '默认主题',
        category: 'ui',
        dataType: 'string',
        isPublic: true
      },
      {
        key: 'ui.items_per_page',
        value: '20',
        description: '每页显示项目数',
        category: 'ui',
        dataType: 'number',
        isPublic: true
      },
      {
        key: 'ui.language',
        value: 'zh-CN',
        description: '默认语言',
        category: 'ui',
        dataType: 'string',
        isPublic: true
      },
      {
        key: 'ui.enable_animations',
        value: 'true',
        description: '启用动画效果',
        category: 'ui',
        dataType: 'boolean',
        isPublic: true
      }
    ];

    for (const config of defaultConfigs) {
      const existing = await this.getConfig(config.key);
      if (!existing) {
        await db.run(
          `INSERT INTO system_configs (key, value, description, category, dataType, isPublic)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [config.key, config.value, config.description, config.category, config.dataType, config.isPublic]
        );
      }
    }
  }

  // 解析配置值
  private parseConfigValue(value: string, dataType: string): any {
    switch (dataType) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      default:
        return value;
    }
  }

  // 将值转换为字符串
  private stringifyConfigValue(value: any, dataType: string): string {
    switch (dataType) {
      case 'json':
        return JSON.stringify(value);
      case 'boolean':
        return value ? 'true' : 'false';
      default:
        return String(value);
    }
  }

  // 验证配置值
  async validateConfig(key: string, value: any): Promise<{ valid: boolean; error?: string }> {
    const config = await this.getConfig(key);
    if (!config) {
      return { valid: false, error: '配置项不存在' };
    }

    try {
      switch (config.dataType) {
        case 'number':
          if (isNaN(Number(value))) {
            return { valid: false, error: '必须是有效的数字' };
          }
          break;
        case 'boolean':
          if (value !== true && value !== false && value !== 'true' && value !== 'false') {
            return { valid: false, error: '必须是布尔值' };
          }
          break;
        case 'json':
          if (typeof value === 'string') {
            JSON.parse(value); // 会抛出异常如果不是有效JSON
          }
          break;
      }

      // 特定配置项的验证
      if (key === 'notification.daily_reminder_hour') {
        const hour = Number(value);
        if (hour < 0 || hour > 23) {
          return { valid: false, error: '小时必须在0-23之间' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: '值格式不正确' };
    }
  }

  // 重置配置为默认值
  async resetToDefaults(): Promise<void> {
    await db.run('DELETE FROM system_configs');
    await this.initializeDefaultConfigs();
  }

  // 导出配置
  async exportConfigs(): Promise<SystemConfig[]> {
    return this.getAllConfigs();
  }

  // 导入配置
  async importConfigs(configs: SystemConfig[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const config of configs) {
      try {
        await this.setConfig(config.key, config.value, {
          description: config.description,
          category: config.category,
          dataType: config.dataType,
          isPublic: config.isPublic
        });
        success++;
      } catch (error) {
        failed++;
        console.error(`Failed to import config ${config.key}:`, error);
      }
    }

    return { success, failed };
  }
}