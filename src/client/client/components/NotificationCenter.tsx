import React, { useEffect, useState } from 'react';
import { Notification } from '@/types';
import api from '@/lib/api';
import {
  Bell,
  BellOff,
  Trash2,
  Check,
  CheckCheck,
  Award,
  AlertCircle,
  Star,
  X,
  Settings,
  Filter,
} from 'lucide-react';

interface NotificationStats {
  total: number;
  unread: number;
  byType: Array<{ type: string; count: number }>;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'achievement' | 'reminder' | 'system' | 'social'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications(true);
    fetchStats();
  }, [filter]);

  const fetchNotifications = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const params = {
        page: currentPage,
        limit: 20,
        ...(filter === 'unread' && { unreadOnly: true }),
        ...(filter !== 'all' && filter !== 'unread' && { type: filter }),
      };

      const response = await api.get('/notifications', { params });
      const { notifications: newNotifications, pagination } = response.data;

      if (reset) {
        setNotifications(newNotifications);
        setPage(1);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      setHasMore(currentPage < pagination.pages);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/notifications/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('获取通知统计失败:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      fetchStats();
    } catch (error) {
      console.error('标记通知为已读失败:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      fetchStats();
    } catch (error) {
      console.error('标记所有通知为已读失败:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      fetchStats();
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  const deleteReadNotifications = async () => {
    try {
      await api.delete('/notifications/read-notifications');
      setNotifications(prev => prev.filter(n => !n.isRead));
      fetchStats();
    } catch (error) {
      console.error('删除已读通知失败:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <Award className="h-5 w-5 text-yellow-500" />;
      case 'reminder':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'social':
        return <Star className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationBg = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-gray-50';

    switch (type) {
      case 'achievement':
        return 'bg-yellow-50 border border-yellow-200';
      case 'reminder':
        return 'bg-blue-50 border border-blue-200';
      case 'social':
        return 'bg-purple-50 border border-purple-200';
      default:
        return 'bg-gray-50 border border-gray-200';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    return notification.type === filter;
  });

  const filterOptions = [
    { value: 'all', label: '全部', count: stats?.total || 0 },
    { value: 'unread', label: '未读', count: stats?.unread || 0 },
    { value: 'achievement', label: '成就', count: stats?.byType.find(t => t.type === 'achievement')?.count || 0 },
    { value: 'reminder', label: '提醒', count: stats?.byType.find(t => t.type === 'reminder')?.count || 0 },
    { value: 'system', label: '系统', count: stats?.byType.find(t => t.type === 'system')?.count || 0 },
    { value: 'social', label: '社交', count: stats?.byType.find(t => t.type === 'social')?.count || 0 },
  ];

  return (
    <div className="container py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">通知中心</h1>
          <p className="mt-2 text-gray-600">
            {stats && (
              <span>
                共 {stats.total} 条通知，{stats.unread} 条未读
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {stats && stats.unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              <span>全部已读</span>
            </button>
          )}

          <button
            onClick={deleteReadNotifications}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>清理已读</span>
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="card p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">筛选通知</h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === option.value
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              <span>{option.label}</span>
              {option.count > 0 && (
                <span className="bg-white px-2 py-0.5 rounded-full text-xs">
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 通知列表 */}
      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`card p-4 transition-all hover:shadow-md ${getNotificationBg(notification.type, notification.isRead || false)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.createdAt!).toLocaleString('zh-CN')}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id!)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="标记为已读"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => deleteNotification(notification.id!)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="删除通知"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))}

            {/* 加载更多 */}
            {hasMore && (
              <div className="text-center py-6">
                <button
                  onClick={() => fetchNotifications(false)}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="card p-12 text-center">
            <BellOff className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无通知</h3>
            <p className="text-gray-500">
              {filter === 'unread' ? '所有通知都已阅读' : '您还没有收到任何通知'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}