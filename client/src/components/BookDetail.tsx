import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './BookDetail.css'

interface Book {
  id: number
  title: string
  author: string
  description: string
  coverUrl?: string
  category: string
  ageGroup: string
  difficulty: number
  pages: number
  isbn?: string
  publisher?: string
  publishedYear?: number
  tags: string[]
}

interface BookDetailProps {
  bookId: number
  onBack: () => void
  onStartReading: (book: Book) => void
}

const BookDetail: React.FC<BookDetailProps> = ({ bookId, onBack, onStartReading }) => {
  const { user } = useAuth()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [readingHistory, setReadingHistory] = useState<any[]>([])

  useEffect(() => {
    fetchBookDetail()
    fetchReadingHistory()
  }, [bookId])

  const fetchBookDetail = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`http://localhost:3001/api/books/${bookId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBook(data.book)
      }
    } catch (error) {
      console.error('获取书籍详情失败:', error)
    }
    setLoading(false)
  }

  const fetchReadingHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`http://localhost:3001/api/checkins/book/${bookId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReadingHistory(data.checkins || [])
      }
    } catch (error) {
      console.error('获取阅读历史失败:', error)
    }
  }

  const getDifficultyStars = (difficulty: number) => {
    return '⭐'.repeat(Math.min(difficulty, 5))
  }

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['', '很简单', '简单', '一般', '有点难', '很难']
    return labels[Math.min(difficulty, 5)] || '未知'
  }

  const getAgeGroupIcon = (ageGroup: string) => {
    const icons: { [key: string]: string } = {
      '3-6': '👶',
      '6-9': '🧒',
      '9-12': '👦',
      '12-15': '👨‍🎓',
      '15+': '👨‍💼'
    }
    return icons[ageGroup] || '📚'
  }

  const getTotalReadingTime = () => {
    return readingHistory.reduce((total, record) => total + (record.readingTime || 0), 0)
  }

  const getTotalPages = () => {
    return readingHistory.reduce((total, record) => total + (record.pagesRead || 0), 0)
  }

  if (loading) {
    return (
      <div className="book-detail-loading">
        <div className="loading-spinner">📚</div>
        <p>加载中...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="book-detail-error">
        <div className="error-icon">😞</div>
        <h2>书籍不存在</h2>
        <button onClick={onBack} className="back-button">返回</button>
      </div>
    )
  }

  return (
    <div className="book-detail-container">
      <div className="book-detail-header">
        <button onClick={onBack} className="back-button">
          ← 返回
        </button>
        <h1>书籍详情</h1>
      </div>

      <div className="book-detail-content">
        {/* 书籍基本信息 */}
        <div className="book-info-section">
          <div className="book-cover-large">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} />
            ) : (
              <div className="book-placeholder-large">📚</div>
            )}
          </div>

          <div className="book-details">
            <h2 className="book-title">{book.title}</h2>
            <p className="book-author">作者: {book.author}</p>

            <div className="book-meta-grid">
              <div className="meta-item">
                <span className="meta-label">分类</span>
                <span className="meta-value category-tag">{book.category}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">适合年龄</span>
                <span className="meta-value age-group">
                  {getAgeGroupIcon(book.ageGroup)} {book.ageGroup}岁
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">难度</span>
                <span className="meta-value difficulty">
                  {getDifficultyStars(book.difficulty)} {getDifficultyLabel(book.difficulty)}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">总页数</span>
                <span className="meta-value">{book.pages} 页</span>
              </div>

              {book.publisher && (
                <div className="meta-item">
                  <span className="meta-label">出版社</span>
                  <span className="meta-value">{book.publisher}</span>
                </div>
              )}

              {book.publishedYear && (
                <div className="meta-item">
                  <span className="meta-label">出版年份</span>
                  <span className="meta-value">{book.publishedYear}年</span>
                </div>
              )}
            </div>

            <div className="book-tags">
              {book.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>

            <div className="action-buttons">
              <button
                onClick={() => onStartReading(book)}
                className="start-reading-button"
              >
                <span>📖</span>
                开始阅读
              </button>
            </div>
          </div>
        </div>

        {/* 书籍描述 */}
        <div className="book-description-section">
          <h3>📝 内容简介</h3>
          <p className="book-description">{book.description}</p>
        </div>

        {/* 阅读统计 */}
        {readingHistory.length > 0 && (
          <div className="reading-stats-section">
            <h3>📊 我的阅读统计</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📖</div>
                <div className="stat-number">{readingHistory.length}</div>
                <div className="stat-label">阅读次数</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⏰</div>
                <div className="stat-number">{getTotalReadingTime()}</div>
                <div className="stat-label">总时长(分钟)</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📄</div>
                <div className="stat-number">{getTotalPages()}</div>
                <div className="stat-label">已读页数</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-number">{Math.round((getTotalPages() / book.pages) * 100)}%</div>
                <div className="stat-label">完成进度</div>
              </div>
            </div>
          </div>
        )}

        {/* 阅读历史 */}
        {readingHistory.length > 0 && (
          <div className="reading-history-section">
            <h3>📚 阅读历史</h3>
            <div className="history-list">
              {readingHistory.map((record, index) => (
                <div key={index} className="history-item">
                  <div className="history-date">
                    {new Date(record.checkinDate).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}
                  </div>

                  <div className="history-details">
                    <div className="history-stats">
                      <span className="stat">⏰ {record.readingTime}分钟</span>
                      <span className="stat">📄 {record.pagesRead}页</span>
                      <span className="stat">🧠 理解度 {record.comprehensionLevel}/10</span>
                      <span className="stat mood">{record.mood}</span>
                    </div>

                    {record.notes && (
                      <div className="history-notes">
                        <h4>📝 阅读笔记</h4>
                        <p>{record.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {readingHistory.length === 0 && (
          <div className="no-history-section">
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>还没有阅读记录</h3>
              <p>开始你的第一次阅读吧！</p>
              <button
                onClick={() => onStartReading(book)}
                className="start-reading-button"
              >
                <span>📖</span>
                开始阅读
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookDetail