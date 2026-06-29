import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => {
      document.title = prev
    }
  }, [title])
}

const API_BASE = import.meta.env.VITE_API_BASE || ''

type FloatingReaction = {
  key: number
  emoji: string
  left: number
  duration: number
}

const reactions = [
  { id: 'laughing', label: 'Laughing', emoji: '\u{1F602}' },
  { id: 'sad', label: 'Sad', emoji: '\u{1F61E}' },
  { id: 'crying', label: 'Crying', emoji: '\u{1F622}' },
  { id: 'angry', label: 'Angry', emoji: '\u{1F620}' },
  { id: 'heart', label: 'Heart', emoji: '\u{2764}\u{FE0F}' },
]

type WatchPageProps = {
  roomName: string
  onBack: () => void
}

function generateViewerId(): string {
  return `viewer-${Math.random().toString(36).substring(2, 9)}`
}

// Renders only the first camera track (the streamer's feed)
function StreamerView() {
  const tracks = useTracks([Track.Source.Camera])
  if (tracks.length === 0) {
    return (
      <div className="watch-video-placeholder">
        <p>Waiting for stream…</p>
      </div>
    )
  }
  return (
    <VideoTrack
      trackRef={tracks[0]}
      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
    />
  )
}

function WatchPage({ roomName, onBack }: WatchPageProps) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const reactionId = useRef(0)

  useDocumentTitle(`Watching · ${roomName}`)

  const fetchToken = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName: generateViewerId(),
          metadata: JSON.stringify({ role: 'viewer' }),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to get token')
      }
      const data = await res.json()
      setToken(data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to stream')
    } finally {
      setConnecting(false)
    }
  }, [roomName])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  if (error) {
    return (
      <main className="watch-page">
        <div className="watch-error">
          <p role="alert">{error}</p>
          <button type="button" onClick={onBack}>
            Back to homepage
          </button>
        </div>
      </main>
    )
  }

  if (connecting || !token) {
    return (
      <main className="watch-page">
        <div className="watch-loading">
          <div className="watch-spinner" aria-label="Connecting to stream" />
          <p>Connecting to stream…</p>
        </div>
      </main>
    )
  }

  const sendReaction = (emoji: string) => {
    const key = reactionId.current++
    const newReaction: FloatingReaction = {
      key,
      emoji,
      left: 5 + Math.random() * 90,
      duration: 2200 + Math.random() * 800,
    }
    setFloatingReactions((prev) => [...prev, newReaction])
    window.setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.key !== key))
    }, newReaction.duration)

    // viewer reactions are now local-only for now
  }

  const toggleFullscreen = () => {
    const el = document.getElementById('watch-video-wrapper')
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <main className="watch-page">
      <div className="watch-header">
        <button type="button" className="watch-back" onClick={onBack}>
          ← Back
        </button>
        <strong className="watch-room-name">{roomName}</strong>
        <button
          type="button"
          className="watch-fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? '⛶' : '⛶'}
        </button>
      </div>
      <div className="watch-container">
          <div id="watch-video-wrapper" className={`watch-video-wrapper${isFullscreen ? ' is-fullscreen' : ''}`} style={{ background: '#000' }}>
          <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'wss://glivestreamer-t2otgzur.livekit.cloud'}
            data-lk-theme="default"
            connect={true}
            onDisconnected={() => {
              setToken(null)
            }}
          >
            <StreamerView />
          </LiveKitRoom>

          <div className="reaction-stage" aria-hidden="true">
            {floatingReactions.map((reaction) => (
              <span
                key={reaction.key}
                className="floating-reaction"
                style={{
                  left: `${reaction.left}%`,
                  animationDuration: `${reaction.duration}ms`,
                }}
              >
                {reaction.emoji}
              </span>
            ))}
          </div>

          <div className="reaction-bar" role="group" aria-label="Send a reaction">
            {reactions.map((reaction) => (
              <button
                key={reaction.id}
                type="button"
                className="reaction-button"
                title={reaction.label}
                aria-label={`React with ${reaction.label}`}
                onClick={() => sendReaction(reaction.emoji)}
              >
                <span aria-hidden="true">{reaction.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export default WatchPage