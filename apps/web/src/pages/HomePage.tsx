import { Link } from 'react-router-dom';
import logo from '../public/img/glivestreamers-logo.png';

const navItems = ['Browse', 'BetCat7', 'Esports', 'Music', 'Creators'];

const featuredStreams = [
  {
    streamer: 'AceDealer',
    title: 'Casino Night Ranked Tables',
    category: 'Casino',
    viewers: '18.4K',
    accent: 'from-fuchsia-500 via-violet-600 to-cyan-400',
  },
  {
    streamer: 'LuckySeven',
    title: 'Poker Room Finals',
    category: 'Poker',
    viewers: '12.9K',
    accent: 'from-amber-400 via-rose-500 to-violet-600',
  },
  {
    streamer: 'ArcadeRush',
    title: 'Original PVP Challenge',
    category: 'Original',
    viewers: '8.7K',
    accent: 'from-emerald-400 via-cyan-500 to-blue-600',
  },
];

const liveChannels = [
  ['TableRush', 'Casino', 'Dragon Lobby', '8.2K', 'from-rose-500 to-violet-600'],
  ['PinHigh', 'Sports', 'Matchroom Watch Party', '7.4K', 'from-emerald-400 to-cyan-500'],
  ['ArcQueen', 'Arcade', 'Fast Play Duels', '6.8K', 'from-cyan-400 to-blue-600'],
  ['RoyalPair', 'Poker', 'High Stakes Heads Up', '5.9K', 'from-amber-400 to-rose-500'],
  ['BingoBeat', 'Ebingo', 'Room 77 Live', '4.3K', 'from-purple-500 to-fuchsia-500'],
];

const betcatCategories = [
  { name: 'Ebingo', viewers: '42K', accent: 'from-amber-300 to-orange-500' },
  { name: 'Casino', viewers: '96K', accent: 'from-rose-500 to-fuchsia-600' },
  { name: 'Live', viewers: '38K', accent: 'from-red-500 to-pink-500' },
  { name: 'Original', viewers: '54K', accent: 'from-cyan-400 to-blue-600' },
  { name: 'Sports', viewers: '31K', accent: 'from-emerald-400 to-lime-500' },
  { name: 'Poker', viewers: '28K', accent: 'from-violet-500 to-indigo-600' },
  { name: 'Arcade', viewers: '24K', accent: 'from-sky-400 to-purple-600' },
  { name: 'Promo', viewers: '19K', accent: 'from-yellow-300 to-pink-500' },
];

const lobbyFilters = ['All', 'Action', 'Arcade', 'Puzzle', 'Strategy', 'Sports', 'Classic'];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050509] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_48%_0%,rgba(124,58,237,0.32),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(6,182,212,0.18),transparent_26%),radial-gradient(circle_at_18%_22%,rgba(244,63,94,0.18),transparent_24%),linear-gradient(180deg,#050509_0%,#090813_52%,#050509_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1760px] items-center gap-6 px-5 sm:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <img src={logo} alt="GLiveStreamers" className="h-10 w-10 rounded-lg object-cover shadow-[0_0_24px_rgba(34,211,238,.35)]" />
            <span className="text-lg font-bold tracking-tight">GLiveStreamers</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-200 lg:flex">
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="transition hover:text-white">
                {item}
              </a>
            ))}
            <button className="text-xl leading-none text-zinc-300 hover:text-white" aria-label="More navigation">
              ...
            </button>
          </nav>

          <label className="ml-auto hidden h-11 min-w-[320px] max-w-lg flex-1 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-4 text-sm text-zinc-400 shadow-inner md:flex">
            <span className="text-xl leading-none">⌕</span>
            <input
              className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
              placeholder="Search"
              type="search"
            />
          </label>

          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">
              Log In
            </Link>
            <Link to="/register" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,.35)] transition hover:bg-violet-500">
              Sign Up
            </Link>
            <Link to="/dashboard" className="hidden h-10 w-10 place-items-center rounded-full border border-white/15 text-lg text-zinc-200 transition hover:bg-white/10 sm:grid" aria-label="Open dashboard">
              ◌
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1760px] gap-10 px-5 pb-8 pt-14 sm:px-8 lg:grid-cols-[minmax(280px,420px)_1fr] lg:items-center lg:pt-20">
        <div className="max-w-xl">
          <p className="mb-4 inline-flex rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-violet-200">
            GLive Platform v2
          </p>
          <h1 className="max-w-lg text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl">
            Live streams you&apos;ll <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">love.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-zinc-300">
            Watch, chat, publish, and integrate livestream experiences for BetCat7 game communities.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link to="/dashboard" className="rounded-md bg-violet-600 px-6 py-3 text-sm font-bold shadow-[0_0_32px_rgba(139,92,246,.45)] transition hover:bg-violet-500">
              Browse Live Streams
            </Link>
            <Link to="/register" className="rounded-md border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-bold transition hover:bg-white/10">
              Sign Up
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <article className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl shadow-violet-950/40">
            <div className={`relative min-h-[310px] bg-gradient-to-br ${featuredStreams[0].accent}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(255,255,255,.34),transparent_18%),radial-gradient(circle_at_28%_58%,rgba(0,0,0,.48),transparent_38%),linear-gradient(135deg,rgba(0,0,0,.10),rgba(0,0,0,.72))]" />
              <div className="absolute left-5 top-5 rounded bg-red-600 px-2 py-1 text-xs font-black">LIVE</div>
              <div className="absolute bottom-5 left-5 rounded bg-black/70 px-3 py-2 text-sm font-semibold">18.4K viewers</div>
              <div className="absolute bottom-8 right-8 h-36 w-56 rounded-lg border border-white/15 bg-black/25 shadow-[0_0_70px_rgba(255,255,255,.16)] backdrop-blur-sm" />
              <div className="absolute right-16 top-12 h-24 w-24 rounded-full border border-white/20 bg-black/35 shadow-[0_0_80px_rgba(255,255,255,.2)]" />
            </div>
            <div className="grid gap-4 border-t border-white/10 bg-black/35 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black">AD</span>
                  <div>
                    <h2 className="font-bold">AceDealer <span className="text-violet-400">●</span></h2>
                    <p className="text-sm text-zinc-400">Casino Night Ranked Tables</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Casino', 'Live', 'Action'].map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button className="rounded-md bg-violet-600 px-8 py-3 text-sm font-bold transition hover:bg-violet-500">
                Follow
              </button>
            </div>
          </article>

          <aside className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">Trending Now</h2>
              <a href="#browse" className="text-xs font-semibold text-violet-300">View all</a>
            </div>
            <div className="space-y-4">
              {featuredStreams.map((stream) => (
                <StreamMini key={stream.streamer} stream={stream} />
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="browse" className="mx-auto max-w-[1760px] px-5 py-8 sm:px-8">
        <SectionHeader title="Live Channels We Think You'll Like" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {liveChannels.map(([streamer, category, title, viewers, accent]) => (
            <LiveCard key={streamer} streamer={streamer} category={category} title={title} viewers={viewers} accent={accent} />
          ))}
        </div>
      </section>

      <section id="betcat7" className="mx-auto max-w-[1760px] px-5 py-8 sm:px-8">
        <SectionHeader title="BetCat7 Categories" />
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {lobbyFilters.map((filter) => (
            <span key={filter} className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-zinc-200">
              {filter}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-8">
          {betcatCategories.map((category) => (
            <CategoryCard key={category.name} category={category} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1760px] px-5 pb-16 pt-8 sm:px-8">
        <div className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 md:grid-cols-4">
          {[
            ['LiveKit Ready', 'Token, room, connect, disconnect'],
            ['Lifecycle', 'Draft to archived stream states'],
            ['Analytics', 'Viewers, peaks, watch time'],
            ['SDK Events', 'Host apps react without polling'],
          ].map(([title, body]) => (
            <div key={title} className="border-white/10 py-3 md:border-r md:last:border-r-0">
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

type FeaturedStream = (typeof featuredStreams)[number];
type BetcatCategory = (typeof betcatCategories)[number];

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <a href="#betcat7" className="text-sm font-semibold text-violet-300 hover:text-violet-200">
        View all &gt;
      </a>
    </div>
  );
}

function StreamMini({ stream }: { stream: FeaturedStream }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-3">
      <div className={`relative h-20 overflow-hidden rounded-md bg-gradient-to-br ${stream.accent}`}>
        <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black">LIVE</span>
        <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[11px] font-bold">{stream.viewers}</span>
      </div>
      <div className="min-w-0 pt-1">
        <p className="truncate text-sm font-bold">{stream.streamer}</p>
        <p className="truncate text-sm text-zinc-400">{stream.title}</p>
        <p className="mt-1 text-xs text-zinc-500">{stream.category}</p>
      </div>
    </div>
  );
}

function LiveCard({
  streamer,
  category,
  title,
  viewers,
  accent,
}: {
  streamer: string;
  category: string;
  title: string;
  viewers: string;
  accent: string;
}) {
  return (
    <article className="group">
      <div className={`relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br ${accent} shadow-lg shadow-black/30`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.30),transparent_18%),linear-gradient(135deg,transparent,rgba(0,0,0,.65))]" />
        <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-xs font-black">LIVE</span>
        <span className="absolute bottom-3 left-3 rounded bg-black/70 px-3 py-1.5 text-xs font-bold">{viewers} viewers</span>
      </div>
      <div className="mt-3 flex gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${accent} text-xs font-black`}>
          {streamer.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-bold">{streamer} <span className="text-violet-400">●</span></h3>
          <p className="truncate text-sm text-zinc-300">{title}</p>
          <p className="mt-1 text-sm text-zinc-500">{category}</p>
        </div>
      </div>
    </article>
  );
}

function CategoryCard({ category }: { category: BetcatCategory }) {
  return (
    <article>
      <div className={`relative aspect-[4/5] overflow-hidden rounded-lg bg-gradient-to-br ${category.accent} shadow-lg shadow-black/30`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,.34),transparent_20%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.72))]" />
        <div className="absolute inset-x-3 bottom-4">
          <p className="text-2xl font-black uppercase leading-none tracking-tight text-white drop-shadow">{category.name}</p>
        </div>
      </div>
      <h3 className="mt-3 truncate font-bold">{category.name}</h3>
      <p className="text-sm text-zinc-500">{category.viewers} viewers</p>
    </article>
  );
}
