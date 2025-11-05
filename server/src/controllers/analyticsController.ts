import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getDashboard(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const dashboard = await analyticsService.getDashboardData(user.id);

      res.json({ dashboard });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getReadingTrends(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { days = 30 } = req.query;

      const trends = await analyticsService.getReadingTrends(user.id, Number(days));

      res.json({ trends });
    } catch (error) {
      console.error('Get reading trends error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getReadingHeatmap(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { year = new Date().getFullYear() } = req.query;

      const heatmap = await analyticsService.getReadingHeatmap(user.id, Number(year));

      res.json({ heatmap });
    } catch (error) {
      console.error('Get reading heatmap error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getAgeGroupStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const stats = await analyticsService.getAgeGroupStats(user.id);

      res.json({ stats });
    } catch (error) {
      console.error('Get age group stats error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getDifficultyProgress(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const progress = await analyticsService.getDifficultyProgress(user.id);

      res.json({ progress });
    } catch (error) {
      console.error('Get difficulty progress error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getGlobalStats(req: Request, res: Response) {
    try {
      const stats = await analyticsService.getGlobalStats();

      res.json({ stats });
    } catch (error) {
      console.error('Get global stats error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 新增：家长/老师查看孩子的分析数据
  async getChildAnalytics(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { childId } = req.params;

      if (!['parent', 'teacher'].includes(user.role)) {
        return res.status(403).json({ error: '只有家长和老师可以查看孩子的分析数据' });
      }

      const analytics = await analyticsService.getChildAnalytics(
        Number(childId),
        user.id,
        user.role
      );

      res.json({ analytics });
    } catch (error) {
      console.error('Get child analytics error:', error);
      if (error instanceof Error && error.message === '无权访问该孩子的数据') {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: '服务器内部错误' });
      }
    }
  }

  // 班级分析（老师功能）
  async getClassAnalytics(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有老师可以查看班级分析' });
      }

      const analytics = await analyticsService.getClassAnalytics(user.id);

      res.json({ analytics });
    } catch (error) {
      console.error('Get class analytics error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 个人进步分析
  async getProgressAnalysis(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const analysis = await analyticsService.getProgressAnalysis(user.id);

      res.json({ analysis });
    } catch (error) {
      console.error('Get progress analysis error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取特定孩子的进步分析（家长/老师查看）
  async getChildProgressAnalysis(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { childId } = req.params;

      if (!['parent', 'teacher'].includes(user.role)) {
        return res.status(403).json({ error: '只有家长和老师可以查看孩子的进步分析' });
      }

      // 验证权限
      const hasPermission = await this.verifyChildAccess(Number(childId), user.id, user.role);
      if (!hasPermission) {
        return res.status(403).json({ error: '无权访问该孩子的数据' });
      }

      const analysis = await analyticsService.getProgressAnalysis(Number(childId));

      res.json({ analysis });
    } catch (error) {
      console.error('Get child progress analysis error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  private async verifyChildAccess(childId: number, parentId: number, userRole: string): Promise<boolean> {
    try {
      await analyticsService.getChildAnalytics(childId, parentId, userRole);
      return true;
    } catch (error) {
      return false;
    }
  }
}