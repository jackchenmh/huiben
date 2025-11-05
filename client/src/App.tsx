import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import './App.css'

const AppContent: React.FC = () => {
  const { user, login, register, loading } = useAuth()
  const [isLoginView, setIsLoginView] = useState(true)

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">📚</div>
        <p>加载中...</p>
      </div>
    )
  }

  if (!user) {
    return isLoginView ? (
      <Login
        onLogin={login}
        onSwitchToRegister={() => setIsLoginView(false)}
      />
    ) : (
      <Register
        onRegister={register}
        onSwitchToLogin={() => setIsLoginView(true)}
      />
    )
  }

  return <Dashboard />
}

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <AppContent />
      </div>
    </AuthProvider>
  )
}

export default App