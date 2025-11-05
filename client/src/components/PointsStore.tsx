import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './PointsStore.css'

interface StoreItem {
  id: number
  name: string
  description: string
  cost: number
  icon: string
  category: string
  available: boolean
  limitPerUser?: number
  userPurchases?: number
}

interface UserPoints {
  totalPoints: number
  availablePoints: number
  spentPoints: number
  level: number
}

interface PointsStoreProps {
  onBack?: () => void
}

const PointsStore: React.FC<PointsStoreProps> = ({ onBack }) => {
  const { user: _user } = useAuth()
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
  const [storeItems, setStoreItems] = useState<StoreItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)

  const categories = [
    { id: 'all', name: '全部', icon: '🌟' },
    { id: 'books', name: '图书奖励', icon: '📚' },
    { id: 'stationery', name: '文具用品', icon: '✏️' },
    { id: 'toys', name: '玩具礼品', icon: '🧸' },
    { id: 'experiences', name: '体验活动', icon: '🎪' },
    { id: 'digital', name: '数字权益', icon: '💎' }
  ]

  useEffect(() => {
    fetchUserPoints()
    fetchStoreItems()
  }, [])

  const fetchUserPoints = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3001/api/game/points', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserPoints(data.points)
      }
    } catch (error) {
      console.error('获取用户积分失败:', error)
    }
  }

  const fetchStoreItems = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3001/api/store/items', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStoreItems(data.items || [])
      }
    } catch (error) {
      console.error('获取商城物品失败:', error)
    }
    setLoading(false)
  }

  const handlePurchase = async (item: StoreItem) => {
    if (!userPoints || userPoints.availablePoints < item.cost) {
      alert('积分不足！')
      return
    }

    if (item.limitPerUser && item.userPurchases && item.userPurchases >= item.limitPerUser) {
      alert('已达到购买限制！')
      return
    }

    setPurchasing(item.id)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3001/api/store/purchase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: item.id
        })
      })

      if (response.ok) {
        alert(`成功兑换 ${item.name}！`)
        // 重新获取积分和商品信息
        fetchUserPoints()
        fetchStoreItems()
      } else {
        throw new Error('兑换失败')
      }
    } catch (error) {
      console.error('兑换失败:', error)
      alert('兑换失败，请重试')
    }

    setPurchasing(null)
  }

  const getFilteredItems = () => {
    if (selectedCategory === 'all') {
      return storeItems
    }
    return storeItems.filter(item => item.category === selectedCategory)
  }

  const canPurchase = (item: StoreItem) => {
    if (!userPoints) return false
    if (userPoints.availablePoints < item.cost) return false
    if (!item.available) return false
    if (item.limitPerUser && item.userPurchases && item.userPurchases >= item.limitPerUser) return false
    return true
  }

  const getLevelProgress = () => {
    if (!userPoints) return 0
    const currentLevelBase = userPoints.level * 1000
    const nextLevelBase = (userPoints.level + 1) * 1000
    const progress = Math.min(((userPoints.totalPoints - currentLevelBase) / (nextLevelBase - currentLevelBase)) * 100, 100)
    return Math.max(progress, 0)
  }

  if (loading) {
    return (
      <div className="points-store-loading">
        <div className="loading-spinner">💎</div>
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="points-store-container">
      <div className="points-store-header">
        {onBack && (
          <button onClick={onBack} className="back-button">
            ← 返回
          </button>
        )}
        <h1>🏪 积分商城</h1>
        <p>用你的积分兑换心仪的奖励</p>
      </div>

      {/* 积分信息 */}
      {userPoints && (
        <div className="points-info-section">
          <div className="points-card">
            <div className="points-main">
              <div className="available-points">
                <span className="points-icon">💎</span>
                <div className="points-details">
                  <div className="points-number">{userPoints.availablePoints}</div>
                  <div className="points-label">可用积分</div>
                </div>
              </div>

              <div className="level-info">
                <div className="level-badge">Lv.{userPoints.level}</div>
                <div className="level-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${getLevelProgress()}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {Math.round(getLevelProgress())}% 到下一级
                  </div>
                </div>
              </div>
            </div>

            <div className="points-stats">
              <div className="stat-item">
                <span className="stat-number">{userPoints.totalPoints}</span>
                <span className="stat-label">总积分</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{userPoints.spentPoints}</span>
                <span className="stat-label">已消费</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分类选择 */}
      <div className="categories-section">
        <div className="categories-scroll">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 商品列表 */}
      <div className="store-items-section">
        <div className="items-grid">
          {getFilteredItems().length > 0 ? getFilteredItems().map(item => (
            <div key={item.id} className={`store-item ${!item.available ? 'unavailable' : ''}`}>
              <div className="item-icon">{item.icon}</div>

              <div className="item-info">
                <h3 className="item-name">{item.name}</h3>
                <p className="item-description">{item.description}</p>

                <div className="item-footer">
                  <div className="item-cost">
                    <span className="cost-icon">💎</span>
                    <span className="cost-number">{item.cost}</span>
                  </div>

                  {item.limitPerUser && (
                    <div className="item-limit">
                      限购 {item.limitPerUser} 次
                      {item.userPurchases && (
                        <span className="purchased-count">
                          (已购买 {item.userPurchases} 次)
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!canPurchase(item) || purchasing === item.id}
                    className={`purchase-button ${canPurchase(item) ? 'available' : 'disabled'}`}
                  >
                    {purchasing === item.id ? (
                      <>
                        <span className="loading-spinner">⏳</span>
                        兑换中...
                      </>
                    ) : !item.available ? (
                      '暂不可用'
                    ) : userPoints && userPoints.availablePoints < item.cost ? (
                      '积分不足'
                    ) : item.limitPerUser && item.userPurchases && item.userPurchases >= item.limitPerUser ? (
                      '已达限制'
                    ) : (
                      '立即兑换'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-items">
              <div className="empty-icon">🛍️</div>
              <p>该分类暂无商品</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PointsStore