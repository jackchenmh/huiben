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
}