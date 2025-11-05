import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserStats, Badge, User } from '@/types';
import api from '@/lib/api';
import { formatTime, getStreakEmoji } from '@/lib/utils';
import {
  User as UserIcon,
  Settings,
  Trophy,
  Target,
  Clock,
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  Camera,
  Edit3,
  Save,
  X,
  Mail,
  Shield,
  Star,
} from 'lucide-react';

interface UserActivity {
  recentCheckins: any[];
  recentBadges: Badge[];
  pointsEarned: number;
}

interface ProgressData {
  currentMonth: any;
  lastMonth: any;
  improvement: {
    books: number;
    time: number;
    checkins: number;
  };
  streakAnalysis: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
  };
  readingPatterns: {
    timePatterns: Array<{ timeSlot: string; count: number; avgReadingTime: number }>;
    weekdayPatterns: Array<{ weekday: string; count: number; avgReadingTime: number }>;
  };
}

export default function EnhancedProfile() {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [
        gameResponse,
        badgesResponse,
        activityResponse,
        progressResponse
      ] = await Promise.all([
        api.get('/game/stats'),
        api.get('/game/badges'),
        api.get('/users/activity'), // 假设这个端点存在
        api.get('/analytics/progress'),
      ]);

      setStats(gameResponse.data.stats);
      setBadges(badgesResponse.data.earnedBadges || []);
      setActivity(activityResponse.data || null);
      setProgress(progressResponse.data.analysis || null);
    } catch (error) {
      console.error('获取个人资料数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await api.patch('/auth/profile', editForm);
      updateUser(response.data.user);
      setEditing(false);
    } catch (error) {
      console.error('更新个人资料失败:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      displayName: user?.displayName || '',
      email: user?.email || '',
      avatar: user?.avatar || '',
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'text-gray-600' }: any) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className={`text-lg font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const getProgressColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getProgressIcon = (value: number) => {
    if (value > 0) return '↗️';
    if (value < 0) return '↘️';
    return '→';
  };

  return (
    <div className="container py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">个人资料</h1>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Edit3 className="h-4 w-4" />
          <span>{editing ? '取消编辑' : '编辑资料'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：个人信息 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 基本信息卡片 */}
          <div className="card p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    user?.displayName?.[0]?.toUpperCase()
                  )}
                </div>
                {editing && (
                  <button className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50">
                    <Camera className="h-4 w-4 text-gray-600" />
                  </button>
                )}
              </div>

              {editing ? (
                <div className="w-full space-y-3">
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="显示名称"
                  />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="邮箱地址"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleUpdateProfile}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Save className="h-4 w-4" />
                      <span>保存</span>
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <X className="h-4 w-4" />
                      <span>取消</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{user?.displayName}</h2>
                  <p className="text-gray-600 flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-1" />
                    {user?.email}
                  </p>
                  <div className="flex items-center justify-center mt-2">
                    <Shield className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-500 capitalize">{user?.role}</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
                  <span>等级 {stats?.level || 1}</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-purple-500" />
                  <span>{badges.length} 徽章</span>
                </div>
              </div>
            </div>
          </div>

          {/* 快速统计 */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">快速统计</h3>
            <div className="space-y-3">
              <StatCard
                icon={BookOpen}
                title="总书籍"
                value={stats?.totalBooks || 0}
                color="text-primary-600"
              />
              <StatCard
                icon={Clock}
                title="总时间"
                value={formatTime(stats?.totalReadingTime || 0)}
                color="text-blue-600"
              />
              <StatCard
                icon={Target}
                title="连续天数"
                value={`${stats?.consecutiveDays || 0}天`}
                subtitle={getStreakEmoji(stats?.consecutiveDays || 0)}
                color="text-accent-600"
              />
              <StatCard
                icon={Trophy}
                title="总积分"
                value={stats?.totalPoints || 0}
                subtitle={`排名 #${stats?.rank || '-'}`}
                color="text-yellow-600"
              />
            </div>
          </div>
        </div>

        {/* 右侧：详细数据 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 本月进步 */}
          {progress && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">本月进步</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">📚</div>
                  <p className="text-sm text-gray-600">阅读书籍</p>
                  <p className="text-lg font-bold text-gray-900">{progress.currentMonth.uniqueBooks}</p>
                  <p className={`text-sm ${getProgressColor(progress.improvement.books)}`}>
                    {getProgressIcon(progress.improvement.books)} {Math.abs(progress.improvement.books)} 本
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">⏰</div>
                  <p className="text-sm text-gray-600">阅读时间</p>
                  <p className="text-lg font-bold text-gray-900">{formatTime(progress.currentMonth.totalTime)}</p>
                  <p className={`text-sm ${getProgressColor(progress.improvement.time)}`}>
                    {getProgressIcon(progress.improvement.time)} {formatTime(Math.abs(progress.improvement.time))}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">✅</div>
                  <p className="text-sm text-gray-600">打卡次数</p>
                  <p className="text-lg font-bold text-gray-900">{progress.currentMonth.totalCheckins}</p>
                  <p className={`text-sm ${getProgressColor(progress.improvement.checkins)}`}>
                    {getProgressIcon(progress.improvement.checkins)} {Math.abs(progress.improvement.checkins)} 次
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 阅读习惯分析 */}
          {progress?.readingPatterns && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">阅读习惯分析</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 时间偏好 */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">阅读时间偏好</h4>
                  <div className="space-y-2">
                    {progress.readingPatterns.timePatterns.map((pattern) => (
                      <div key={pattern.timeSlot} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{pattern.timeSlot}</span>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">{pattern.count} 次</span>
                          <p className="text-xs text-gray-500">平均 {formatTime(pattern.avgReadingTime)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 星期偏好 */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">星期阅读分布</h4>
                  <div className="space-y-2">
                    {progress.readingPatterns.weekdayPatterns.map((pattern) => (
                      <div key={pattern.weekday} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{pattern.weekday}</span>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">{pattern.count} 次</span>
                          <p className="text-xs text-gray-500">平均 {formatTime(pattern.avgReadingTime)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 连续阅读分析 */}
          {progress?.streakAnalysis && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">连续阅读分析</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl mb-2">🔥</div>
                  <p className="text-sm text-gray-600">当前连续</p>
                  <p className="text-2xl font-bold text-green-600">{progress.streakAnalysis.currentStreak}</p>
                  <p className="text-sm text-gray-500">天</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">🏆</div>
                  <p className="text-sm text-gray-600">最长连续</p>
                  <p className="text-2xl font-bold text-blue-600">{progress.streakAnalysis.longestStreak}</p>
                  <p className="text-sm text-gray-500">天</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">📅</div>
                  <p className="text-sm text-gray-600">总活跃天数</p>
                  <p className="text-2xl font-bold text-purple-600">{progress.streakAnalysis.totalActiveDays}</p>
                  <p className="text-sm text-gray-500">天</p>
                </div>
              </div>
            </div>
          )}

          {/* 最近获得的徽章 */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">我的徽章</h3>
            {badges.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {badges.map((badge) => (
                  <div key={badge.id} className="p-4 bg-yellow-50 rounded-lg text-center border border-yellow-200">
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <p className="text-sm font-medium text-gray-900">{badge.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                    <p className="text-xs text-yellow-600 font-medium mt-2">+{badge.points}分</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">还没有获得徽章</p>
                <p className="text-sm text-gray-400 mt-1">坚持阅读打卡，获得你的第一个徽章！</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}