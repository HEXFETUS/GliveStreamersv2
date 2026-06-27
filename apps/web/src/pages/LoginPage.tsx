import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import logo from '../public/img/glivestreamers-logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,160,0.28),transparent_26%),radial-gradient(circle_at_82%_15%,rgba(0,180,255,0.24),transparent_30%),linear-gradient(120deg,#050816_0%,#0b1026_42%,#18042a_100%)]" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute left-[10%] top-[18%] h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute bottom-[10%] right-[12%] h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative z-10 grid min-h-screen gap-10 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 xl:px-16">
        <section className="flex min-h-[54vh] flex-col justify-between lg:min-h-full">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={logo}
                alt="GLiveStreamers"
                className="h-16 w-52 rounded-lg object-cover object-center shadow-[0_0_35px_rgba(217,70,239,0.55)]"
              />
              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold shadow-[0_0_30px_rgba(14,165,233,0.18)] backdrop-blur">
                <span className="mr-2 inline-block h-3 w-3 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.95)]" />
                LIVE
              </div>
            </div>

            <div className="mt-16 max-w-xl">
              <h1 className="text-6xl font-black leading-[0.95] tracking-normal md:text-7xl">
                Go Live.
                <br />
                Play.
                <span className="ml-3 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-blue-400 bg-clip-text italic text-transparent">
                  Inspire.
                </span>
              </h1>
              <p className="mt-7 max-w-lg text-xl leading-relaxed text-slate-200/85">
                The ultimate live streaming platform for gamers, creators, and communities.
              </p>
            </div>

            <div className="mt-10 grid max-w-xl gap-5">
              <FeaturePill accent="from-violet-500 to-blue-500" title="Ultra Low Latency" text="Real-time streaming with minimal delay" />
              <FeaturePill accent="from-cyan-400 to-blue-600" title="Engage Your Community" text="Chat, reactions, and live viewer interaction" />
              <FeaturePill accent="from-lime-400 to-emerald-500" title="Powerful Platform Tools" text="Lifecycle, metadata, analytics, and SDK events" />
            </div>
          </div>

          <div className="mt-12 grid max-w-3xl grid-cols-3 overflow-hidden rounded-2xl border border-fuchsia-400/40 bg-black/35 shadow-[0_0_42px_rgba(217,70,239,0.35)] backdrop-blur-xl">
            <Stat label="Live Streams" value="1.2K+" />
            <Stat label="Active Viewers" value="24K+" />
            <Stat label="Communities" value="8.5K+" />
          </div>
        </section>

        <section className="flex items-center justify-center pb-6 lg:pb-0">
          <div className="w-full max-w-xl rounded-[2rem] border border-cyan-300/30 bg-slate-950/58 p-6 shadow-[0_0_55px_rgba(14,165,233,0.24),0_0_90px_rgba(236,72,153,0.18)] backdrop-blur-2xl md:p-10">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-fuchsia-400/70 bg-black/60 p-2 shadow-[0_0_35px_rgba(236,72,153,0.65)]">
              <img src={logo} alt="" className="h-full w-full rounded-full object-cover object-left" />
            </div>

            <div className="mt-7 text-center">
              <h2 className="text-4xl font-black tracking-normal">Welcome Back</h2>
              <p className="mt-3 text-lg text-slate-300">Sign in to your GLiveStreamers account</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              {error && (
                <p className="rounded-xl border border-red-400/30 bg-red-950/50 px-4 py-3 text-center text-sm text-red-200">
                  {error}
                </p>
              )}

              <label className="group flex h-16 items-center gap-4 rounded-xl border border-white/15 bg-black/25 px-5 text-slate-300 transition focus-within:border-cyan-300/80 focus-within:shadow-[0_0_24px_rgba(34,211,238,0.2)]">
                <span className="text-xl text-slate-400">@</span>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <label className="group flex h-16 items-center gap-4 rounded-xl border border-white/15 bg-black/25 px-5 text-slate-300 transition focus-within:border-fuchsia-300/80 focus-within:shadow-[0_0_24px_rgba(217,70,239,0.2)]">
                <span className="text-xl text-slate-400">#</span>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-fuchsia-500" defaultChecked />
                  Remember me
                </label>
                <button type="button" className="text-cyan-300 transition hover:text-cyan-100">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-16 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-600 to-blue-500 text-lg font-black shadow-[0_0_30px_rgba(236,72,153,0.45)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
                <span className="ml-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl text-blue-600">
                  &rarr;
                </span>
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4 text-sm text-slate-400">
              <div className="h-px flex-1 bg-white/10" />
              or continue with
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <SocialButton label="Google" />
              <SocialButton label="Twitch" />
              <SocialButton label="Discord" />
            </div>

            <p className="mt-8 text-center text-sm text-slate-400">
              New to GLiveStreamers?{' '}
              <Link to="/register" className="font-semibold text-cyan-300 hover:text-cyan-100">
                Create account &rarr;
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeaturePill({ accent, title, text }: { accent: string; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${accent} shadow-[0_0_24px_rgba(59,130,246,0.45)]`} />
      <div>
        <p className="font-bold text-white">{title}</p>
        <p className="text-sm leading-relaxed text-slate-300/85">{text}</p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-white/10 p-5 text-center last:border-r-0">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{label}</p>
    </div>
  );
}

function SocialButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="h-14 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
    >
      {label}
    </button>
  );
}
