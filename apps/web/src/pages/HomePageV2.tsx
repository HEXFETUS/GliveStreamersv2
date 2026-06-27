import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Stream } from '@glive/sdk';
import { api } from '../lib/axios';
import logo from '../public/img/glivestreamers-logo.png';

const navItems = ['Browse', 'BetCat7', 'Games', 'Creators'];

const fallbackChannels = [
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

export default function HomePageV2() {
  const [publicStreams, setPublicStreams] = useState<Stream[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const featuredStream = publicStreams[0] ?? null;
  const trendingStreams = useMemo(() => publicStreams.slice(0, 4), [publicStreams]);

  useEffect(() => {
    let mounted = true;

    const loadStreams = async () => {
      try {
        const streams = await api.listPublicStreams();
        if (mounted) setPublicStreams(streams);
      } catch {
        if (mounted) setPublicStreams([]);
      } finally {
        if (mounted) setLoadingStreams(false);
      }
    };

    loadStreams();
    const timer = window.setInterval(loadStreams, 15000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

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
          </nav>

          <label className="ml-auto hidden h-11 min-w-[320px] max-w-lg flex-1 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-4 text-sm text-zinc-400 shadow-inner md:flex">
            <span className="text-xl leading-none">S</span>
            <input className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500" placeholder="Search live streams" type="search" />
          </label>

          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">
              Log In
            </Link>
            <Link to="/register" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,.35)] transition hover:bg-violet-500">
              Sign Up
            </Link>
            <Link to="/dashboard" className="hidden h-10 w-10 place-items-center rounded-full border border-white/15 text-sm font-bold text-zinc-200 transition hover:bg-white/10 sm:grid" aria-label="Open dashboard">
              D
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
            Watch live streamers, chat with the community, and jump straight into BetCat7 creator sessions.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href="#browse" className="rounded-md bg-violet-600 px-6 py-3 text-sm font-bold shadow-[0_0_32px_rgba(139,92,246,.45)] transition hover:bg-violet-500">
              Browse Live Streams
            </a>
            <Link to="/dashboard" className="rounded-md border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-bold transition hover:bg-white/10">
              Go Live
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <FeaturedStreamCard stream={featuredStream} loading={loadingStreams} />

          <aside className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">Trending Now</h2>
              <a href="#browse" className="text-xs font-semibold text-violet-300">View all</a>
            </div>
            <div className="space-y-4">
              {trendingStreams.length > 0 ? (
                trendingStreams.map((stream) => <PublicStreamMini key={stream.id} stream={stream} />)
              ) : (
                fallbackChannels.slice(0, 4).map(([streamer, category, title, viewers, accent]) => (
                  <FallbackMini key={streamer} streamer={streamer} category={category} title={title} viewers={viewers} accent={accent} />
                ))
              )}
            </div>
          </aside>
        </div>
      </section>

      <section id="browse" className="mx-auto max-w-[1760px] px-5 py-8 sm:px-8">
        <SectionHeader title={publicStreams.length > 0 ? 'Live Now on GLiveStreamers' : 'Live Channels We Think You\'ll Like'} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {publicStreams.length > 0
            ? publicStreams.map((stream) => <PublicLiveCard key={stream.id} stream={stream} />)
            : fallbackChannels.map(([streamer, category, title, viewers, accent]) => (
              <FallbackLiveCard key={streamer} streamer={streamer} category={category} title={title} viewers={viewers} accent={accent} />
            ))}
        </div>
        {!loadingStreams && publicStreams.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500">
            No public streams are live yet. Start a stream from the dashboard and it will appear here automatically.
          </p>
        )}
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
          {betcatCategories.map((category) => <CategoryCard key={category.name} category={category} />)}
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

function FeaturedStreamCard({ stream, loading }: { stream: Stream | null; loading: boolean }) {
  const content = (
    <>
      <div className="relative min-h-[310px] bg-gradient-to-br from-fuchsia-500 via-violet-700 to-cyan-500">
        {stream?.thumbnail_url && <img src={stream.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(255,255,255,.34),transparent_18%),radial-gradient(circle_at_28%_58%,rgba(0,0,0,.48),transparent_38%),linear-gradient(135deg,rgba(0,0,0,.10),rgba(0,0,0,.72))]" />
        <div className="absolute left-5 top-5 rounded bg-red-600 px-2 py-1 text-xs font-black">{stream ? 'LIVE' : loading ? 'LOADING' : 'OFFLINE'}</div>
        <div className="absolute bottom-5 left-5 rounded bg-black/70 px-3 py-2 text-sm font-semibold">
          {stream ? `${stream.viewer_count} viewers` : 'Waiting for streamers'}
        </div>
        <div className="absolute bottom-8 right-8 h-36 w-56 rounded-lg border border-white/15 bg-black/25 shadow-[0_0_70px_rgba(255,255,255,.16)] backdrop-blur-sm" />
        <div className="absolute right-16 top-12 h-24 w-24 rounded-full border border-white/20 bg-black/35 shadow-[0_0_80px_rgba(255,255,255,.2)]" />
      </div>
      <div className="grid gap-4 border-t border-white/10 bg-black/35 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black">
              {stream ? initials(stream.title) : 'GL'}
            </span>
            <div>
              <h2 className="font-bold">{stream?.title ?? 'No streamer live yet'} {stream && <span className="text-violet-400">●</span>}</h2>
              <p className="text-sm text-zinc-400">{stream?.description || stream?.category || 'Start a public stream and it appears here.'}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {streamTags(stream).map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200">{tag}</span>
            ))}
          </div>
        </div>
        <span className="rounded-md bg-violet-600 px-8 py-3 text-center text-sm font-bold transition hover:bg-violet-500">
          {stream ? 'Join Stream' : 'Dashboard'}
        </span>
      </div>
    </>
  );

  if (!stream) {
    return (
      <Link to="/dashboard" className="block overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl shadow-violet-950/40 transition hover:border-violet-400/45">
        {content}
      </Link>
    );
  }

  return (
    <Link to={`/stream/${stream.id}`} className="block overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl shadow-violet-950/40 transition hover:border-violet-400/45">
      {content}
    </Link>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <a href="#browse" className="text-sm font-semibold text-violet-300 hover:text-violet-200">View all &gt;</a>
    </div>
  );
}

function PublicStreamMini({ stream }: { stream: Stream }) {
  return (
    <Link to={`/stream/${stream.id}`} className="grid grid-cols-[104px_1fr] gap-3 rounded-md transition hover:bg-white/[0.04]">
      <div className="relative h-20 overflow-hidden rounded-md bg-gradient-to-br from-fuchsia-500 via-violet-700 to-cyan-500">
        {stream.thumbnail_url && <img src={stream.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-black/25" />
        <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black">LIVE</span>
        <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[11px] font-bold">{stream.viewer_count} viewers</span>
      </div>
      <div className="min-w-0 pt-1">
        <p className="truncate text-sm font-bold">{stream.title}</p>
        <p className="truncate text-sm text-zinc-400">{stream.description || 'Streaming now'}</p>
        <p className="mt-1 text-xs text-zinc-500">{formatCategory(stream.category || 'Live')}</p>
      </div>
    </Link>
  );
}

function FallbackMini({ streamer, category, title, viewers, accent }: FallbackCardProps) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-3">
      <div className={`relative h-20 overflow-hidden rounded-md bg-gradient-to-br ${accent}`}>
        <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black">LIVE</span>
        <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[11px] font-bold">{viewers}</span>
      </div>
      <div className="min-w-0 pt-1">
        <p className="truncate text-sm font-bold">{streamer}</p>
        <p className="truncate text-sm text-zinc-400">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{category}</p>
      </div>
    </div>
  );
}

function PublicLiveCard({ stream }: { stream: Stream }) {
  return (
    <Link to={`/stream/${stream.id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-700 to-cyan-500 shadow-lg shadow-black/30">
        {stream.thumbnail_url && <img src={stream.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.30),transparent_18%),linear-gradient(135deg,transparent,rgba(0,0,0,.65))]" />
        <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-xs font-black">LIVE</span>
        <span className="absolute bottom-3 left-3 rounded bg-black/70 px-3 py-1.5 text-xs font-bold">{stream.viewer_count} viewers</span>
        <span className="absolute bottom-3 right-3 rounded bg-violet-600 px-3 py-1.5 text-xs font-black shadow-[0_0_24px_rgba(139,92,246,.45)] transition group-hover:bg-violet-500">
          Join Stream
        </span>
      </div>
      <StreamInfo title={stream.title} description={stream.description || 'Streaming now'} category={formatCategory(stream.category || 'Live')} />
    </Link>
  );
}

function FallbackLiveCard({ streamer, category, title, viewers, accent }: FallbackCardProps) {
  return (
    <article className="group">
      <div className={`relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br ${accent} shadow-lg shadow-black/30`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.30),transparent_18%),linear-gradient(135deg,transparent,rgba(0,0,0,.65))]" />
        <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-xs font-black">LIVE</span>
        <span className="absolute bottom-3 left-3 rounded bg-black/70 px-3 py-1.5 text-xs font-bold">{viewers} viewers</span>
      </div>
      <StreamInfo title={streamer} description={title} category={category} />
    </article>
  );
}

function StreamInfo({ title, description, category }: { title: string; description: string; category: string }) {
  return (
    <div className="mt-3 flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-black">
        {initials(title)}
      </span>
      <div className="min-w-0">
        <h3 className="truncate font-bold">{title} <span className="text-violet-400">●</span></h3>
        <p className="truncate text-sm text-zinc-300">{description}</p>
        <p className="mt-1 text-sm text-zinc-500">{category}</p>
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: { name: string; viewers: string; accent: string } }) {
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

interface FallbackCardProps {
  streamer: string;
  category: string;
  title: string;
  viewers: string;
  accent: string;
}

function streamTags(stream: Stream | null): string[] {
  if (!stream) return ['Live', 'Creator', 'BetCat7'];

  return [
    stream.category ? formatCategory(stream.category) : 'Live',
    'Live',
    ...stream.tags.slice(0, 2),
  ].filter(Boolean);
}

function initials(value: string): string {
  const words = value.split(/\s+/).filter(Boolean);
  const chars = words.length > 1
    ? words.slice(0, 2).map((word) => word[0])
    : value.slice(0, 2).split('');

  return chars.join('').toUpperCase();
}

function formatCategory(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
