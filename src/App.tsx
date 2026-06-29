import { useState, useEffect, useCallback } from 'react'
import './App.css'
import HomePage from './HomePage'
import LoginPage from './LoginPage'
import Dashboard from './Dashboard'
import WatchPage from './WatchPage'

type User = {
  id: string
  email: string
  name: string
}

type Page =
  | { name: 'home' }
  | { name: 'login' }
  | { name: 'dashboard' }
  | { name: 'watch'; roomName: string }

const AUTH_KEY = 'streampoc-auth'

function getPageFromPath(path: string): Page {
  if (path.startsWith('/watch/')) {
    const roomName = decodeURIComponent(path.slice('/watch/'.length))
    return { name: 'watch', roomName }
  }
  if (path === '/login') return { name: 'login' }
  if (path === '/dashboard') return { name: 'dashboard' }
  return { name: 'home' }
}

function App() {
  const [page, setPage] = useState<Page>(() => getPageFromPath(window.location.pathname))
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Sync URL changes (back/forward browser buttons)
  useEffect(() => {
    const onPopState = () => {
      setPage(getPageFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Navigate with URL update
  const navigate = useCallback((newPage: Page) => {
    setPage(newPage)
    const path = newPage.name === 'watch' ? `/watch/${encodeURIComponent(newPage.roomName)}` : `/${newPage.name}`
    window.history.pushState({}, '', path)
  }, [])

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.user && parsed.token) {
          setUser(parsed.user)
          setToken(parsed.token)
        }
      }
    } catch {
      localStorage.removeItem(AUTH_KEY)
    }
  }, [])

  // Redirect to dashboard if already logged in on protected pages
  useEffect(() => {
    if ((page.name === 'login' || page.name === 'dashboard') && user) {
      navigate({ name: 'dashboard' })
    }
  }, [page.name, user, navigate])

  const handleLogin = useCallback((loggedInUser: User, authToken: string) => {
    setUser(loggedInUser)
    setToken(authToken)
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user: loggedInUser, token: authToken }))
    navigate({ name: 'dashboard' })
  }, [navigate])

  const handleLogout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(AUTH_KEY)
    navigate({ name: 'home' })
  }, [navigate])

  if (page.name === 'login') {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={() => navigate({ name: 'home' })}
      />
    )
  }

  if (page.name === 'dashboard') {
    return (
      <Dashboard
        user={user}
        token={token}
        onLogout={handleLogout}
      />
    )
  }

  if (page.name === 'watch') {
    return (
      <WatchPage
        roomName={page.roomName}
        onBack={() => navigate({ name: 'home' })}
      />
    )
  }

  return (
    <HomePage
      onLoginClick={() => navigate({ name: 'login' })}
      onWatchStream={(roomName) => navigate({ name: 'watch', roomName })}
    />
  )
}

export default App
