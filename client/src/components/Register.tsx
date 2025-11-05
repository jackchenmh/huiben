import React, { useState } from 'react'
import './Register.css'

interface RegisterProps {
  onRegister: (userData: any) => Promise<{success: boolean, error?: string}>
  onSwitchToLogin: () => void
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    displayName: '',
    role: 'child' as 'child' | 'parent' | 'teacher'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证表单
    if (!formData.username.trim() || !formData.password.trim() || !formData.email.trim() || !formData.displayName.trim()) {
      setError('请填写所有必填字段')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (formData.password.length < 6) {
      setError('密码长度至少6位')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Remove confirmPassword before sending to server
      const { confirmPassword, ...registerData } = formData
      const result = await onRegister(registerData)
      if (!result.success) {
        setError(result.error || '注册失败，请稍后重试')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    }

    setLoading(false)
  }

  const getRoleDescription = (role: string) => {
    const descriptions = {
      child: '可以进行阅读打卡，查看自己的积分和徽章',
      parent: '可以查看和管理孩子的阅读进度，添加评论',
      teacher: '可以管理学生的阅读活动，查看班级统计'
    }
    return descriptions[role as keyof typeof descriptions]
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="logo">🌟</div>
          <h1>加入悦读之旅</h1>
          <p>创建账号，开始美好的阅读体验</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">用户名 *</label>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="请输入用户名"
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="displayName">显示名称 *</label>
              <input
                id="displayName"
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="请输入显示名称"
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">邮箱 *</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="请输入邮箱地址"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">角色类型 *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="child">👶 儿童</option>
              <option value="parent">👨‍👩‍👧‍👦 家长</option>
              <option value="teacher">👩‍🏫 老师</option>
            </select>
            <div className="role-description">
              {getRoleDescription(formData.role)}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">密码 *</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="请输入密码"
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码 *</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="请再次输入密码"
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? '注册中...' : '立即注册'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            已有账号？
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToLogin}
              disabled={loading}
            >
              立即登录
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register