import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/axios';
import type { Stream, StreamCategory } from '@glive/sdk';
import { connectToLiveKitRoom, type Room } from '@glive/livekit';
import StreamCard from '../components/StreamCard';

function disconnectFromLiveKitRoom(room?: Room | null): void {
  room?.disconnect();
}

export default function DashboardPage() {
  const { user, token } = useAuthStore();
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

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back, {user?.name}</p>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6 mb-8">
        <p className="text-gray-400">
          Logged in as <span className="text-white">{user?.email}</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Analytics</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <AnalyticsMetric label="Live" value={liveStreams.length.toString()} />
          <AnalyticsMetric label="Viewers" value={totalViewers.toString()} />
          <AnalyticsMetric label="Peak" value={bestPeak.toString()} />
          <AnalyticsMetric label="Duration" value={formatDuration(totalDuration)} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Create Stream</h2>
        <form onSubmit={handleCreate} className="grid gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Stream title"
            required
            maxLength={200}
            className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            maxLength={5000}
            rows={3}
            className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-y"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            >
              <option value="">Category</option>
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
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags, comma separated"
              className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="url"
              value={thumbnailURL}
              onChange={(e) => setThumbnailURL(e.target.value)}
              placeholder="Thumbnail URL"
              className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Language"
                maxLength={16}
                className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'unlisted' | 'private')}
                className="bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="justify-self-start bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md px-6 py-2 font-medium transition-colors whitespace-nowrap"
          >
            {creating ? 'Creating...' : 'Create Stream'}
          </button>
        </form>
        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Your Streams</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : streams.length === 0 ? (
          <p className="text-gray-500">No streams yet. Create one above.</p>
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
      </section>

      {liveStreams.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Viewer Links</h2>
          <div className="grid gap-3">
            {liveStreams
              .map((stream) => (
                <div
                  key={stream.id}
                  className="border border-gray-800 rounded-lg p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{stream.title}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {publicStreamURL(stream.id)}
                    </p>
                  </div>
                  <button
                    onClick={() => copyViewerLink(stream.id)}
                    className="text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
                  >
                    Copy link
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}
    </main>
  );
}

function AnalyticsMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-800 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
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
