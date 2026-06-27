import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/axios';
import {
  attachRemoteAudioTrack,
  attachRemoteVideoTrack,
  connectToLiveKitRoom,
  detachRemoteTrack,
  RoomEvent,
  Track,
  type RemoteAudioTrack,
  type RemoteTrack,
  type RemoteVideoTrack,
  type Room,
} from '@glive/livekit';
import type { Stream, StreamAnalytics } from '@glive/sdk';

export default function StreamPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const joinedRef = useRef(false);
  const autoJoinStartedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const viewerIdRef = useRef(getOrCreateViewerId());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoTrackRef = useRef<RemoteVideoTrack | null>(null);
  const audioSinkRef = useRef<HTMLDivElement | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const trackCleanupRef = useRef<(() => void) | null>(null);
  const [analytics, setAnalytics] = useState<StreamAnalytics | null>(null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!streamId) return;
    autoJoinStartedRef.current = false;
    setToken(null);
    setRoom(null);
    setHasVideo(false);
    setStream(null);
    setError('');
    loadToken();
    loadAnalytics();
    loadStreamDetails();
  }, [streamId]);

  useEffect(() => {
    return () => {
      cleanupViewerTracks();
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

  const loadStreamDetails = async () => {
    try {
      const streams = await api.listPublicStreams();
      setStream(streams.find((item) => item.id === streamId) ?? null);
    } catch {
      setStream(null);
    }
  };

  const join = async () => {
    if (!token) return;
    setJoining(true);
    setError('');
    try {
      const r = await connectToLiveKitRoom(token, import.meta.env.VITE_LIVEKIT_URL);
      bindViewerTracks(r);
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

  useEffect(() => {
    if (!token || roomRef.current || autoJoinStartedRef.current) return;

    autoJoinStartedRef.current = true;
    void join();
  }, [token]);

  const leave = async () => {
    cleanupViewerTracks();
    room?.disconnect();
    roomRef.current = null;
    setRoom(null);

    if (!joinedRef.current || !streamId) {
      navigate('/');
      return;
    }

    try {
      const result = await api.viewerLeave(streamId, {
        session_id: sessionIdRef.current ?? undefined,
        viewer_id: viewerIdRef.current,
      });
      joinedRef.current = false;
      sessionIdRef.current = null;
      setAnalytics(result.analytics);
    } catch {
      // The room already disconnected; keep the viewer experience unstuck.
    } finally {
      joinedRef.current = false;
      navigate('/');
    }
  };

  const bindViewerTracks = (nextRoom: Room) => {
    cleanupViewerTracks();

    const handleSubscribed = (track: RemoteTrack) => {
      attachViewerTrack(track);
    };

    const handleUnsubscribed = (track: RemoteTrack) => {
      detachViewerTrack(track);
    };

    nextRoom.on(RoomEvent.TrackSubscribed, handleSubscribed);
    nextRoom.on(RoomEvent.TrackUnsubscribed, handleUnsubscribed);

    nextRoom.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.track) {
          attachViewerTrack(publication.track);
        }
      });
    });

    trackCleanupRef.current = () => {
      nextRoom.off(RoomEvent.TrackSubscribed, handleSubscribed);
      nextRoom.off(RoomEvent.TrackUnsubscribed, handleUnsubscribed);
      if (activeVideoTrackRef.current && videoRef.current) {
        detachRemoteTrack(activeVideoTrackRef.current, videoRef.current);
      }
      activeVideoTrackRef.current = null;
      setHasVideo(false);
      audioElementsRef.current.forEach((element) => {
        element.remove();
      });
      audioElementsRef.current = [];
    };
  };

  const attachViewerTrack = (track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video && videoRef.current) {
      if (activeVideoTrackRef.current && activeVideoTrackRef.current !== track) {
        detachRemoteTrack(activeVideoTrackRef.current, videoRef.current);
      }

      activeVideoTrackRef.current = track as RemoteVideoTrack;
      attachRemoteVideoTrack(activeVideoTrackRef.current, videoRef.current);
      setHasVideo(true);
      return;
    }

    if (track.kind === Track.Kind.Audio) {
      const element = attachRemoteAudioTrack(track as RemoteAudioTrack);
      element.className = 'hidden';
      audioElementsRef.current.push(element);
      (audioSinkRef.current ?? document.body).appendChild(element);
    }
  };

  const detachViewerTrack = (track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video && activeVideoTrackRef.current === track && videoRef.current) {
      detachRemoteTrack(track, videoRef.current);
      activeVideoTrackRef.current = null;
      setHasVideo(false);
      return;
    }

    if (track.kind === Track.Kind.Audio) {
      detachRemoteTrack(track);
      audioElementsRef.current.forEach((element) => element.remove());
      audioElementsRef.current = [];
    }
  };

  function cleanupViewerTracks() {
    trackCleanupRef.current?.();
    trackCleanupRef.current = null;
  }

  if (error && !token) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050509] p-4 text-white">
      <div className="mx-auto max-w-6xl">
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
              className="rounded-md bg-violet-600 px-6 py-2 font-medium text-white transition-colors hover:bg-violet-500"
            >
              Join Stream
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

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl shadow-violet-950/30">
            <div className="relative aspect-video bg-gradient-to-br from-violet-950 via-slate-950 to-black">
              <video ref={videoRef} className="h-full w-full bg-black object-contain" autoPlay playsInline />
              {!hasVideo && (
                <div className="absolute inset-0 grid place-items-center bg-black/35 p-8 text-center">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {joining ? 'Connecting to live stream...' : room ? 'Waiting for broadcaster video...' : 'Opening stream...'}
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">
                      {token ? 'The player will start automatically when video is available.' : 'Loading secure viewer token.'}
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute left-4 top-4 rounded bg-red-600 px-3 py-1 text-xs font-black">LIVE</div>
              {analytics && (
                <div className="absolute bottom-4 right-4 rounded bg-black/70 px-3 py-2 text-sm font-semibold">
                  {analytics.viewer_count} viewers
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 bg-zinc-950 px-4 py-4">
              <div className="min-w-0">
                <p className="truncate font-bold">{stream?.title ?? (room ? 'Live stream connected' : 'Joining live stream')}</p>
                <p className="truncate text-sm text-zinc-400">
                  {stream?.description || 'The viewer opens automatically from the landing page.'}
                </p>
              </div>
              {room && (
                <button
                  onClick={leave}
                  className="ml-4 shrink-0 rounded-md bg-red-950 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-900"
                >
                  Leave
                </button>
              )}
            </div>
          </section>

          <aside className="grid gap-4">
            <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black">
                  {initials(stream?.title ?? 'GLive')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold">{stream?.title ?? 'GLive Streamer'}</h2>
                    <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[11px] font-bold text-violet-200">Verified</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {stream?.category ? formatCategory(stream.category) : 'Live Creator'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-black/30 p-3">
                  <p className="text-lg font-black">{analytics?.viewer_count ?? 0}</p>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Viewers</p>
                </div>
                <div className="rounded-md bg-black/30 p-3">
                  <p className="text-lg font-black">{analytics?.peak_viewer_count ?? 0}</p>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Peak</p>
                </div>
                <div className="rounded-md bg-black/30 p-3">
                  <p className="text-lg font-black">{formatDuration(analytics?.duration_seconds ?? 0)}</p>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Live</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(stream?.tags.length ? stream.tags : ['creator', 'live', 'community']).slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="flex min-h-[520px] flex-col rounded-lg border border-white/10 bg-white/[0.04]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="font-bold">Comments</h2>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">Live</span>
              </div>
              <div className="flex-1 space-y-4 overflow-hidden p-4">
                {previewComments.map((comment) => (
                  <div key={`${comment.name}-${comment.body}`} className="flex gap-3">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${comment.accent} text-xs font-black`}>
                      {initials(comment.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{comment.name}</p>
                      <p className="text-sm leading-5 text-zinc-300">{comment.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 p-4">
                <div className="rounded-md border border-white/10 bg-black/35 px-3 py-3 text-sm text-zinc-500">
                  Comments coming soon
                </div>
              </div>
            </section>
          </aside>
        </div>
        <div ref={audioSinkRef} className="hidden" />
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

const previewComments = [
  { name: 'AceViewer', body: 'Stream is smooth on my side.', accent: 'from-violet-500 to-fuchsia-500' },
  { name: 'Mika', body: 'That setup looks clean.', accent: 'from-cyan-400 to-blue-600' },
  { name: 'BetCatFan', body: 'Waiting for the next round.', accent: 'from-emerald-400 to-lime-500' },
  { name: 'Renz', body: 'Camera overlay placement is perfect.', accent: 'from-amber-400 to-rose-500' },
  { name: 'GLiveMod', body: 'Welcome everyone. Keep it friendly.', accent: 'from-slate-400 to-zinc-600' },
];

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
