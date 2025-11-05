import React, { useState } from 'react'
import './Login.css'

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>
  onSwitchToRegister: () => void
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }

    setLoading(true)
    setError('')

    try {
      const success = await onLogin(username, password)
      if (!success) {
        setError('用户名或密码错误')
      }
    } catch (error) {
      setError('登录失败，请稍后重试')
    }

    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">📚</div>
          <h1>悦读之旅</h1>
          <p>欢迎回来！开始您的阅读之旅</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="form-input"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            还没有账号？
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToRegister}
              disabled={loading}
            >
              立即注册
            </button>
          </p>
        </div>

        <div className="demo-accounts">
          <h3>🎯 演示账号</h3>
          <div className="demo-grid">
            <div className="demo-account">
              <div className="demo-role">👶 儿童</div>
              <div className="demo-info">用户名: child1</div>
              <div className="demo-info">密码: 123456</div>
            </div>
            <div className="demo-account">
              <div className="demo-role">👨‍👩‍👧‍👦 家长</div>
              <div className="demo-info">用户名: parent1</div>
              <div className="demo-info">密码: 123456</div>
            </div>
            <div className="demo-account">
              <div className="demo-role">👩‍🏫 老师</div>
              <div className="demo-info">用户名: teacher1</div>
              <div className="demo-info">密码: 123456</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login