import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './CheckIn.css'

interface Book {
  id: number
  title: string
  author: string
  cover?: string
  ageGroup: string
  difficulty: number
}

interface CheckInData {
  bookId: number
  readingTime: number
  pagesRead: number
  notes: string
  mood: string
  comprehensionLevel: number
}

interface CheckInProps {
  onBack?: () => void
}

const CheckIn: React.FC<CheckInProps> = ({ onBack }) => {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [checkInData, setCheckInData] = useState<CheckInData>({
    bookId: 0,
    readingTime: 0,
    pagesRead: 0,
    notes: '',
    mood: '😊',
    comprehensionLevel: 5
  })
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const moods = [
    { emoji: '😊', name: '开心' },
    { emoji: '🤔', name: '思考' },
    { emoji: '😮', name: '惊讶' },
    { emoji: '😴', name: '困倦' },
    { emoji: '🤗', name: '感动' },
    { emoji: '😎', name: '酷炫' }
  ]

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3001/api/books', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBooks(data.books || [])
      }
    } catch (error) {
      console.error('获取书籍列表失败:', error)
    }
  }

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book)
    setCheckInData(prev => ({ ...prev, bookId: book.id }))
  }

  const handleInputChange = (field: keyof CheckInData, value: string | number) => {
    setCheckInData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBook || checkInData.readingTime <= 0) {
      alert('请选择书籍并填写阅读时长')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3001/api/checkins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookId: checkInData.bookId,
          readingTime: checkInData.readingTime,
          notes: checkInData.notes
        })
      })

      if (response.ok) {
        setShowSuccess(true)
        // 重置表单
        setCheckInData({
          bookId: 0,
          readingTime: 0,
          pagesRead: 0,
          notes: '',
          mood: '😊',
          comprehensionLevel: 5
        })
        setSelectedBook(null)

        setTimeout(() => {
          setShowSuccess(false)
        }, 3000)
      } else {
        throw new Error('打卡失败')
      }
    } catch (error) {
      console.error('打卡失败:', error)
      alert('打卡失败，请重试')
    }

    setLoading(false)
  }

  const getDifficultyStars = (difficulty: number) => {
    return '⭐'.repeat(Math.min(difficulty, 5))
  }

  if (showSuccess) {
    return (
      <div className="checkin-success">
        <div className="success-animation">🎉</div>
        <h2>打卡成功！</h2>
        <p>你获得了 {checkInData.readingTime} 积分</p>
        <button onClick={() => setShowSuccess(false)} className="continue-button">
          继续阅读
        </button>
        {onBack && (
          <button onClick={onBack} className="back-button-success">
            返回首页
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="checkin-container">
      <div className="checkin-header">
        {onBack && (
          <button onClick={onBack} className="back-button">
            ← 返回
          </button>
        )}
        <h1>📚 阅读打卡</h1>
        <p>记录你的阅读时光</p>
      </div>

      <form onSubmit={handleSubmit} className="checkin-form">
        {/* 选择书籍 */}
        <div className="section">
          <h3>📖 选择今天阅读的书籍</h3>
          <div className="books-grid">
            {books.length > 0 ? books.map(book => (
              <div
                key={book.id}
                className={`book-card ${selectedBook?.id === book.id ? 'selected' : ''}`}
                onClick={() => handleBookSelect(book)}
              >
                <div className="book-cover">
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} />
                  ) : (
                    <div className="book-placeholder">📚</div>
                  )}
                </div>
                <div className="book-info">
                  <h4>{book.title}</h4>
                  <p>{book.author}</p>
                  <div className="book-meta">
                    <span className="difficulty">{getDifficultyStars(book.difficulty)}</span>
                    <span className="category">{book.ageGroup}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="empty-books">
                <div className="empty-icon">📚</div>
                <p>暂无可用书籍</p>
              </div>
            )}
          </div>
        </div>

        {/* 阅读详情 */}
        {selectedBook && (
          <div className="section">
            <h3>⏰ 阅读详情</h3>
            <div className="form-row">
              <div className="form-group">
                <label>阅读时长 (分钟)</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={checkInData.readingTime}
                  onChange={(e) => handleInputChange('readingTime', parseInt(e.target.value) || 0)}
                  className="form-input"
                  placeholder="例如: 30"
                />
              </div>
              <div className="form-group">
                <label>阅读页数</label>
                <input
                  type="number"
                  min="0"
                  value={checkInData.pagesRead}
                  onChange={(e) => handleInputChange('pagesRead', parseInt(e.target.value) || 0)}
                  className="form-input"
                  placeholder="例如: 10"
                />
              </div>
            </div>
          </div>
        )}

        {/* 心情选择 */}
        {selectedBook && (
          <div className="section">
            <h3>😊 今天的阅读心情</h3>
            <div className="mood-grid">
              {moods.map(mood => (
                <div
                  key={mood.emoji}
                  className={`mood-item ${checkInData.mood === mood.emoji ? 'selected' : ''}`}
                  onClick={() => handleInputChange('mood', mood.emoji)}
                >
                  <span className="mood-emoji">{mood.emoji}</span>
                  <span className="mood-name">{mood.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 理解程度 */}
        {selectedBook && (
          <div className="section">
            <h3>🧠 理解程度</h3>
            <div className="comprehension-slider">
              <input
                type="range"
                min="1"
                max="10"
                value={checkInData.comprehensionLevel}
                onChange={(e) => handleInputChange('comprehensionLevel', parseInt(e.target.value))}
                className="slider"
              />
              <div className="slider-labels">
                <span>不太懂</span>
                <span className="current-value">{checkInData.comprehensionLevel}/10</span>
                <span>完全理解</span>
              </div>
            </div>
          </div>
        )}

        {/* 阅读笔记 */}
        {selectedBook && (
          <div className="section">
            <h3>📝 阅读笔记</h3>
            <textarea
              value={checkInData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="notes-textarea"
              placeholder="分享你的阅读感受、有趣的发现或者疑问..."
              rows={4}
            />
          </div>
        )}

        {/* 提交按钮 */}
        {selectedBook && (
          <div className="submit-section">
            <button
              type="submit"
              disabled={loading || !selectedBook || checkInData.readingTime <= 0}
              className="submit-button"
            >
              {loading ? (
                <>
                  <span className="loading-spinner">⏳</span>
                  提交中...
                </>
              ) : (
                <>
                  <span>🎯</span>
                  完成打卡
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

export default CheckIn