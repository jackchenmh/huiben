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

      const [stats, badges, recentPoints, rank, dailyChallenge, recommendations, weeklyStats] = await Promise.all([
        gameService.getUserStats(user.id),
        gameService.getUserBadges(user.id),
        gameService.getUserPointsHistory(user.id, 5),
        gameService.getUserRank(user.id, 'points'),
        gameService.getDailyChallenge(user.id),
        gameService.getPersonalizedRecommendations(user.id),
        gameService.getWeeklyStats(user.id)
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
          } : null,
          dailyChallenge,
          recommendations,
          weeklyStats
        }
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getDailyChallenge(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const challenge = await gameService.getDailyChallenge(user.id);

      res.json({ challenge });
    } catch (error) {
      console.error('Get daily challenge error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async completeDailyChallenge(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const success = await gameService.completeDailyChallenge(user.id);

      if (!success) {
        return res.status(400).json({ error: '挑战未完成或已领取奖励' });
      }

      res.json({ message: '每日挑战奖励已领取！', pointsAwarded: 50 });
    } catch (error) {
      console.error('Complete daily challenge error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getWeeklyStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const weeklyStats = await gameService.getWeeklyStats(user.id);

      res.json({ weeklyStats });
    } catch (error) {
      console.error('Get weekly stats error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getPersonalizedRecommendations(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const recommendations = await gameService.getPersonalizedRecommendations(user.id);

      res.json({ recommendations });
    } catch (error) {
      console.error('Get recommendations error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async checkBadgeProgress(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const awardedBadges = await gameService.checkAndAwardBadges(user.id);

      if (awardedBadges.length > 0) {
        res.json({
          message: '恭喜获得新徽章！',
          newBadges: awardedBadges
        });
      } else {
        res.json({
          message: '暂无新徽章',
          newBadges: []
        });
      }
    } catch (error) {
      console.error('Check badge progress error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async checkLevelUp(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const levelResult = await gameService.updateLevel(user.id);

      res.json({ levelResult });
    } catch (error) {
      console.error('Check level up error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
}