import { useState } from 'react'

type User = {
  id: string
  email: string
  name: string
}

type LoginPageProps = {
  onLogin: (user: User, token: string) => void
  onBack: () => void
}

const API_BASE = ''

function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      onLogin(data.user, data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError(null)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card mx-4 sm:mx-auto">
        <button type="button" className="auth-back" onClick={onBack}>
          {'\u2190'} Back
        </button>

        <div className="brand auth-brand">
          <div className="brand-mark" aria-hidden="true">
            S
          </div>
          <div>
            <strong>StreamPOC</strong>
            <span>{mode === 'login' ? 'Creator login' : 'Create account'}</span>
          </div>
        </div>

        <h1 className="auth-title text-[22px] sm:text-[26px]">
          {mode === 'login' ? 'Welcome back' : 'Join StreamPOC'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to open your streamer dashboard.'
            : 'Create an account and start streaming.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={4}
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>

        <p className="auth-hint">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button type="button" className="auth-switch" onClick={switchMode}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="auth-switch" onClick={switchMode}>
                Log in
              </button>
            </>
          )}
        </p>

        <p className="auth-hint auth-demo-hint">
          Demo accounts: <strong>demo@streampoc.com</strong> / <strong>demo123</strong>
        </p>
      </div>
    </div>
  )
}

export default LoginPage