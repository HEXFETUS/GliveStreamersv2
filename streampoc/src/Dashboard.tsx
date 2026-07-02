import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
  VideoTrack,
  useTracks,
} from '@livekit/components-react'
import { Track, RoomEvent, ConnectionState } from 'livekit-client'
import type { Participant } from 'livekit-client'
import '@livekit/components-styles'
import { playSound, playGiftSound } from "./sound";
import {
  REACTION_SOUND_MAP,
  DANCE_SOUND_MAP,
  GIFT_EMOJIS,
} from "./soundboard";
import LiveSidePanel from './LiveSidePanel'

const API_BASE = ''
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://glivestreamer-t2otgzur.livekit.cloud'

/* ── reactions array kept for potential reuse ── */
/*
const reactions = [
  { id: 'smile', label: 'Smile', emoji: '\u{1F642}' },
  { id: 'happy', label: 'Happy', emoji: '\u{1F600}' },
  { id: 'laughing', label: 'Laughing', emoji: '\u{1F602}' },
  { id: 'sad', label: 'Sad', emoji: '\u{1F61E}' },
  { id: 'crying', label: 'Crying', emoji: '\u{1F622}' },
  { id: 'angry', label: 'Angry', emoji: '\u{1F620}' },
  { id: 'heart', label: 'Heart', emoji: '\u{2764}\u{FE0F}' },
]
*/

type FloatingReaction = {
  key: number
  emoji: string
  left: number
  duration: number
}

type DanceAnimation = {
  key: number
  danceType: string
  emoji: string
  left: number
  createdAt: number
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
  // const reactionId = useRef(0)
  const remoteReactionId = useRef(0)
  const danceId = useRef(0)

  const [isLive, setIsLive] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [floatingReactions] = useState<FloatingReaction[]>([])
  const [remoteReactions, setRemoteReactions] = useState<FloatingReaction[]>([])
  const [danceAnimations, setDanceAnimations] = useState<DanceAnimation[]>([])
  const [lkToken, setLkToken] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const roomName = 'demo-main-stage'
  const identity = user?.name || `creator-${Math.random().toString(36).substring(2, 9)}`

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

  const stopStream = useCallback(() => {
    setLkToken(null)
    setIsLive(false)
  }, [])

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
    if (window.innerWidth <= 1023) {
      // Mobile/Tablet: use browser fullscreen API
      const el = frameRef.current
      if (!el) return
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      } else {
        el.requestFullscreen().catch(() => {
          setIsMaximized((prev) => !prev)
        })
      }
    } else {
      // Desktop: CSS maximize within page
      setIsMaximized((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    const onChange = () => {
      setIsMaximized(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else if (isMaximized) {
          setIsMaximized(false)
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMaximized])

  /* ── addLocalReaction kept for potential reuse ── */
  /*
  const addLocalReaction = useCallback((emoji: string) => {
    const key = reactionId.current++
    setFloatingReactions((prev) => [
      ...prev,
      { key, emoji, left: 10 + Math.random() * 80, duration: 2200 + Math.random() * 800 },
    ])
    window.setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.key !== key))
    }, 3000)
  }, [])
  */

  const addRemoteReaction = useCallback((emoji: string) => {
    const key = remoteReactionId.current++
    setRemoteReactions((prev) => [
      ...prev,
      { key, emoji, left: 5 + Math.random() * 90, duration: 2400 + Math.random() * 1000 },
    ])
    window.setTimeout(() => {
      setRemoteReactions((prev) => prev.filter((r) => r.key !== key))
    }, 3400)
  }, [])

  const addDanceAnimation = useCallback((danceType: string, emoji: string) => {
    const key = danceId.current++
    const newDance: DanceAnimation = {
      key,
      danceType,
      emoji,
      left: 10 + Math.random() * 60,
      createdAt: Date.now(),
    }
    setDanceAnimations((prev) => [...prev, newDance])
    window.setTimeout(() => {
      setDanceAnimations((prev) => prev.filter((d) => d.key !== key))
    }, 3500)
  }, [])

  return (
    <main className="dashboard">
      {/* Sidebar – becomes top bar on tablet/mobile */}
      <aside className="sidebar" aria-label="Stream controls">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div>
            <strong>StreamPOC</strong>
            <span className="hidden sm:block">Creator console</span>
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
          <strong className="truncate max-w-30">{roomName}</strong>
          <button type="button" className="whitespace-nowrap" onClick={isLive ? stopStream : goLive} disabled={connecting}>
            {connecting ? 'Connecting…' : isLive ? 'End live' : 'Go live'}
          </button>
          {onLogout && (
            <button type="button" className="logout-button" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      </aside>

      {/* Main workspace — TikTok-style side-by-side layout */}
      <section className="workspace-stream">
        <section className="stream-video-area">
          <section className={`preview-panel ${isMaximized ? 'is-maximized' : ''}`} aria-label="Stream preview">
            <div className={`preview-frame ${isMaximized ? 'is-maximized' : ''}`} ref={frameRef}>
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
                  <ReactionListener addRemoteReaction={addRemoteReaction} onDance={addDanceAnimation} />
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
                  <span key={reaction.key} className="floating-reaction" style={{ left: `${reaction.left}%`, animationDuration: `${reaction.duration}ms` }}>
                    {reaction.emoji}
                  </span>
                ))}
                {remoteReactions.map((reaction) => (
                  <span key={reaction.key} className="floating-reaction" style={{ left: `${reaction.left}%`, animationDuration: `${reaction.duration}ms` }}>
                    {reaction.emoji}
                  </span>
                ))}
                {danceAnimations.map((dance) => (
                  <span
                    key={dance.key}
                    className={`dance-emoji dance-${dance.danceType}`}
                    style={{ left: `${dance.left}%` }}
                  >
                    {dance.emoji}
                  </span>
                ))}
              </div>

              {/* ── Reaction bar hidden for now (may be re-enabled later) ── */}
              {/*
              <div className="reaction-bar flex-nowrap sm:flex-wrap" role="group" aria-label="Send a reaction">
                {reactions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="reaction-button"
                    title={r.label}
                    aria-label={`React with ${r.label}`}
                    onClick={() => addLocalReaction(r.emoji)}
                  >
                    <span aria-hidden="true">{r.emoji}</span>
                  </button>
                ))}
              </div>
              */}
            </div>

            <div className="control-row" aria-label="Broadcast controls">
              <button className={`icon-button ${cameraOn ? 'active' : ''}`} type="button" aria-label="Toggle camera" aria-pressed={cameraOn} onClick={toggleCamera}>
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </span>
              </button>
              <button className={`icon-button ${micOn ? 'active' : ''}`} type="button" aria-label="Toggle microphone" aria-pressed={micOn} onClick={toggleMic}>
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </span>
              </button>
              <button className="danger sm:ml-auto" type="button" onClick={stopStream} disabled={!isLive}>
                End rehearsal
              </button>
            </div>
          </section>
        </section>

        <LiveSidePanel />
      </section>
    </main>
  )
}

function ReactionListener({ addRemoteReaction, onDance }: { addRemoteReaction: (emoji: string) => void; onDance: (danceType: string, emoji: string) => void }) {
  const room = useRoomContext()
  const connectionState = useConnectionState()
  const reactionCallbackRef = useRef(addRemoteReaction)
  const danceCallbackRef = useRef(onDance)
  reactionCallbackRef.current = addRemoteReaction
  danceCallbackRef.current = onDance

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return
    if (!room) return

    const handler = (payload: Uint8Array, participant?: Participant) => {
      if (participant?.identity === room.localParticipant?.identity) return
      try {
const msg = JSON.parse(new TextDecoder().decode(payload))

if (msg?.type === 'reaction' && typeof msg.emoji === 'string') {
    reactionCallbackRef.current(msg.emoji)
    const sound = REACTION_SOUND_MAP[msg.emoji]
    if (sound) {
      playSound(sound)
    } else if (GIFT_EMOJIS.has(msg.emoji)) {
      playGiftSound(msg.emoji)
    }
}
if (
    msg?.type === 'dance' &&
    typeof msg.danceType === 'string' &&
    typeof msg.emoji === 'string'
) {
    danceCallbackRef.current(msg.danceType, msg.emoji)
    const sound = DANCE_SOUND_MAP[msg.danceType]
    if (sound) playSound(sound)
}
      } catch (err) {
  console.error("ReactionListener error:", err)
}
    }

    room.on(RoomEvent.DataReceived, handler)
    return () => { room.off(RoomEvent.DataReceived, handler) }
  }, [room, connectionState])

  return null
}

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