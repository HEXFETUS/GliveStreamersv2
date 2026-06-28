import { Link } from 'react-router-dom';

const liveStreams = [
  {
    streamer: 'shroud',
    game: 'VALORANT',
    category: 'FPS',
    viewers: '12.4K',
    avatar: 'bg-gradient-to-br from-stone-200 via-rose-200 to-stone-700',
    thumbnail:
      'radial-gradient(circle at 24% 18%, rgba(245, 158, 11, 0.65), transparent 15%), linear-gradient(135deg, rgba(31, 41, 55, 0.96), rgba(120, 53, 15, 0.78) 48%, rgba(17, 24, 39, 0.98))',
    accent: 'bg-amber-300/70',
  },
  {
    streamer: 'TGLTN',
    game: 'PUBG: BATTLEGROUNDS',
    category: 'BATTLE ROYALE',
    viewers: '8.7K',
    avatar: 'bg-gradient-to-br from-slate-100 via-slate-400 to-slate-900',
    thumbnail:
      'linear-gradient(180deg, rgba(186, 230, 253, 0.92), rgba(74, 222, 128, 0.55) 46%, rgba(63, 42, 25, 0.95)), radial-gradient(circle at 50% 62%, rgba(15, 23, 42, 0.8), transparent 18%)',
    accent: 'bg-emerald-300/70',
  },
  {
    streamer: 'Faker',
    game: 'League of Legends',
    category: 'MOBA',
    viewers: '5.6K',
    avatar: 'bg-gradient-to-br from-zinc-100 via-zinc-500 to-red-950',
    thumbnail:
      'radial-gradient(circle at 54% 48%, rgba(249, 115, 22, 0.8), transparent 12%), linear-gradient(135deg, rgba(21, 128, 61, 0.74), rgba(22, 101, 52, 0.95) 48%, rgba(15, 23, 42, 0.96))',
    accent: 'bg-lime-300/70',
  },
  {
    streamer: 'zackrawr',
    game: 'Elden Ring',
    category: 'RPG',
    viewers: '3.2K',
    avatar: 'bg-gradient-to-br from-slate-100 via-slate-500 to-slate-950',
    thumbnail:
      'radial-gradient(circle at 27% 70%, rgba(251, 146, 60, 0.75), transparent 13%), linear-gradient(135deg, rgba(64, 64, 64, 0.98), rgba(41, 37, 36, 0.96) 48%, rgba(12, 10, 9, 1))',
    accent: 'bg-orange-300/70',
  },
  {
    streamer: 'Clix',
    game: 'Fortnite',
    category: 'BATTLE ROYALE',
    viewers: '2.1K',
    avatar: 'bg-gradient-to-br from-sky-100 via-cyan-500 to-slate-950',
    thumbnail:
      'linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(6, 182, 212, 0.74) 45%, rgba(30, 64, 175, 0.98)), repeating-linear-gradient(55deg, transparent 0 18px, rgba(255,255,255,0.24) 18px 22px)',
    accent: 'bg-cyan-200/80',
  },
];

const navItems = ['Home', 'Browse', 'Categories'];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#03060d] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#03060d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[94px] max-w-[1536px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex min-w-fit items-center gap-3">
            <img src="/img/Glogo.png" alt="GameLive" className="h-10 w-10 rounded-xl object-contain" />
            <span className="text-xl font-bold tracking-tight sm:text-2xl">GLiveStreamers</span>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {navItems.map((item) => (
              <Link
                key={item}
                to={item === 'Home' ? '/' : '#'}
                className={`relative py-9 text-base transition-colors ${
                  item === 'Home' ? 'text-[#8b5cf6]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {item}
                {item === 'Home' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#8b5cf6]" />
                )}
              </Link>
            ))}
          </nav>

          <label className="hidden h-12 w-full max-w-[424px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-gray-400 shadow-inner shadow-black/20 lg:flex">
            <SearchIcon />
            <input
              type="search"
              placeholder="Search games, streamers..."
              className="w-full bg-transparent text-base text-white placeholder:text-gray-500 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg border border-white/10 px-5 py-3 text-sm font-medium text-[#9b5cff] transition-colors hover:border-[#8b5cf6]/60 hover:bg-[#8b5cf6]/10"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition-colors hover:bg-[#7c3aed]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[452px] border-b border-white/[0.03]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_36%,rgba(109,40,217,0.5),transparent_30%),linear-gradient(90deg,#03060d_0%,rgba(3,6,13,0.94)_28%,rgba(24,13,71,0.78)_62%,rgba(3,6,13,0.98)_100%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[58%] overflow-hidden md:block">
          <div className="absolute bottom-0 right-[10%] h-[78%] w-[72%] rounded-tl-[12rem] bg-[radial-gradient(circle_at_70%_32%,rgba(168,85,247,0.3),transparent_20%),linear-gradient(160deg,rgba(49,46,129,0.35),rgba(9,9,17,0.98)_72%)] opacity-90" />
          <div className="absolute bottom-0 right-0 h-28 w-full bg-gradient-to-t from-[#03060d] to-transparent" />
          <div className="absolute bottom-24 right-[17%] h-16 w-72 -skew-x-12 rounded-[50%] bg-black/70 shadow-2xl shadow-black" />
          <div className="absolute bottom-28 right-[24%] h-48 w-20 rounded-t-full bg-gradient-to-b from-slate-300/80 via-violet-500/55 to-slate-950 shadow-2xl shadow-violet-950/60" />
          <div className="absolute bottom-[18.3rem] right-[26.6%] h-11 w-11 rounded-full bg-gradient-to-b from-slate-200 to-slate-700" />
          <div className="absolute bottom-52 right-[20%] h-24 w-5 rotate-[22deg] rounded-full bg-slate-600/80" />
          <div className="absolute bottom-52 right-[33%] h-24 w-5 -rotate-[24deg] rounded-full bg-slate-600/80" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-[1536px] px-5 py-20 sm:px-8 md:py-24">
          <div className="max-w-[620px]">
            <h1 className="text-5xl font-extrabold leading-[1.12] tracking-normal sm:text-6xl">
              Watch Live Streams
              <span className="block">Play Together</span>
            </h1>
            <p className="mt-6 text-xl text-gray-300">
              Discover live streams and join the gaming community.
            </p>
            <Link
              to="/login"
              className="mt-9 inline-flex h-16 items-center gap-3 rounded-lg bg-gradient-to-r from-[#7438ff] to-[#7c3dff] px-8 text-xl font-semibold text-white shadow-xl shadow-violet-950/50 transition-transform hover:-translate-y-0.5"
            >
              <BroadcastIcon />
              Browse Live Streams
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1536px] px-5 pb-10 pt-8 sm:px-8">
        <div className="mb-7 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Live Now</h2>
          <Link to="/register" className="flex items-center gap-2 text-lg font-medium text-[#9b5cff] hover:text-white">
            View All <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {liveStreams.map((stream) => (
            <article
              key={stream.streamer}
              className="overflow-hidden rounded-lg border border-white/[0.04] bg-[#0b0f19] shadow-xl shadow-black/20"
            >
              <div className="relative aspect-[16/10] overflow-hidden" style={{ background: stream.thumbnail }}>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_54%,rgba(0,0,0,0.35))]" />
                <div className="absolute left-3 top-3 rounded bg-red-500 px-3 py-1 text-sm font-bold leading-none text-white shadow-lg shadow-red-950/50">
                  LIVE
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded bg-black/70 px-2.5 py-1 text-sm font-medium leading-none text-white">
                  <EyeIcon />
                  {stream.viewers}
                </div>
                <div className={`absolute bottom-5 left-[16%] h-12 w-[68%] rounded-full blur-2xl ${stream.accent}`} />
                <div className="absolute bottom-3 left-[10%] h-10 w-[80%] rounded-sm border border-white/10 bg-black/20" />
              </div>
              <div className="flex min-h-[136px] gap-4 bg-gradient-to-b from-[#111722] to-[#090d15] p-4">
                <div className={`mt-1 h-12 w-12 shrink-0 rounded-full border-2 border-white/70 ${stream.avatar}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">{stream.streamer}</h3>
                    <VerifiedIcon />
                  </div>
                  <p className="mt-1 truncate text-base text-gray-400">{stream.game}</p>
                  <span className="mt-5 inline-flex rounded-md bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-gray-400">
                    {stream.category}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.5 16.5a6.4 6.4 0 0 1 0-9M5.5 19.5a10.6 10.6 0 0 1 0-15M15.5 7.5a6.4 6.4 0 0 1 0 9M18.5 4.5a10.6 10.6 0 0 1 0 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-[#8b5cf6]" viewBox="0 0 20 20" fill="currentColor" aria-label="Verified">
      <path fillRule="evenodd" d="M10 1.8 12.1 4l3-.2.8 2.9 2.5 1.7-1.4 2.7.5 3-3 .8-2 2.3-2.8-1.2-2.8 1.2-2-2.3-3-.8.5-3-1.4-2.7 2.5-1.7.8-2.9 3 .2L10 1.8Zm3.3 6.6a1 1 0 0 0-1.4-1.4L9.2 9.7 8.1 8.6a1 1 0 0 0-1.4 1.4l1.8 1.8a1 1 0 0 0 1.4 0l3.4-3.4Z" clipRule="evenodd" />
    </svg>
  );
}
