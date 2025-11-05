import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Statistics.css'

interface ReadingStats {
  totalBooks: number
  totalReadingTime: number
  totalPages: number
  averageReadingTime: number
  longestSession: number
  consecutiveDays: number
  longestStreak: number
  booksThisMonth: number
  readingTimeThisMonth: number
  favoriteCategory: string
  readingLevel: number
}

interface DailyRecord {
  date: string
  readingTime: number
  booksRead: number
  pagesRead: number
}

interface CategoryStats {
  category: string
  count: number
  totalTime: number
  percentage: number
  color: string
}

interface MonthlyTrend {
  month: string
  books: number
  time: number
  pages: number
}

interface StatisticsProps {
  onBack?: () => void
}

const Statistics: React.FC<StatisticsProps> = ({ onBack }) => {
  const { user } = useAuth()
  const [stats, setStats] = useState<ReadingStats | null>(null)
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)

  const categoryColors = [
    '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
    '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f',
    '#a8edea', '#fed6e3', '#d299c2', '#fef9d7'
  ]

  useEffect(() => {
    fetchStatistics()
  }, [selectedPeriod])

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // 获取综合统计
      const statsResponse = await fetch(`http://localhost:3001/api/statistics/overview?period=${selectedPeriod}`, { headers })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

      // 获取每日记录
      const dailyResponse = await fetch(`http://localhost:3001/api/statistics/daily?period=${selectedPeriod}`, { headers })
      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json()
        setDailyRecords(dailyData.records || [])
      }

      // 获取分类统计
      const categoryResponse = await fetch(`http://localhost:3001/api/statistics/categories?period=${selectedPeriod}`, { headers })
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json()
        const categoriesWithColors = (categoryData.categories || []).map((cat: any, index: number) => ({
          ...cat,
          color: categoryColors[index % categoryColors.length]
        }))
        setCategoryStats(categoriesWithColors)
      }

      // 获取月度趋势
      const trendResponse = await fetch(`http://localhost:3001/api/statistics/trends`, { headers })
      if (trendResponse.ok) {
        const trendData = await trendResponse.json()
        setMonthlyTrends(trendData.trends || [])
      }

    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
    setLoading(false)
  }

  const getMaxDailyValue = (field: 'readingTime' | 'booksRead' | 'pagesRead') => {
    return Math.max(...dailyRecords.map(record => record[field]), 1)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}小时${mins}分钟`
    }
    return `${mins}分钟`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return '本周'
      case 'month': return '本月'
      case 'year': return '本年'
      default: return '本月'
    }
  }

  if (loading) {
    return (
      <div className="statistics-loading">
        <div className="loading-spinner">📊</div>
        <p>加载统计数据中...</p>
      </div>
    )
  }

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        {onBack && (
          <button onClick={onBack} className="back-button">
            ← 返回
          </button>
        )}
        <h1>📊 阅读统计</h1>
        <p>查看你的阅读成就和进步</p>
      </div>

      {/* 时间段选择 */}
      <div className="period-selector">
        {(['week', 'month', 'year'] as const).map(period => (
          <button
            key={period}
            className={`period-button ${selectedPeriod === period ? 'active' : ''}`}
            onClick={() => setSelectedPeriod(period)}
          >
            {period === 'week' ? '本周' : period === 'month' ? '本月' : '本年'}
          </button>
        ))}
      </div>

      {/* 核心指标 */}
      {stats && (
        <div className="core-metrics">
          <div className="metrics-grid">
            <div className="metric-card highlight">
              <div className="metric-icon">📚</div>
              <div className="metric-content">
                <div className="metric-number">{stats.totalBooks}</div>
                <div className="metric-label">总读书数</div>
                <div className="metric-subtitle">{getPeriodLabel()}阅读了 {stats.booksThisMonth} 本</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">⏰</div>
              <div className="metric-content">
                <div className="metric-number">{Math.floor(stats.totalReadingTime / 60)}</div>
                <div className="metric-label">总时长(小时)</div>
                <div className="metric-subtitle">平均每次 {stats.averageReadingTime} 分钟</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📄</div>
              <div className="metric-content">
                <div className="metric-number">{stats.totalPages}</div>
                <div className="metric-label">总页数</div>
                <div className="metric-subtitle">阅读水平 Lv.{stats.readingLevel}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🔥</div>
              <div className="metric-content">
                <div className="metric-number">{stats.consecutiveDays}</div>
                <div className="metric-label">连续天数</div>
                <div className="metric-subtitle">最长记录 {stats.longestStreak} 天</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 阅读趋势图 */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>📈 {getPeriodLabel()}阅读趋势</h3>
          <div className="trend-chart">
            <div className="chart-container">
              <div className="y-axis">
                <div className="y-label">分钟</div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="y-tick">
                    {Math.round((getMaxDailyValue('readingTime') * (4 - i)) / 4)}
                  </div>
                ))}
              </div>
              <div className="chart-bars">
                {dailyRecords.map((record, index) => (
                  <div key={index} className="bar-container">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${(record.readingTime / getMaxDailyValue('readingTime')) * 100}%`
                      }}
                      title={`${formatDate(record.date)}: ${record.readingTime}分钟`}
                    ></div>
                    <div className="x-label">{formatDate(record.date)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 分类统计 */}
        <div className="chart-card">
          <h3>📂 {getPeriodLabel()}分类分布</h3>
          <div className="category-chart">
            {categoryStats.length > 0 ? (
              <>
                <div className="pie-chart">
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    {(() => {
                      let currentAngle = 0
                      return categoryStats.map((category, index) => {
                        const angle = (category.percentage / 100) * 360
                        const startAngle = currentAngle
                        currentAngle += angle

                        const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180)
                        const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180)
                        const endX = 100 + 80 * Math.cos((currentAngle - 90) * Math.PI / 180)
                        const endY = 100 + 80 * Math.sin((currentAngle - 90) * Math.PI / 180)

                        const largeArcFlag = angle > 180 ? 1 : 0

                        return (
                          <path
                            key={index}
                            d={`M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                            fill={category.color}
                            stroke="white"
                            strokeWidth="2"
                          />
                        )
                      })
                    })()}
                  </svg>
                </div>
                <div className="category-legend">
                  {categoryStats.map((category, index) => (
                    <div key={index} className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="legend-label">{category.category}</span>
                      <span className="legend-value">{category.count}本</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-chart">
                <div className="empty-icon">📊</div>
                <p>暂无分类数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 月度趋势 */}
      {monthlyTrends.length > 0 && (
        <div className="monthly-trends">
          <h3>📅 月度趋势对比</h3>
          <div className="trends-container">
            {monthlyTrends.map((trend, index) => (
              <div key={index} className="trend-item">
                <div className="trend-month">{trend.month}</div>
                <div className="trend-stats">
                  <div className="trend-stat">
                    <span className="trend-icon">📚</span>
                    <span className="trend-number">{trend.books}</span>
                    <span className="trend-label">本</span>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-icon">⏰</span>
                    <span className="trend-number">{Math.floor(trend.time / 60)}</span>
                    <span className="trend-label">小时</span>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-icon">📄</span>
                    <span className="trend-number">{trend.pages}</span>
                    <span className="trend-label">页</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 成就总结 */}
      {stats && (
        <div className="achievements-summary">
          <h3>🏆 成就总结</h3>
          <div className="achievements-grid">
            <div className="achievement-item">
              <div className="achievement-icon">🥇</div>
              <div className="achievement-content">
                <div className="achievement-title">最喜爱的分类</div>
                <div className="achievement-value">{stats.favoriteCategory || '暂无数据'}</div>
              </div>
            </div>

            <div className="achievement-item">
              <div className="achievement-icon">⚡</div>
              <div className="achievement-content">
                <div className="achievement-title">最长阅读记录</div>
                <div className="achievement-value">{formatDuration(stats.longestSession)}</div>
              </div>
            </div>

            <div className="achievement-item">
              <div className="achievement-icon">📈</div>
              <div className="achievement-content">
                <div className="achievement-title">{getPeriodLabel()}阅读时长</div>
                <div className="achievement-value">{formatDuration(stats.readingTimeThisMonth)}</div>
              </div>
            </div>

            <div className="achievement-item">
              <div className="achievement-icon">🎯</div>
              <div className="achievement-content">
                <div className="achievement-title">阅读等级</div>
                <div className="achievement-value">Level {stats.readingLevel}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Statistics