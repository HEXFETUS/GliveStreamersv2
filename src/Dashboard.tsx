import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LiveKitRoom,
  useLocalParticipant,
  VideoTrack,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

const API_BASE = ''
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://glivestreamer-t2otgzur.livekit.cloud'

const reactions = [
  { id: 'smile', label: 'Smile', emoji: '\u{1F642}' },
  { id: 'happy', label: 'Happy', emoji: '\u{1F600}' },
  { id: 'laughing', label: 'Laughing', emoji: '\u{1F602}' },
  { id: 'sad', label: 'Sad', emoji: '\u{1F61E}' },
  { id: 'crying', label: 'Crying', emoji: '\u{1F622}' },
  { id: 'angry', label: 'Angry', emoji: '\u{1F620}' },
  { id: 'heart', label: 'Heart', emoji: '\u{2764}\u{FE0F}' },
]

type FloatingReaction = {
  key: number
  emoji: string
  left: number
  duration: number
}

type User = {
  id: string
  email: string
  name: string
}

type DashboardProps = {
  user: User | null
  token: string | null
  onLogout?: () => void
}

function Dashboard({ user, onLogout }: DashboardProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const reactionId = useRef(0)

  const [isLive, setIsLive] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>(
    []
  )
  const [remoteReactions] = useState<FloatingReaction[]>([])
  const [lkToken, setLkToken] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const roomName = 'demo-main-stage'
  const identity = user?.name || `creator-${Math.random().toString(36).substring(2, 9)}`

  // Fetch a LiveKit token from backend
  const fetchLkToken = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName: identity,
          metadata: JSON.stringify({
            role: 'creator',
            streamerName: identity,
          }),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to get token')
      }
      const data = await res.json()
      setLkToken(data.token)
      setIsLive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start stream')
      setIsLive(false)
    } finally {
      setConnecting(false)
    }
  }, [roomName, identity])

  // Stop streaming: disconnect by clearing token
  const stopStream = useCallback(() => {
    setLkToken(null)
    setIsLive(false)
  }, [])

  // Handle going live
  const goLive = useCallback(async () => {
    setError(null)
    await fetchLkToken()
  }, [fetchLkToken])

  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => !prev)
  }, [])

  const toggleMic = useCallback(() => {
    setMicOn((prev) => !prev)
  }, [])

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev)
  }, [])

  // Handle Escape key to exit maximize
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMaximized])

  const sendReaction = useCallback((emoji: string) => {
    const key = reactionId.current++
    const newReaction: FloatingReaction = {
      key,
      emoji,
      left: 10 + Math.random() * 80,
      duration: 2200 + Math.random() * 800,
    }
    setFloatingReactions((prev) => [...prev, newReaction])
    window.setTimeout(() => {
      setFloatingReactions((prev) =>
        prev.filter((reaction) => reaction.key !== key)
      )
    }, newReaction.duration)
  }, [])

  return (
    <main className="dashboard">
      <aside className="sidebar" aria-label="Stream controls">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            S
          </div>
          <div>
            <strong>StreamPOC</strong>
            <span>Creator console</span>
          </div>
        </div>

        {user && (
          <div className="user-info">
            <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
            <div>
              <strong className="user-name">{user.name}</strong>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
        )}

        <div className="go-live-panel">
          <span>Room</span>
          <strong>{roomName}</strong>
          <button type="button" onClick={isLive ? stopStream : goLive} disabled={connecting}>
            {connecting ? 'Connecting…' : isLive ? 'End live' : 'Go live'}
          </button>
          {onLogout && (
            <button type="button" className="logout-button" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      </aside>

      <section className="workspace">
        <section className={`preview-panel ${isMaximized ? 'is-maximized' : ''}`} aria-label="Stream preview">
          <div className={`preview-frame ${isMaximized ? 'is-maximized' : ''}`} ref={frameRef}>
            {/* When LiveKit is connected, show the LiveKit room which publishes tracks */}
            {lkToken ? (
              <LiveKitRoom
                video={true}
                audio={true}
                token={lkToken}
                serverUrl={LIVEKIT_URL}
                connect={true}
                style={{ position: 'absolute', inset: 0, zIndex: 1 }}
                onDisconnected={() => {
                  setLkToken(null)
                  setIsLive(false)
                }}
              >
                <LiveControls />
                <LocalVideo />
              </LiveKitRoom>
            ) : (
              <div className="preview-noise"></div>
            )}

            <button
              type="button"
              className="fullscreen-button"
              aria-label={isMaximized ? 'Exit maximize' : 'Maximize'}
              title={isMaximized ? 'Exit maximize' : 'Maximize'}
              onClick={toggleMaximize}
            >
              {isMaximized ? '\u2715' : '\u26F6'}
            </button>

            <div className="preview-overlay">
              <span className={`live-pill ${isLive ? 'on-air' : ''}`}>
                {isLive ? 'Live' : 'Standby'}
              </span>
            </div>
            {error && <p className="preview-error" role="alert">{error}</p>}

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
              {remoteReactions.map((reaction) => (
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

          <div className="control-row" aria-label="Broadcast controls">
            <button
              className={`icon-button ${cameraOn ? 'active' : ''}`}
              type="button"
              aria-label="Toggle camera"
              aria-pressed={cameraOn}
              onClick={toggleCamera}
            >
              <span aria-hidden="true"></span>
            </button>
            <button
              className={`icon-button mic ${micOn ? 'active' : ''}`}
              type="button"
              aria-label="Toggle microphone"
              aria-pressed={micOn}
              onClick={toggleMic}
            >
              <span aria-hidden="true"></span>
            </button>
            <button className="danger" type="button" onClick={stopStream} disabled={!isLive}>
              End rehearsal
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}

// Inner component to control camera/mic via LiveKit once connected
function LiveControls() {
  const { localParticipant } = useLocalParticipant()
  const [cameraOn] = useState(true)
  const [micOn] = useState(true)

  useEffect(() => {
    if (!localParticipant) return
    localParticipant.setCameraEnabled(cameraOn).catch(() => undefined)
    localParticipant.setMicrophoneEnabled(micOn).catch(() => undefined)
  }, [cameraOn, micOn, localParticipant])

  return null
}

// Renders the local video track from LiveKit
function LocalVideo() {
  const tracks = useTracks([Track.Source.Camera])
  if (tracks.length === 0) return null
  return (
    <VideoTrack
      trackRef={tracks[0]}
      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
    />
  )
}

export default Dashboard