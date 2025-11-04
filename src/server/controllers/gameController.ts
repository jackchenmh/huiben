import { Request, Response } from 'express';
import { GameService } from '../services/gameService';

const gameService = new GameService();

export class GameController {
  async getUserStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const stats = await gameService.getUserStats(user.id);

      if (!stats) {
        return res.status(404).json({ error: '用户统计数据不存在' });
      }

      const rank = await gameService.getUserRank(user.id, 'points');

      res.json({
        stats: {
          ...stats,
          rank
        }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getUserBadges(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const badges = await gameService.getUserBadges(user.id);
      const availableBadges = await gameService.getAvailableBadges(user.id);

      const badgeProgress = await Promise.all(
        availableBadges.map(async (badge) => {
          const progress = await gameService.getBadgeProgress(user.id, badge.id);
          return {
            ...badge,
            progress
          };
        })
      );

      res.json({
        earnedBadges: badges,
        availableBadges: badgeProgress
      });
    } catch (error) {
      console.error('Get user badges error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getLeaderboard(req: Request, res: Response) {
    try {
      const { type = 'points', limit = 20 } = req.query;
      const leaderboard = await gameService.getLeaderboard(
        type as 'points' | 'books' | 'streak',
        Number(limit)
      );

      res.json({ leaderboard });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getUserRank(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { type = 'points' } = req.query;

      const rank = await gameService.getUserRank(
        user.id,
        type as 'points' | 'books' | 'streak'
      );

      res.json({ rank });
    } catch (error) {
      console.error('Get user rank error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getPointsHistory(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { limit = 50 } = req.query;

      const history = await gameService.getUserPointsHistory(user.id, Number(limit));

      res.json({ history });
    } catch (error) {
      console.error('Get points history error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getAllBadges(req: Request, res: Response) {
    try {
      const badges = await gameService.getAllBadges();
      res.json({ badges });
    } catch (error) {
      console.error('Get all badges error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getMonthlyStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { year, month } = req.params;

      const stats = await gameService.getMonthlyStats(
        user.id,
        Number(year),
        Number(month)
      );

      res.json({ stats });
    } catch (error) {
      console.error('Get monthly stats error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getLevelInfo(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const stats = await gameService.getUserStats(user.id);

      if (!stats) {
        return res.status(404).json({ error: '用户统计数据不存在' });
      }

      const levelInfo = await gameService.getLevelInfo(stats.level);

      res.json({
        levelInfo: {
          ...levelInfo,
          currentBooks: stats.totalBooks,
          progressToNext: (stats.totalBooks % 10) / 10 * 100
        }
      });
    } catch (error) {
      console.error('Get level info error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getBadgeProgress(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { badgeId } = req.params;

      const progress = await gameService.getBadgeProgress(user.id, Number(badgeId));

      res.json({ progress });
    } catch (error) {
      console.error('Get badge progress error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getDashboard(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const [stats, badges, recentPoints, rank] = await Promise.all([
        gameService.getUserStats(user.id),
        gameService.getUserBadges(user.id),
        gameService.getUserPointsHistory(user.id, 5),
        gameService.getUserRank(user.id, 'points')
      ]);

      const availableBadges = await gameService.getAvailableBadges(user.id);
      const nextBadge = availableBadges.length > 0 ? availableBadges[0] : null;
      let nextBadgeProgress = null;

      if (nextBadge) {
        nextBadgeProgress = await gameService.getBadgeProgress(user.id, nextBadge.id);
      }

      res.json({
        dashboard: {
          stats: { ...stats, rank },
          recentBadges: badges.slice(0, 3),
          recentPoints,
          nextBadge: nextBadge ? {
            ...nextBadge,
            progress: nextBadgeProgress
          } : null
        }
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
}