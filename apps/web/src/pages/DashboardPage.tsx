import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/axios';
import type { Stream, StreamCategory } from '@glive/sdk';
import { connectToLiveKitRoom, type Room } from '@glive/livekit';
import StreamCard from '../components/StreamCard';

function disconnectFromLiveKitRoom(room?: Room | null): void {
  room?.disconnect();
}

export default function DashboardPage() {
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
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const livekitURL = import.meta.env.VITE_LIVEKIT_URL;
  const liveStreams = streams.filter((stream) => stream.status === 'live');
  const totalViewers = streams.reduce((sum, stream) => sum + stream.viewer_count, 0);
  const bestPeak = streams.reduce(
    (peak, stream) => Math.max(peak, stream.peak_viewer_count),
    0,
  );
  const totalDuration = streams.reduce(
    (sum, stream) => {
      if (stream.is_live && stream.started_at) {
        return sum + Math.max(
          0,
          Math.floor((currentTime - new Date(stream.started_at).getTime()) / 1000),
        );
      }

      return sum + stream.duration_seconds;
    },
    0,
  );

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
    let started = false;
    try {
      const stream = await api.startStream(streamId);
      started = true;
      setStreams(streams.map((s) => (s.id === streamId ? stream : s)));
      const room = await connectToLiveKitRoom(stream.token, livekitURL);
      const liveStream = await api.transitionStream(streamId, 'live');
      setStreams(streams.map((s) => (s.id === streamId ? liveStream : s)));
      updatePublisherRooms((rooms) => ({ ...rooms, [streamId]: room }));
    } catch (err) {
      console.error('Start publisher room failed:', err);
      if (started) {
        try {
          const readyStream = await api.transitionStream(streamId, 'ready');
          setStreams(streams.map((s) => (s.id === streamId ? readyStream : s)));
        } catch (rollbackErr) {
          console.error('Failed to roll stream back to ready:', rollbackErr);
        }
      }
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
    navigate('/');
  };

  return (
    <main className="min-h-screen bg-[#050811] text-white">
      <div className="grid min-h-screen lg:grid-cols-[238px_1fr]">
        <aside className="flex flex-col border-b border-white/10 bg-[#060914] px-5 py-7 lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <img src="/img/Glogo.png" alt="GameLive" className="h-10 w-10 rounded-xl object-contain" />
            <span className="text-xl font-bold">GLiveStreamers</span>
          </div>

          <nav className="mt-9 grid gap-2 border-t border-white/10 pt-3">
            <button type="button" className="flex items-center gap-3 rounded-md bg-violet-500/15 px-4 py-3 text-left text-violet-400">
              <HomeIcon />
              <span className="font-medium">Dashboard</span>
            </button>
            <button type="button" className="flex items-center gap-3 rounded-md px-4 py-3 text-left text-gray-300 transition-colors hover:bg-white/[0.04] hover:text-white">
              <ScreenIcon />
              <span className="font-medium">Streams</span>
            </button>
            <button type="button" className="flex items-center gap-3 rounded-md px-4 py-3 text-left text-gray-300 transition-colors hover:bg-white/[0.04] hover:text-white">
              <BarsIcon />
              <span className="font-medium">Analytics</span>
            </button>
          </nav>

          <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6 lg:mt-auto">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-semibold">
              {user?.name?.slice(0, 1).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-gray-400">{user?.email}</p>
              <p className="mt-1 text-xs text-gray-400">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 flex items-center gap-3 border-t border-white/10 pt-6 text-left text-sm text-gray-300 transition-colors hover:text-white"
          >
            <SignOutIcon />
            Sign Out
          </button>
        </aside>

        <div className="px-5 py-7 sm:px-8">
          <div className="mx-auto max-w-[1250px]">
            <header className="mb-5">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="mt-2 text-lg text-gray-200">Welcome back, {user?.name}!</p>
            </header>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_478px]">
              <div className="min-w-0 space-y-8">
                <section className="overflow-hidden rounded-lg border border-violet-600/80 bg-[#090d16] shadow-2xl shadow-violet-950/20">
                  <div className="relative min-h-[440px] bg-[radial-gradient(circle_at_45%_30%,rgba(124,58,237,0.18),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.25),rgba(2,6,23,0.95)),linear-gradient(135deg,rgba(30,41,59,0.9),rgba(15,23,42,0.55)_45%,rgba(3,7,18,1))]">
                    <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_28%_66%,rgba(15,23,42,0.85)_0_10%,transparent_11%),linear-gradient(150deg,transparent_0_38%,rgba(34,197,94,0.12)_39%_48%,transparent_49%),linear-gradient(20deg,transparent_0_58%,rgba(148,163,184,0.14)_59%_61%,transparent_62%)]" />
                    <div className="absolute left-5 top-5 flex items-center gap-2 rounded-md bg-black/55 px-4 py-2 text-violet-400">
                      <BroadcastIcon />
                      <span className="font-semibold">Live</span>
                    </div>
                    <div className="absolute inset-x-6 top-[36%] z-10 text-center">
                      <h2 className="text-2xl font-bold">
                        {liveStreams.length > 0 ? "You're live" : "You're not live"}
                      </h2>
                      <p className="mt-2 text-base text-gray-300">
                        {liveStreams.length > 0
                          ? 'Your audience can watch your active stream now.'
                          : 'Go live and start entertaining your audience.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => document.getElementById('create-stream-title')?.focus()}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-950/50 transition-colors hover:bg-violet-500"
                      >
                        <BroadcastIcon />
                        Create Stream
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 z-10 grid border-t border-white/10 bg-[#080d16]/90 backdrop-blur sm:grid-cols-4">
                      <HeroMetric label="Viewers" value={totalViewers.toString()} />
                      <HeroMetric label="Peak" value={bestPeak.toString()} />
                      <HeroMetric label="Duration" value={formatDuration(totalDuration)} />
                      <HeroMetric label="Followers Gained" value="0" />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Your Streams</h2>
                    <button type="button" className="text-base font-semibold text-violet-400 hover:text-violet-300">
                      View all
                    </button>
                  </div>

                  {loading ? (
                    <div className="rounded-lg border border-white/10 bg-[#080d16] p-10 text-center text-gray-400">
                      Loading...
                    </div>
                  ) : streams.length === 0 ? (
                    <div className="flex min-h-[246px] flex-col items-center justify-center rounded-lg border border-white/10 bg-[#080d16] px-6 py-10 text-center">
                      <EmptyStreamIcon />
                      <h3 className="mt-4 text-lg font-semibold text-gray-200">No streams yet</h3>
                      <p className="mt-2 text-sm text-gray-500">Create your first stream and it will show up here.</p>
                      <button
                        type="button"
                        onClick={() => document.getElementById('create-stream-title')?.focus()}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold transition-colors hover:bg-violet-500"
                      >
                        <BroadcastIcon />
                        Create Stream
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {streams.map((stream) => (
                        <StreamCard
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

                  {liveStreams.length > 0 && (
                    <div className="mt-6 grid gap-3">
                      {liveStreams.map((stream) => (
                        <div
                          key={stream.id}
                          className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#080d16] p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">{stream.title}</p>
                            <p className="truncate text-sm text-gray-500">{publicStreamURL(stream.id)}</p>
                          </div>
                          <button
                            onClick={() => copyViewerLink(stream.id)}
                            className="whitespace-nowrap rounded-md bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/15"
                          >
                            Copy link
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="rounded-lg border border-white/10 bg-[#080d16] p-6 shadow-2xl shadow-black/20 xl:sticky xl:top-6 xl:self-start">
                <h2 className="text-xl font-bold">Create Stream</h2>
                <form onSubmit={handleCreate} className="mt-7 grid gap-6">
                  <label className="grid gap-3 text-sm text-gray-200">
                    Stream title
                    <input
                      id="create-stream-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter stream title"
                      required
                      maxLength={200}
                      className="h-12 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-white placeholder-gray-500 outline-none transition-colors focus:border-violet-500"
                    />
                  </label>

                  <label className="grid gap-3 text-sm text-gray-200">
                    Description
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell your viewers what your stream is about"
                      maxLength={5000}
                      rows={4}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4 text-white placeholder-gray-500 outline-none transition-colors focus:border-violet-500"
                    />
                  </label>

                  <label className="grid gap-3 text-sm text-gray-200">
                    Category
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-12 rounded-lg border border-white/10 bg-[#0b101a] px-4 text-gray-300 outline-none transition-colors focus:border-violet-500"
                    >
                      <option value="">Select a category</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.slug}>
                          {item.name}
                        </option>
                      ))}
                      {categories.length === 0 && (
                        <>
                          <option value="slots">Slots</option>
                          <option value="poker">Poker</option>
                          <option value="fishing">Fishing</option>
                          <option value="arcade">Arcade</option>
                          <option value="baccarat">Baccarat</option>
                          <option value="roulette">Roulette</option>
                          <option value="blackjack">Blackjack</option>
                        </>
                      )}
                    </select>
                  </label>

                  <label className="grid gap-3 text-sm text-gray-200">
                    Tags, comma separated
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g. fps, competitive, fun"
                      className="h-12 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-white placeholder-gray-500 outline-none transition-colors focus:border-violet-500"
                    />
                  </label>

                  <label className="grid gap-3 text-sm text-gray-200">
                    Thumbnail URL
                    <input
                      type="url"
                      value={thumbnailURL}
                      onChange={(e) => setThumbnailURL(e.target.value)}
                      placeholder="https://example.com/thumbnail.jpg"
                      className="h-12 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-white placeholder-gray-500 outline-none transition-colors focus:border-violet-500"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-11 rounded-lg border border-white/10 bg-[#0b101a] px-4 text-sm text-white outline-none transition-colors focus:border-violet-500"
                    >
                      <option value="en">EN</option>
                      <option value="fil">FIL</option>
                      <option value="es">ES</option>
                      <option value="ja">JA</option>
                    </select>
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as 'public' | 'unlisted' | 'private')}
                      className="h-11 rounded-lg border border-white/10 bg-[#0b101a] px-4 text-sm text-white outline-none transition-colors focus:border-violet-500"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                  >
                    <BroadcastIcon />
                    {creating ? 'Creating...' : 'Create Stream'}
                  </button>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                </form>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 px-4 py-6 text-center sm:border-r last:border-r-0">
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-gray-300">{label}</p>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m3 11 9-8 9 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10.5V21h14V10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScreenIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21h8M12 16v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 20V10M12 20V4M18 20v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 17l5-5-5-5M20 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.5 16.5a6.4 6.4 0 0 1 0-9M5.5 19.5a10.6 10.6 0 0 1 0-15M15.5 7.5a6.4 6.4 0 0 1 0 9M18.5 4.5a10.6 10.6 0 0 1 0 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

function EmptyStreamIcon() {
  return (
    <svg className="h-12 w-12 text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9.5 18 6v12H6V9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m10 10 4 2.5-4 2.5v-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 6.5 17 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
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
