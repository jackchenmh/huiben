import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserStats, Badge, CheckIn } from '@/types';
import api from '@/lib/api';
import { formatTime, getStreakEmoji } from '@/lib/utils';
import {
  BookOpen,
  Clock,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentBadges, setRecentBadges] = useState<Badge[]>([]);
  const [todayCheckins, setTodayCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [gameResponse, badgesResponse, todayResponse] = await Promise.all([
        api.get('/game/dashboard'),
        api.get('/game/badges'),
        api.get('/checkins/today'),
      ]);

      setStats(gameResponse.data.dashboard.stats);
      setRecentBadges(gameResponse.data.dashboard.recentBadges || []);
      setTodayCheckins(todayResponse.data.checkins || []);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
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

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          欢迎回来，{user?.displayName}！
        </h1>
        <p className="mt-2 text-gray-600">
          今天是新的一天，让我们一起阅读吧 📚
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="总阅读书籍"
          value={stats?.totalBooks || 0}
          icon={BookOpen}
          color="text-primary-600"
          subtitle={`等级 ${stats?.level || 1}`}
        />
        <StatCard
          title="总阅读时间"
          value={formatTime(stats?.totalReadingTime || 0)}
          icon={Clock}
          color="text-blue-600"
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
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

              {todayCheckins.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">今天还没有打卡记录</p>
                  <p className="text-sm text-gray-400 mt-1">
                    快去选择一本喜欢的绘本开始阅读吧！
                  </p>
                </div>
              )}
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

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">最近获得的徽章</h2>
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

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
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