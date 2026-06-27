import { useState, useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/axios';
import type { Stream, StreamCategory, StreamVisibility } from '@glive/sdk';
import { connectToLiveKitRoom, type Room } from '@glive/livekit';
import logo from '../public/img/glivestreamers-logo.png';

function disconnectFromLiveKitRoom(room?: Room | null): void {
  room?.disconnect();
}

const fallbackCategories = [
  { id: 'ebingo', name: 'Ebingo', slug: 'ebingo' },
  { id: 'casino', name: 'Casino', slug: 'casino' },
  { id: 'live', name: 'Live', slug: 'live' },
  { id: 'original', name: 'Original', slug: 'original' },
  { id: 'sports', name: 'Sports', slug: 'sports' },
  { id: 'poker', name: 'Poker', slug: 'poker' },
  { id: 'arcade', name: 'Arcade', slug: 'arcade' },
  { id: 'promo', name: 'Promo', slug: 'promo' },
];

const inputClass =
  'h-11 w-full rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400/60 focus:bg-white/[0.07]';

export default function DashboardPageV2() {
  const { user, token, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [categories, setCategories] = useState<StreamCategory[]>([]);
  const [publisherRooms, setPublisherRooms] = useState<Record<string, Room>>({});
  const publisherRoomsRef = useRef<Record<string, Room>>({});
  const [busyStreamId, setBusyStreamId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [thumbnailURL, setThumbnailURL] = useState('');
  const [language, setLanguage] = useState('en');
  const [visibility, setVisibility] = useState<StreamVisibility>('public');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const livekitURL = import.meta.env.VITE_LIVEKIT_URL;
  const categoryOptions = categories.length > 0 ? categories : fallbackCategories;
  const liveStreams = streams.filter((stream) => stream.status === 'live');
  const activeStream = liveStreams[0] ?? streams[0] ?? null;
  const totalViewers = streams.reduce((sum, stream) => sum + stream.viewer_count, 0);
  const bestPeak = streams.reduce(
    (peak, stream) => Math.max(peak, stream.peak_viewer_count),
    0,
  );
  const totalDuration = streams.reduce((sum, stream) => {
    return sum + getStreamDuration(stream, currentTime);
  }, 0);

  useEffect(() => {
    if (!token) return;
    loadStreams();
  }, [token]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(publisherRoomsRef.current).forEach(disconnectFromLiveKitRoom);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const updatePublisherRooms = (
    updater: (rooms: Record<string, Room>) => Record<string, Room>,
  ) => {
    setPublisherRooms((rooms) => {
      const nextRooms = updater(rooms);
      publisherRoomsRef.current = nextRooms;
      return nextRooms;
    });
  };

  const loadStreams = async () => {
    setLoading(true);
    try {
      const result = await api.listStreams();
      setStreams(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await api.listCategories();
      setCategories(result);
    } catch {
      setCategories([]);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const stream = await api.createStream({
        title,
        description,
        category,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        thumbnail_url: thumbnailURL.trim() || null,
        language,
        visibility,
      });
      setStreams([stream, ...streams]);
      setTitle('');
      setDescription('');
      setCategory('');
      setTags('');
      setThumbnailURL('');
      setLanguage('en');
      setVisibility('public');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to create stream');
      } else {
        setError('Failed to create stream');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (streamId: string) => {
    setBusyStreamId(streamId);
    setError('');
    try {
      const stream = await api.startStream(streamId);
      setStreams(streams.map((s) => (s.id === streamId ? stream : s)));
      const room = await connectToLiveKitRoom(stream.token, livekitURL);
      updatePublisherRooms((rooms) => ({ ...rooms, [streamId]: room }));
    } catch {
      setError('Failed to start and connect publisher room.');
    } finally {
      setBusyStreamId(null);
    }
  };

  const handleReady = async (streamId: string) => {
    setBusyStreamId(streamId);
    setError('');
    try {
      const stream = await api.transitionStream(streamId, 'ready');
      setStreams(streams.map((s) => (s.id === streamId ? stream : s)));
    } catch {
      setError('Failed to mark stream ready.');
    } finally {
      setBusyStreamId(null);
    }
  };

  const handleArchive = async (streamId: string) => {
    setBusyStreamId(streamId);
    setError('');
    try {
      const stream = await api.transitionStream(streamId, 'archive');
      setStreams(streams.map((s) => (s.id === streamId ? stream : s)));
    } catch {
      setError('Failed to archive stream.');
    } finally {
      setBusyStreamId(null);
    }
  };

  const handleStop = async (streamId: string) => {
    setBusyStreamId(streamId);
    setError('');
    try {
      disconnectFromLiveKitRoom(publisherRooms[streamId]);
      updatePublisherRooms((rooms) => {
        const nextRooms = { ...rooms };
        delete nextRooms[streamId];
        return nextRooms;
      });
      const stream = await api.stopStream(streamId);
      setStreams(streams.map((s) => (s.id === streamId ? stream : s)));
    } catch {
      setError('Failed to stop stream.');
    } finally {
      setBusyStreamId(null);
    }
  };

  const handlePublisherConnect = async (streamId: string) => {
    setBusyStreamId(streamId);
    setError('');
    try {
      const { token } = await api.getPublisherToken(streamId);
      const room = await connectToLiveKitRoom(token, livekitURL);
      updatePublisherRooms((rooms) => ({ ...rooms, [streamId]: room }));
    } catch {
      setError('Failed to connect publisher room.');
    } finally {
      setBusyStreamId(null);
    }
  };

  const handlePublisherDisconnect = (streamId: string) => {
    disconnectFromLiveKitRoom(publisherRooms[streamId]);
    updatePublisherRooms((rooms) => {
      const nextRooms = { ...rooms };
      delete nextRooms[streamId];
      return nextRooms;
    });
  };

  const disconnectPublisherRoom = (streamId: string) => {
    disconnectFromLiveKitRoom(publisherRooms[streamId]);
    updatePublisherRooms((rooms) => {
      const nextRooms = { ...rooms };
      delete nextRooms[streamId];
      return nextRooms;
    });
  };

  const publicStreamURL = (streamId: string) => {
    return `${window.location.origin}/stream/${streamId}`;
  };

  const copyViewerLink = async (streamId: string) => {
    try {
      await navigator.clipboard.writeText(publicStreamURL(streamId));
    } catch {
      setError('Failed to copy viewer link.');
    }
  };

  const handleDelete = async (streamId: string) => {
    if (!confirm('Delete this stream?')) return;
    setBusyStreamId(streamId);
    setError('');
    try {
      disconnectPublisherRoom(streamId);
      await api.deleteStream(streamId);
      setStreams(streams.filter((s) => s.id !== streamId));
    } catch {
      setError('Failed to delete stream.');
    } finally {
      setBusyStreamId(null);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Today';

  const previewTitle = activeStream?.title || title || `${user?.name ?? 'Streamer'}.test`;
  const previewCategory = activeStream?.category || category || 'Casino';

  return (
    <main className="min-h-screen bg-[#06050b] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_55%_0%,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(168,85,247,0.14),transparent_28%),linear-gradient(180deg,#080711_0%,#05050a_58%,#030306_100%)]" />
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-black/45 px-4 py-5 backdrop-blur-xl lg:flex lg:flex-col">
          <Link to="/" className="mb-10 flex items-center gap-3 px-2">
            <img src={logo} alt="GLiveStreamers" className="h-10 w-10 rounded-lg object-cover" />
            <span className="text-lg font-bold">GLiveStreamers</span>
          </Link>

          <nav className="space-y-3">
            <SidebarItem active label="Dashboard" icon="D" />
            <SidebarItem label="Streams" icon="S" />
            <SidebarItem label="Analytics" icon="A" />
            <SidebarItem label="Settings" icon="C" />
            <SidebarItem label="Stream Key" icon="K" />
            <SidebarItem label="Billing" icon="B" />
            <SidebarItem label="Alerts" icon="N" badge="2" />
          </nav>

          <div className="mt-auto space-y-3">
            <SidebarItem label="Help & Support" icon="?" />
            <SidebarItem label="Feedback" icon="F" />
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <Avatar name={user?.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user?.name ?? 'Streamer'}</p>
                <p className="text-xs text-zinc-400">Streamer</p>
              </div>
              <span className="ml-auto text-zinc-400">^</span>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-20 items-center border-b border-white/10 bg-black/40 px-5 backdrop-blur-xl lg:px-8">
            <div>
              <p className="text-sm font-bold text-zinc-100">Dashboard</p>
              <p className="mt-1 text-xs text-zinc-500 lg:hidden">GLiveStreamers</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button className="hidden rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10 sm:block">
                Help
              </button>
              <button className="relative grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-zinc-200 hover:bg-white/10">
                N
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-xs font-bold">2</span>
              </button>
              <div className="hidden items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 sm:flex">
                <Avatar name={user?.name} small />
                <span className="max-w-28 truncate text-sm font-bold">{user?.name ?? 'Streamer'}</span>
                <span className="text-zinc-500">v</span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </header>

          <div className="w-full px-5 py-8 lg:px-8">
            <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Welcome back, {user?.name ?? 'streamer'}
                </h1>
                <p className="mt-4 text-zinc-400">
                  Logged in as <span className="text-zinc-200">{user?.email}</span>
                </p>
                <p className="mt-2 text-sm text-zinc-500">Member since {memberSince}</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-violet-950/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm text-zinc-200">
                      <span className={`h-3 w-3 rounded-full ${liveStreams.length > 0 ? 'bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,.8)]' : 'bg-zinc-600'}`} />
                      Live Status
                    </p>
                    <p className={`mt-2 text-2xl font-black tracking-wide ${liveStreams.length > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {liveStreams.length > 0 ? 'LIVE' : 'OFFLINE'}
                    </p>
                  </div>
                  <button
                    onClick={() => activeStream ? handleStart(activeStream.id) : undefined}
                    disabled={!activeStream || activeStream.status === 'live' || busyStreamId === activeStream?.id}
                    className="rounded-lg bg-violet-600 px-8 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(124,58,237,.35)] transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Go Live
                  </button>
                </div>
              </div>
            </section>

            {error && (
              <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.65fr)] xl:items-start">
              <Panel title="Stream Preview">
                <div className="overflow-hidden rounded-lg border border-white/10 bg-black/35">
                  <PreviewArt
                    thumbnailURL={activeStream?.thumbnail_url || thumbnailURL}
                    live={liveStreams.length > 0}
                    size="large"
                  />
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold">{previewTitle}</h3>
                      <p className="truncate text-sm text-zinc-400">
                        Category <span className="mx-1 text-zinc-600">.</span> {formatCategory(previewCategory)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-zinc-300">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,.8)]" />
                      {totalViewers} Viewer{totalViewers === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </Panel>

              <div className="grid content-start gap-6">
                <Panel title="Your Streams" action="View All">
                  {loading ? (
                    <p className="text-sm text-zinc-500">Loading streams...</p>
                  ) : streams.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-zinc-400">
                      No streams yet. Create one to start the dev phase.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {streams.map((stream) => (
                        <DashboardStreamCard
                          key={stream.id}
                          stream={stream}
                          onReady={() => handleReady(stream.id)}
                          onStart={() => handleStart(stream.id)}
                          onStop={() => handleStop(stream.id)}
                          onArchive={() => handleArchive(stream.id)}
                          onDelete={() => handleDelete(stream.id)}
                          onPublisherConnect={() => handlePublisherConnect(stream.id)}
                          onPublisherDisconnect={() => handlePublisherDisconnect(stream.id)}
                          isPublisherConnected={Boolean(publisherRooms[stream.id])}
                          currentTime={currentTime}
                          isBusy={busyStreamId === stream.id}
                        />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Create Stream">
                  <form onSubmit={handleCreate} className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <Field label="Stream Title">
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter a catchy title for your stream"
                          required
                          maxLength={200}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Category">
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                          <option value="">Select category</option>
                          {categoryOptions.map((item) => (
                            <option key={item.id} value={item.slug}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <Field label="Description">
                        <input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What's your stream about?"
                          maxLength={5000}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Tags (comma separated)">
                        <input
                          type="text"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="gaming, fun, chill"
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_130px_160px] xl:grid-cols-1 2xl:grid-cols-[1fr_130px_160px]">
                      <Field label="Thumbnail URL">
                        <input
                          type="url"
                          value={thumbnailURL}
                          onChange={(e) => setThumbnailURL(e.target.value)}
                          placeholder="https://example.com/thumbnail.jpg"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Language">
                        <input
                          type="text"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          placeholder="en"
                          maxLength={16}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Visibility">
                        <select
                          value={visibility}
                          onChange={(e) => setVisibility(e.target.value as StreamVisibility)}
                          className={inputClass}
                        >
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </select>
                      </Field>
                    </div>

                    <button
                      type="submit"
                      disabled={creating}
                      className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(124,58,237,.32)] transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : '+ Create Stream'}
                    </button>
                  </form>
                </Panel>
              </div>
            </section>

            <section className="mt-6">
              <Panel className="min-h-[300px]" title="Analytics" pill={liveStreams.length > 0 ? 'Live' : undefined}>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <AnalyticsCard label="Viewers" value={totalViewers.toString()} color="violet" />
                  <AnalyticsCard label="Peak Viewers" value={bestPeak.toString()} color="blue" />
                  <AnalyticsCard label="Duration" value={formatDuration(totalDuration)} color="emerald" />
                  <AnalyticsCard label="Followers Gained" value="0" color="orange" />
                </div>
              </Panel>
            </section>

            {streams.length > 0 && (
              <section className="mt-6">
                <Panel title="Viewer Links">
                  <div className="grid gap-3">
                    {streams.map((stream) => (
                      <div key={stream.id} className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet-600/30 text-violet-200 shadow-[0_0_24px_rgba(124,58,237,.35)]">L</span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">{stream.title}</p>
                            <p className="truncate text-sm text-violet-300">{publicStreamURL(stream.id)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => copyViewerLink(stream.id)}
                          className="rounded-lg border border-violet-400/50 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/10"
                        >
                          Copy Link
                        </button>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>
            )}

          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarItem({
  label,
  icon,
  active,
  badge,
}: {
  label: string;
  icon: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <button className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${active ? 'bg-violet-600/70 text-white shadow-[0_0_30px_rgba(124,58,237,.25)]' : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'}`}>
      <span className="grid h-6 w-6 place-items-center rounded-md border border-white/10 text-xs">{icon}</span>
      <span>{label}</span>
      {badge && <span className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-violet-600 text-xs">{badge}</span>}
    </button>
  );
}

function Avatar({ name, small }: { name?: string | null; small?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-200 to-rose-500 font-black text-black ${small ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-sm'}`}>
      {initials(name)}
    </span>
  );
}

function Panel({
  title,
  pill,
  action,
  className = '',
  children,
}: {
  title: string;
  pill?: string;
  action?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="grid gap-2">
          <h2 className="font-bold">{title}</h2>
          {pill && (
            <span className="w-max rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
              {pill}
            </span>
          )}
        </div>
        {action && <button className="rounded-lg bg-white/[0.05] px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">{action}</button>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-xs font-semibold text-zinc-200">
      {label}
      {children}
    </label>
  );
}

function AnalyticsCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'violet' | 'blue' | 'emerald' | 'orange';
}) {
  const colorMap = {
    violet: 'from-violet-500/18 text-violet-300 stroke-violet-400',
    blue: 'from-blue-500/18 text-blue-300 stroke-blue-400',
    emerald: 'from-emerald-500/18 text-emerald-300 stroke-emerald-400',
    orange: 'from-orange-500/18 text-orange-300 stroke-orange-400',
  };
  const classes = colorMap[color].split(' ');

  return (
    <div className={`rounded-lg bg-gradient-to-br ${colorMap[color]} to-white/[0.035] p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-white">{value}</p>
          <p className="mt-1 text-sm text-zinc-300">{label}</p>
        </div>
        <span className={`text-xs font-bold ${classes[1]}`}>++</span>
      </div>
      <svg className={`mt-7 h-10 w-full ${classes[2]}`} viewBox="0 0 160 40" fill="none" aria-hidden="true">
        <path d="M2 30 C14 10 18 38 30 24 S48 30 58 18 S76 28 86 15 S104 20 116 12 S136 18 158 10" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function PreviewArt({
  thumbnailURL,
  live,
  size = 'compact',
}: {
  thumbnailURL?: string | null;
  live: boolean;
  size?: 'compact' | 'large';
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);

  const openFullscreen = async () => {
    const target = previewRef.current;
    if (!target || !target.requestFullscreen) return;

    try {
      await target.requestFullscreen();
    } catch {
      // Browsers can reject fullscreen if the gesture is interrupted.
    }
  };

  return (
    <div
      ref={previewRef}
      className={`relative overflow-hidden bg-gradient-to-br from-fuchsia-950 via-violet-950 to-cyan-950 ${
        size === 'large' ? 'aspect-video min-h-[420px] xl:min-h-[560px]' : 'aspect-[16/7]'
      }`}
    >
      {thumbnailURL ? (
        <img src={thumbnailURL} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_22%,rgba(236,72,153,.45),transparent_18%),radial-gradient(circle_at_30%_58%,rgba(34,211,238,.28),transparent_24%),linear-gradient(135deg,rgba(0,0,0,.10),rgba(0,0,0,.66))]" />
          <div className="absolute bottom-8 left-8 h-24 w-44 rounded-lg border border-cyan-300/20 bg-black/30 shadow-[0_0_60px_rgba(34,211,238,.2)]" />
          <div className="absolute right-8 top-8 h-28 w-36 rounded-lg border border-fuchsia-300/20 bg-black/20 shadow-[0_0_70px_rgba(217,70,239,.22)]" />
        </>
      )}
      {live && <span className="absolute left-4 top-4 rounded bg-red-600 px-3 py-1 text-xs font-black">LIVE</span>}
      <button
        type="button"
        onClick={openFullscreen}
        className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-black/60 p-2 text-white shadow-[0_0_24px_rgba(124,58,237,.3)] transition hover:bg-violet-600/70"
        aria-label="Open stream preview fullscreen"
      >
        <img src={logo} alt="" className="h-full w-full rounded-md object-cover" />
      </button>
    </div>
  );
}

function DashboardStreamCard({
  stream,
  onReady,
  onStart,
  onStop,
  onArchive,
  onDelete,
  onPublisherConnect,
  onPublisherDisconnect,
  isPublisherConnected,
  currentTime,
  isBusy,
}: {
  stream: Stream;
  onReady: () => void;
  onStart: () => void;
  onStop: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPublisherConnect: () => void;
  onPublisherDisconnect: () => void;
  isPublisherConnected: boolean;
  currentTime: number;
  isBusy?: boolean;
}) {
  const duration = formatDuration(getStreamDuration(stream, currentTime));
  const canReady = stream.status === 'draft';
  const canStart = stream.status === 'ready' || stream.status === 'ended';
  const canStop = stream.status === 'live';
  const canArchive = stream.status === 'ended';

  return (
    <article className="grid gap-5 rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-4 2xl:grid-cols-[220px_1fr]">
      <div className="relative overflow-hidden rounded-lg">
        <PreviewArt thumbnailURL={stream.thumbnail_url} live={stream.status === 'live'} />
      </div>

      <div className="min-w-0 py-1">
        <h3 className="truncate text-xl font-black">{stream.title}</h3>
        <p className="mt-3 text-sm text-zinc-400">
          Category <span className="ml-2 text-violet-300">{formatCategory(stream.category || 'Casino')}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-md bg-white/10 px-3 py-1 text-xs font-bold text-zinc-200">{stream.language}</span>
          <span className="rounded-md bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">{stream.visibility}</span>
          <span className="rounded-md bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">{stream.status}</span>
        </div>
        <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 text-sm">
          <Metric label="Viewers" value={stream.viewer_count.toString()} />
          <Metric label="Peak" value={stream.peak_viewer_count.toString()} />
          <Metric label="Duration" value={duration} green />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 2xl:col-span-2">
        {canReady && <ActionButton onClick={onReady} disabled={isBusy}>Ready</ActionButton>}
        {canStart && <ActionButton onClick={onStart} disabled={isBusy}>{isBusy ? 'Starting...' : 'Start'}</ActionButton>}
        {stream.status === 'starting' && <ActionButton disabled>Starting...</ActionButton>}
        {canStop && (
          <>
            <ActionButton onClick={isPublisherConnected ? onPublisherDisconnect : onPublisherConnect} disabled={isBusy}>
              {isPublisherConnected ? 'Disconnect' : 'Connect'}
            </ActionButton>
            <ActionButton danger onClick={onStop} disabled={isBusy}>Stop</ActionButton>
          </>
        )}
        {stream.status === 'ending' && <ActionButton disabled>Ending...</ActionButton>}
        {canArchive && <ActionButton onClick={onArchive} disabled={isBusy}>Archive</ActionButton>}
        <ActionButton muted onClick={onDelete} disabled={isBusy}>Delete</ActionButton>
      </div>
    </article>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  danger,
  muted,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${danger
        ? 'bg-red-600/80 text-white hover:bg-red-500'
        : muted
          ? 'bg-white/10 text-zinc-300 hover:bg-white/15'
          : 'bg-violet-600 text-white shadow-[0_0_24px_rgba(124,58,237,.25)] hover:bg-violet-500'}`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="min-w-0 px-3 first:pl-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 break-words text-lg font-black leading-tight ${green ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function getStreamDuration(stream: Stream, currentTime: number): number {
  if (stream.is_live && stream.started_at) {
    return Math.max(0, Math.floor((currentTime - new Date(stream.started_at).getTime()) / 1000));
  }

  return stream.duration_seconds;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatCategory(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function initials(name?: string | null): string {
  if (!name) return 'GL';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
