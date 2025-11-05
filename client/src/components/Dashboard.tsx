import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import CheckIn from './CheckIn'
import BookDetail from './BookDetail'
import PointsStore from './PointsStore'
import BadgeCollection from './BadgeCollection'
import Statistics from './Statistics'
import './Dashboard.css'

interface UserStats {
  totalBooks: number
  totalReadingTime: number
  consecutiveDays: number
  longestStreak: number
  totalPoints: number
  level: number
}

interface Badge {
  id: number
  name: string
  description: string
  icon: string
  points: number
  earnedAt?: string
}

interface DailyChallenge {
  id: string
  title: string
  description: string
  target: number
  current: number
  reward: number
  completed: boolean
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const [currentView, setCurrentView] = useState<'dashboard' | 'checkin' | 'bookDetail' | 'pointsStore' | 'badgeCollection' | 'statistics'>('dashboard')
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [recentBooks, setRecentBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // 获取用户统计
      const statsResponse = await fetch('http://localhost:3001/api/game/stats', { headers })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

      // 获取用户徽章
      const badgesResponse = await fetch('http://localhost:3001/api/game/badges/my', { headers })
      if (badgesResponse.ok) {
        const badgesData = await badgesResponse.json()
        setBadges(badgesData.badges)
      }

      // 获取每日挑战
      const challengeResponse = await fetch('http://localhost:3001/api/game/daily-challenge', { headers })
      if (challengeResponse.ok) {
        const challengeData = await challengeResponse.json()
        setChallenge(challengeData.challenge)
      }

      // 获取最近阅读
      const booksResponse = await fetch('http://localhost:3001/api/checkins/recent?limit=5', { headers })
      if (booksResponse.ok) {
        const booksData = await booksResponse.json()
        setRecentBooks(booksData.checkins)
      }

    } catch (error) {
      console.error('获取仪表板数据失败:', error)
    }
    setLoading(false)
  }

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      child: { icon: '👶', name: '小读者' },
      parent: { icon: '👨‍👩‍👧‍👦', name: '家长' },
      teacher: { icon: '👩‍🏫', name: '老师' }
    }
    return roleMap[role as keyof typeof roleMap] || { icon: '👤', name: '用户' }
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const handleStartReading = (_book?: any) => {
    setCurrentView('checkin')
  }


  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setSelectedBookId(null)
    // 重新获取数据以更新统计
    fetchDashboardData()
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">📚</div>
        <p>加载中...</p>
      </div>
    )
  }

  // 渲染不同的视图
  if (currentView === 'checkin') {
    return <CheckIn onBack={handleBackToDashboard} />
  }

  if (currentView === 'bookDetail' && selectedBookId) {
    return (
      <BookDetail
        bookId={selectedBookId}
        onBack={handleBackToDashboard}
        onStartReading={handleStartReading}
      />
    )
  }

  if (currentView === 'pointsStore') {
    return <PointsStore onBack={handleBackToDashboard} />
  }

  if (currentView === 'badgeCollection') {
    return <BadgeCollection onBack={handleBackToDashboard} />
  }

  if (currentView === 'statistics') {
    return <Statistics onBack={handleBackToDashboard} />
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="user-info">
            <div className="user-avatar">
              {getRoleDisplay(user?.role || '').icon}
            </div>
            <div className="user-details">
              <h1>你好, {user?.displayName}！</h1>
              <span className="user-role">{getRoleDisplay(user?.role || '').name}</span>
            </div>
          </div>
          <button onClick={logout} className="logout-button">
            退出登录
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* 统计卡片 */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📖</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.totalBooks || 0}</div>
              <div className="stat-label">已读书籍</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <div className="stat-number">{Math.floor((stats?.totalReadingTime || 0) / 60)}</div>
              <div className="stat-label">阅读时长(小时)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.consecutiveDays || 0}</div>
              <div className="stat-label">连续天数</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.totalPoints || 0}</div>
              <div className="stat-label">总积分</div>
            </div>
          </div>
        </section>

        {/* 每日挑战 */}
        {challenge && (
          <section className="challenge-section">
            <h2>🎯 今日挑战</h2>
            <div className="challenge-card">
              <div className="challenge-header">
                <h3>{challenge.title}</h3>
                <div className="challenge-reward">+{challenge.reward} 积分</div>
              </div>
              <p>{challenge.description}</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage(challenge.current, challenge.target)}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {challenge.current} / {challenge.target} 分钟
              </div>
              {challenge.completed && (
                <div className="challenge-completed">✅ 已完成</div>
              )}
            </div>
          </section>
        )}

        <div className="dashboard-grid">
          {/* 最近徽章 */}
          <section className="badges-section">
            <h2>🏅 我的徽章</h2>
            <div className="badges-grid">
              {badges.length > 0 ? (
                badges.slice(0, 6).map((badge) => (
                  <div key={badge.id} className="badge-item">
                    <div className="badge-icon">{badge.icon}</div>
                    <div className="badge-name">{badge.name}</div>
                    {badge.earnedAt && (
                      <div className="badge-date">
                        {new Date(badge.earnedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🏅</div>
                  <p>开始阅读来获得你的第一个徽章吧！</p>
                </div>
              )}
            </div>
          </section>

          {/* 最近阅读 */}
          <section className="recent-books-section">
            <h2>📚 最近阅读</h2>
            <div className="books-list">
              {recentBooks.length > 0 ? (
                recentBooks.map((book, index) => (
                  <div key={index} className="book-item">
                    <div className="book-info">
                      <div className="book-title">{book.bookTitle || '未知书籍'}</div>
                      <div className="book-meta">
                        {new Date(book.checkinDate).toLocaleDateString()} ·
                        {book.readingTime} 分钟
                      </div>
                    </div>
                    <div className="book-emoji">📖</div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <p>还没有阅读记录，开始你的第一次阅读吧！</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 快速操作 */}
        <section className="quick-actions">
          <h2>⚡ 快速操作</h2>
          <div className="actions-grid">
            <button
              onClick={handleStartReading}
              className="action-button primary"
            >
              <span className="action-icon">📝</span>
              <span>开始阅读打卡</span>
            </button>
            <button
              onClick={() => setCurrentView('statistics')}
              className="action-button"
            >
              <span className="action-icon">📊</span>
              <span>查看统计</span>
            </button>
            <button
              onClick={() => setCurrentView('pointsStore')}
              className="action-button"
            >
              <span className="action-icon">🏆</span>
              <span>积分商城</span>
            </button>
            <button
              onClick={() => setCurrentView('badgeCollection')}
              className="action-button"
            >
              <span className="action-icon">👥</span>
              <span>徽章收藏</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Dashboard