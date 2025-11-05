import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  BookOpen,
  Trophy,
  BarChart3,
  User,
  LogOut,
  Home,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: Home },
  { name: '绘本库', href: '/books', icon: BookOpen },
  { name: '今日打卡', href: '/checkin', icon: CheckSquare },
  { name: '排行榜', href: '/leaderboard', icon: Trophy },
  { name: '数据分析', href: '/analytics', icon: BarChart3 },
  { name: '个人中心', href: '/profile', icon: User },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">悦读之旅</span>
              </Link>

              <div className="hidden md:flex space-x-6">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                  alt={user?.displayName}
                  className="h-8 w-8 rounded-full"
                />
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.displayName}
                </span>
                <span className="hidden md:block text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {user?.role === 'child' ? '小朋友' : user?.role === 'parent' ? '家长' : '老师'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                title="退出登录"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:block text-sm">退出</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex justify-around items-center py-2">
          {navigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center space-y-1 px-2 py-1 rounded-md transition-colors',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-600'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}