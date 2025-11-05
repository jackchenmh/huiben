import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './BadgeCollection.css'

interface Badge {
  id: number
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: string
  requirements: string
  points: number
  earnedAt?: string
  progress?: {
    current: number
    target: number
  }
}

interface BadgeCollectionProps {
  onBack?: () => void
}

const BadgeCollection: React.FC<BadgeCollectionProps> = ({ onBack }) => {
  const { user } = useAuth()
  const [badges, setBadges] = useState<Badge[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const categories = [
    { id: 'all', name: '全部', icon: '🎖️' },
    { id: 'reading', name: '阅读成就', icon: '📚' },
    { id: 'time', name: '时间挑战', icon: '⏰' },
    { id: 'streak', name: '连续打卡', icon: '🔥' },
    { id: 'social', name: '社交互动', icon: '👥' },
    { id: 'special', name: '特殊事件', icon: '🌟' }
  ]

  const rarities = [
    { id: 'all', name: '全部', color: '#718096' },
    { id: 'common', name: '普通', color: '#68d391' },
    { id: 'rare', name: '稀有', color: '#4299e1' },
    { id: 'epic', name: '史诗', color: '#9f7aea' },
    { id: 'legendary', name: '传说', color: '#f6ad55' }
  ]

  useEffect(() => {
    fetchBadges()
  }, [])

  const fetchBadges = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3001/api/game/badges/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBadges(data.badges || [])
      }
    } catch (error) {
      console.error('获取徽章失败:', error)
    }
    setLoading(false)
  }

  const getFilteredBadges = () => {
    let filtered = badges

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(badge => badge.category === selectedCategory)
    }

    if (selectedRarity !== 'all') {
      filtered = filtered.filter(badge => badge.rarity === selectedRarity)
    }

    return filtered
  }

  const getRarityColor = (rarity: string) => {
    const rarityColors = {
      common: '#68d391',
      rare: '#4299e1',
      epic: '#9f7aea',
      legendary: '#f6ad55'
    }
    return rarityColors[rarity as keyof typeof rarityColors] || '#718096'
  }

  const getRarityName = (rarity: string) => {
    const rarityNames = {
      common: '普通',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说'
    }
    return rarityNames[rarity as keyof typeof rarityNames] || '未知'
  }

  const getProgressPercentage = (badge: Badge) => {
    if (!badge.progress) return badge.earnedAt ? 100 : 0
    return Math.min((badge.progress.current / badge.progress.target) * 100, 100)
  }

  const getEarnedBadges = () => {
    return badges.filter(badge => badge.earnedAt)
  }

  const getTotalPoints = () => {
    return getEarnedBadges().reduce((total, badge) => total + badge.points, 0)
  }

  if (loading) {
    return (
      <div className="badge-collection-loading">
        <div className="loading-spinner">🏅</div>
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="badge-collection-container">
      <div className="badge-collection-header">
        {onBack && (
          <button onClick={onBack} className="back-button">
            ← 返回
          </button>
        )}
        <h1>🏅 徽章收藏</h1>
        <p>展示你的阅读成就</p>
      </div>

      {/* 统计信息 */}
      <div className="badge-stats-section">
        <div className="stats-card">
          <div className="stat-item">
            <div className="stat-icon">🏆</div>
            <div className="stat-details">
              <div className="stat-number">{getEarnedBadges().length}</div>
              <div className="stat-label">已获得徽章</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">🎯</div>
            <div className="stat-details">
              <div className="stat-number">{badges.length}</div>
              <div className="stat-label">徽章总数</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">💎</div>
            <div className="stat-details">
              <div className="stat-number">{getTotalPoints()}</div>
              <div className="stat-label">徽章积分</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">📊</div>
            <div className="stat-details">
              <div className="stat-number">{Math.round((getEarnedBadges().length / badges.length) * 100)}%</div>
              <div className="stat-label">收集进度</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="filters-section">
        <div className="filter-group">
          <h3>📂 分类筛选</h3>
          <div className="categories-scroll">
            {categories.map(category => (
              <button
                key={category.id}
                className={`filter-button ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className="filter-icon">{category.icon}</span>
                <span className="filter-name">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3>✨ 稀有度筛选</h3>
          <div className="rarities-scroll">
            {rarities.map(rarity => (
              <button
                key={rarity.id}
                className={`rarity-button ${selectedRarity === rarity.id ? 'active' : ''}`}
                style={{ '--rarity-color': rarity.color } as React.CSSProperties}
                onClick={() => setSelectedRarity(rarity.id)}
              >
                {rarity.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 徽章网格 */}
      <div className="badges-grid-section">
        <div className="badges-grid">
          {getFilteredBadges().length > 0 ? getFilteredBadges().map(badge => (
            <div
              key={badge.id}
              className={`badge-card ${badge.earnedAt ? 'earned' : 'locked'}`}
            >
              <div
                className="badge-rarity-border"
                style={{ '--rarity-color': getRarityColor(badge.rarity) } as React.CSSProperties}
              >
                <div className="badge-icon-container">
                  <div className="badge-icon">{badge.icon}</div>
                  {badge.earnedAt && (
                    <div className="earned-indicator">✅</div>
                  )}
                </div>

                <div className="badge-info">
                  <h4 className="badge-name">{badge.name}</h4>
                  <p className="badge-description">{badge.description}</p>

                  <div className="badge-meta">
                    <div className="badge-rarity">
                      <span
                        className="rarity-dot"
                        style={{ backgroundColor: getRarityColor(badge.rarity) }}
                      ></span>
                      {getRarityName(badge.rarity)}
                    </div>
                    <div className="badge-points">+{badge.points} 积分</div>
                  </div>

                  <div className="badge-requirements">
                    <strong>获得条件:</strong> {badge.requirements}
                  </div>

                  {badge.progress && !badge.earnedAt && (
                    <div className="badge-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${getProgressPercentage(badge)}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        {badge.progress.current} / {badge.progress.target}
                      </div>
                    </div>
                  )}

                  {badge.earnedAt && (
                    <div className="badge-earned-date">
                      获得于: {new Date(badge.earnedAt).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-badges">
              <div className="empty-icon">🏅</div>
              <p>没有找到符合条件的徽章</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BadgeCollection