import { useState, useEffect, useCallback } from 'react'
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

type HomePageProps = {
  onLoginClick: () => void
  onWatchStream: (roomName: string) => void
}

type LiveRoom = {
  name: string
  participantCount: number
  createdAt: number
  metadata: Record<string, unknown> | null
}

const API_BASE = import.meta.env.VITE_API_BASE || ''
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://glivestreamer-t2otgzur.livekit.cloud'

function LivePreview({ roomName }: { roomName: string; onJoin: () => void }) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName: `viewer-${Math.random().toString(36).slice(2, 9)}`,
          metadata: JSON.stringify({ role: 'viewer' }),
        }),
      })
      if (!res.ok) throw new Error('Failed to get token')
      const data = await res.json()
      setToken(data.token)
    } catch {
      setError('Could not load stream')
    }
  }, [roomName])

  useEffect(() => {
    fetchToken()
    const interval = setInterval(fetchToken, 300000)
    return () => clearInterval(interval)
  }, [fetchToken])

  if (error) {
    return (
      <div className="live-preview-error">
        <p>{error}</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="live-preview-loading">
        <div className="live-preview-spinner" />
      </div>
    )
  }

  function RemoteVideo() {
    const tracks = useTracks([Track.Source.Camera])
    if (tracks.length === 0) return null
    return (
      <VideoTrack
        trackRef={tracks[0]}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    )
  }

  return (
    <div className="live-preview-container">
      <LiveKitRoom
        video
        audio
        token={token}
        serverUrl={LIVEKIT_URL}
        connect
        style={{ position: 'absolute', inset: 0 }}
      >
        <RemoteVideo />
      </LiveKitRoom>
    </div>
  )
}

function HomePage({ onLoginClick, onWatchStream }: HomePageProps) {
  const [rooms, setRooms] = useState<LiveRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let retries = 0
    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchRooms = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rooms`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data: LiveRoom[] = await res.json()
        if (!cancelled) {
          setRooms(data)
          setLoading(false)
        }
      } catch {
        if (retries < 5 && !cancelled) {
          retries++
          setTimeout(fetchRooms, 2000)
          return
        }
        if (!cancelled) setLoading(false)
      }
    }

    const initialDelay = setTimeout(() => {
      fetchRooms()
      intervalId = setInterval(fetchRooms, 10000)
    }, 8000)

    return () => {
      cancelled = true
      clearTimeout(initialDelay)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div>
            <strong>StreamPOC</strong>
            <span>Go live in seconds</span>
          </div>
        </div>
        <button type="button" className="nav-login" onClick={onLoginClick}>Login</button>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <span className="hero-eyebrow">Creator platform</span>
          <h1>Stream to your audience with a console built for creators.</h1>
          <p className="hero-lead">
            Manage your camera, mic, and live reactions from one clean dashboard.
            Jump in, go live, and connect with your community.
          </p>
          <div className="hero-actions">
            <button type="button" className="hero-login" onClick={onLoginClick}>
              Login to your dashboard
            </button>
            <span className="hero-note">No sign up required for this demo</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-card">
            <span className="hero-live-pill">Live</span>
            <div className="hero-screen"></div>
            <div className="hero-controls">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </main>

      <section className="live-section">
        <div className="live-section-header">
          <h2>Live Now</h2>
          {loading && <span className="live-refreshing">Refreshing…</span>}
        </div>

        {rooms.length === 0 && !loading ? (
          <p className="live-empty">
            No one is streaming right now.{' '}
            <button type="button" className="live-empty-link" onClick={onLoginClick}>
              Be the first!
            </button>
          </p>
        ) : (
          <div className="live-grid">
            {rooms.map((room) => (
              <button
                key={room.name}
                type="button"
                className="live-card"
                onClick={() => onWatchStream(room.name)}
              >
                <div className="live-card-media">
                  <LivePreview roomName={room.name} onJoin={() => onWatchStream(room.name)} />
                  <div className="live-card-badge">Live</div>
                  <div className="live-card-viewers">
                    {room.participantCount} viewer{room.participantCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="live-card-info">
                  <strong className="live-card-name">
                    {(room.metadata?.streamerName as string) || room.name}
                  </strong>
                  <span className="live-card-room">{room.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default HomePage