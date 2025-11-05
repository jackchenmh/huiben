import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserStats, Badge, CheckIn, Notification } from '@/types';
import api from '@/lib/api';
import { formatTime, getStreakEmoji } from '@/lib/utils';
import {
  BookOpen,
  Clock,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Bell,
  Gift,
  Zap,
  CheckCircle,
  AlertCircle,
  Award,
  Star,
  Lightbulb,
} from 'lucide-react';

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
}

interface Recommendations {
  badges: Badge[];
  challenges: string[];
  tips: string[];
}

export default function EnhancedDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentBadges, setRecentBadges] = useState<Badge[]>([]);
  const [todayCheckins, setTodayCheckins] = useState<CheckIn[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        gameResponse,
        notificationsResponse,
        unreadResponse,
        challengeResponse,
        recommendationsResponse,
        weeklyResponse
      ] = await Promise.all([
        api.get('/game/dashboard'),
        api.get('/notifications?limit=5'),
        api.get('/notifications/unread-count'),
        api.get('/game/challenge/daily'),
        api.get('/game/recommendations'),
        api.get('/game/stats/weekly'),
      ]);

      const { dashboard } = gameResponse.data;
      setStats(dashboard.stats);
      setRecentBadges(dashboard.recentBadges || []);
      setTodayCheckins(dashboard.todayCheckins || []);
      setNotifications(notificationsResponse.data.notifications || []);
      setUnreadCount(unreadResponse.data.unreadCount || 0);
      setDailyChallenge(challengeResponse.data.challenge);
      setRecommendations(recommendationsResponse.data.recommendations);
      setWeeklyStats(weeklyResponse.data.weeklyStats);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDailyChallenge = async () => {
    try {
      await api.post('/game/challenge/daily/complete');
      await fetchDashboardData(); // 刷新数据
    } catch (error) {
      console.error('完成每日挑战失败:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('标记通知为已读失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }: any) => (
    <div className="card p-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const progressPercentage = dailyChallenge ?
    Math.min((dailyChallenge.current / dailyChallenge.target) * 100, 100) : 0;

  return (
    <div className="container py-8">
      {/* 头部欢迎信息 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              欢迎回来，{user?.displayName}！
            </h1>
            <p className="mt-2 text-gray-600">
              今天是新的一天，让我们一起阅读吧 📚
            </p>
          </div>

          {/* 通知图标 */}
          <div className="relative">
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
              <Bell className="h-6 w-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="总阅读书籍"
          value={stats?.totalBooks || 0}
          icon={BookOpen}
          color="text-primary-600"
          subtitle={`等级 ${stats?.level || 1}`}
          trend={weeklyStats?.growth?.books}
        />
        <StatCard
          title="总阅读时间"
          value={formatTime(stats?.totalReadingTime || 0)}
          icon={Clock}
          color="text-blue-600"
          trend={weeklyStats?.growth?.time ? formatTime(weeklyStats.growth.time) : null}
        />
        <StatCard
          title="连续打卡"
          value={`${stats?.consecutiveDays || 0}天`}
          icon={Target}
          color="text-accent-600"
          subtitle={getStreakEmoji(stats?.consecutiveDays || 0)}
        />
        <StatCard
          title="总积分"
          value={stats?.totalPoints || 0}
          icon={Trophy}
          color="text-yellow-600"
          subtitle={`排名 #${stats?.rank || '-'}`}
          trend={weeklyStats?.growth?.points}
        />
      </div>

      {/* 每日挑战 */}
      {dailyChallenge && (
        <div className="card p-6 mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">每日挑战</h2>
            </div>
            {dailyChallenge.completed ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">已完成</span>
              </div>
            ) : (
              <button
                onClick={handleCompleteDailyChallenge}
                disabled={progressPercentage < 100}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  progressPercentage >= 100
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {progressPercentage >= 100 ? '领取奖励' : '未完成'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-900">{dailyChallenge.title}</h3>
              <p className="text-sm text-gray-600">{dailyChallenge.description}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>进度: {dailyChallenge.current}/{dailyChallenge.target}分钟</span>
                <span className="text-purple-600">奖励: +{dailyChallenge.reward}积分</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* 今日打卡 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">今日打卡</h2>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>

          {todayCheckins.length > 0 ? (
            <div className="space-y-3">
              {todayCheckins.slice(0, 3).map((checkin) => (
                <div key={checkin.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {checkin.bookTitle}
                    </p>
                    <p className="text-sm text-gray-500">
                      阅读 {formatTime(checkin.readingTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">今天还没有打卡记录</p>
              <p className="text-sm text-gray-400 mt-1">
                快去选择一本喜欢的绘本开始阅读吧！
              </p>
            </div>
          )}
        </div>

        {/* 最新通知 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">最新通知</h2>
            <Bell className="h-5 w-5 text-gray-400" />
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'
                  }`}
                  onClick={() => !notification.isRead && markNotificationAsRead(notification.id!)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {notification.type === 'achievement' && <Award className="h-5 w-5 text-yellow-500" />}
                      {notification.type === 'reminder' && <AlertCircle className="h-5 w-5 text-blue-500" />}
                      {notification.type === 'system' && <Bell className="h-5 w-5 text-gray-500" />}
                      {notification.type === 'social' && <Star className="h-5 w-5 text-purple-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无新通知</p>
            </div>
          )}
        </div>

        {/* 最近获得的徽章 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">最近徽章</h2>
            <Trophy className="h-5 w-5 text-gray-400" />
          </div>

          {recentBadges.length > 0 ? (
            <div className="space-y-3">
              {recentBadges.slice(0, 3).map((badge) => (
                <div key={badge.id} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl">{badge.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{badge.name}</p>
                    <p className="text-sm text-gray-500">{badge.description}</p>
                  </div>
                  <div className="text-sm font-medium text-yellow-600">
                    +{badge.points}分
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">还没有获得徽章</p>
              <p className="text-sm text-gray-400 mt-1">
                坚持阅读打卡，获得你的第一个徽章！
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 个性化推荐 */}
      {recommendations && (
        <div className="card p-6 mb-8">
          <div className="flex items-center space-x-2 mb-6">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900">为你推荐</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 推荐徽章 */}
            {recommendations.badges.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">即将获得的徽章</h3>
                <div className="space-y-2">
                  {recommendations.badges.map((badge) => (
                    <div key={badge.id} className="flex items-center space-x-2 p-2 bg-yellow-50 rounded">
                      <span className="text-lg">{badge.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 挑战建议 */}
            {recommendations.challenges.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">挑战目标</h3>
                <div className="space-y-2">
                  {recommendations.challenges.map((challenge, index) => (
                    <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                      <Target className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span className="text-sm text-gray-700">{challenge}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 阅读建议 */}
            {recommendations.tips.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">阅读建议</h3>
                <div className="space-y-2">
                  {recommendations.tips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                      <Lightbulb className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm text-gray-700">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 底部快捷统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <TrendingUp className="h-8 w-8 text-accent-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">继续努力</h3>
          <p className="text-sm text-gray-600">
            距离下个等级还需阅读 {Math.max(0, (stats?.level || 1) * 10 - (stats?.totalBooks || 0))} 本书
          </p>
        </div>

        <div className="card p-6 text-center">
          <Target className="h-8 w-8 text-primary-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">打卡目标</h3>
          <p className="text-sm text-gray-600">
            {stats?.consecutiveDays ? `已连续打卡 ${stats.consecutiveDays} 天` : '开始你的打卡之旅'}
          </p>
        </div>

        <div className="card p-6 text-center">
          <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">排行榜</h3>
          <p className="text-sm text-gray-600">
            当前排名第 {stats?.rank || '-'} 位
          </p>
        </div>
      </div>
    </div>
  );
}