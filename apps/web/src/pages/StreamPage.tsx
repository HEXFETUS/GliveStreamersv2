import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/axios';
import { connectToLiveKitRoom, type Room } from '@glive/livekit';
import type { StreamAnalytics } from '@glive/sdk';

export default function StreamPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const roomRef = useRef<Room | null>(null);
  const joinedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const viewerIdRef = useRef(getOrCreateViewerId());
  const [analytics, setAnalytics] = useState<StreamAnalytics | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!streamId) return;
    loadToken();
    loadAnalytics();
  }, [streamId]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      if (joinedRef.current && streamId) {
        void api.viewerLeave(streamId, {
          session_id: sessionIdRef.current ?? undefined,
          viewer_id: viewerIdRef.current,
        });
      }
    };
  }, [streamId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const loadToken = async () => {
    try {
      const { token: t } = await api.getStreamToken(streamId!);
      setToken(t);
    } catch {
      setError('Failed to load stream.');
    }
  };

  const loadAnalytics = async () => {
    try {
      const result = await api.getStreamAnalytics(streamId!);
      setAnalytics(result);
    } catch {
      // The token load path owns the visible error state.
    }
  };

  const join = async () => {
    if (!token) return;
    setJoining(true);
    setError('');
    try {
      const r = await connectToLiveKitRoom(token, import.meta.env.VITE_LIVEKIT_URL);
      setRoom(r);
      roomRef.current = r;
      const result = await api.viewerJoin(streamId!, {
        viewer_id: viewerIdRef.current,
      });
      joinedRef.current = true;
      sessionIdRef.current = result.session_id;
      viewerIdRef.current = result.viewer_id;
      storeViewerId(result.viewer_id);
      setAnalytics(result.analytics);
    } catch {
      roomRef.current?.disconnect();
      roomRef.current = null;
      setRoom(null);
      setError('Failed to join stream.');
    } finally {
      setJoining(false);
    }
  };

  const leave = async () => {
    room?.disconnect();
    roomRef.current = null;
    setRoom(null);
    if (!joinedRef.current || !streamId) return;
    joinedRef.current = false;
    try {
      const result = await api.viewerLeave(streamId, {
        session_id: sessionIdRef.current ?? undefined,
        viewer_id: viewerIdRef.current,
      });
      sessionIdRef.current = null;
      setAnalytics(result.analytics);
    } catch {
      // The room already disconnected; keep the viewer experience unstuck.
    }
  };

  if (error && !token) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Stream</h1>
            <p className="text-gray-400 text-sm mt-1">ID: {streamId}</p>
            {analytics && (
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-400">
                <span>Status <span className="text-white">{analytics.status}</span></span>
                <span>Viewers <span className="text-white">{analytics.viewer_count}</span></span>
                <span>Peak <span className="text-white">{analytics.peak_viewer_count}</span></span>
                <span>Unique <span className="text-white">{analytics.unique_viewer_count}</span></span>
                <span>Watch time <span className="text-white">{formatDuration(analytics.total_watch_time_seconds)}</span></span>
                <span>Avg watch <span className="text-white">{formatDuration(analytics.average_watch_duration_seconds)}</span></span>
                {analytics.session_duration_seconds !== null && (
                  <span>Session <span className="text-white">{formatDuration(analytics.session_duration_seconds)}</span></span>
                )}
                <span>Duration <span className="text-white">{formatDuration(
                  analytics.status === 'live' && analytics.started_at
                    ? Math.max(
                        0,
                        Math.floor((currentTime - new Date(analytics.started_at).getTime()) / 1000),
                      )
                    : analytics.duration_seconds,
                )}</span></span>
              </div>
            )}
          </div>
          {!room && token && !joining && (
            <button
              onClick={join}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Join stream
            </button>
          )}
          {joining && <p className="text-sm text-gray-400">Connecting...</p>}
          {room && (
            <button
              onClick={leave}
              className="text-sm bg-red-900 hover:bg-red-800 text-red-200 px-4 py-2 rounded-md transition-colors"
            >
              Leave stream
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {room ? (
          <div className="border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-green-400 text-lg font-medium">Connected to stream</p>
            <p className="text-gray-500 text-sm mt-2">
              Video rendering available after LiveKit completes room setup.
            </p>
          </div>
        ) : (
          <div className="border border-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-500">
              {token ? 'Click Join to watch this stream.' : 'Loading stream...'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function getOrCreateViewerId(): string {
  if (typeof window === 'undefined') {
    return crypto.randomUUID();
  }

  const existing = localStorage.getItem('glive_viewer_id');
  if (existing) return existing;

  const next = crypto.randomUUID();
  localStorage.setItem('glive_viewer_id', next);
  return next;
}

function storeViewerId(viewerId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('glive_viewer_id', viewerId);
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
