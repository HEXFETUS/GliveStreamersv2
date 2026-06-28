import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Login failed');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#070b14] px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Central nebula glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-6 rounded-2xl border border-white/[0.06] bg-[#0b1120]/90 px-8 py-10 shadow-2xl backdrop-blur-xl"
        >
          {/* Logo */}
          <img
            src="/img/Glogo.png"
            alt="GLiveStreamers"
            className="h-20 w-auto"
          />

          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
            <p className="text-sm text-gray-400">Sign in to your GLiveStreamers account</p>
          </div>

          {/* Error */}
          {error && (
            <p className="w-full text-sm text-red-400 text-center bg-red-950/60 rounded px-3 py-2 border border-red-900/40">
              {error}
            </p>
          )}

          {/* Form fields */}
          <div className="w-full flex flex-col gap-4">
            {/* Email */}
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              <svg className="h-5 w-5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
              </svg>
              <input
                type="email"
                placeholder="mikeedapoo@hexfetus.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>

            {/* Password */}
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              <svg className="h-5 w-5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300">Remember me</span>
              </label>

              <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-pink-500 to-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-pink-500/20 transition-all hover:shadow-pink-500/30 disabled:opacity-60"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm transition-transform group-hover:scale-105">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex w-full items-center gap-4">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-gray-500">or continue with</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* Social logins */}
          <div className="grid w-full grid-cols-3 gap-3">
            <button type="button" className="rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.06]">
              Google
            </button>
            <button type="button" className="rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.06]">
              Twitch
            </button>
            <button type="button" className="rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.06]">
              Discord
            </button>
          </div>

          {/* Create account */}
          <p className="text-center text-sm text-gray-400">
            New to GLiveStreamers?{' '}
            <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 hover:underline">
              Create account
            </Link>
            <span className="text-gray-500"> →</span>
          </p>

          <Link
            to="/"
            className="text-sm font-medium text-purple-400 transition-colors hover:text-purple-300 hover:underline"
          >
            Back to homepage
          </Link>
        </form>
      </main>
    </div>
  );
}
