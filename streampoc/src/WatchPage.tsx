import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  AudioTrack,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react'
import { Track, RoomEvent, ConnectionState } from 'livekit-client'
import type { Participant } from 'livekit-client'
import '@livekit/components-styles'
import { playSound } from "./sound";
import {
  REACTION_SOUND_MAP,
  DANCE_SOUND_MAP,
} from "./soundboard";

function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => { document.title = prev }
  }, [title])
}

const API_BASE = import.meta.env.VITE_API_BASE || ''

const MOCK_GIFTS = [
  { id: 'like',    emoji: '\uD83D\uDC4D', label: 'Like',    cost: 1 },
  { id: 'heart',   emoji: '\u2764\uFE0F', label: 'Heart',   cost: 5 },
  { id: 'star',    emoji: '\uD83C\uDF1F', label: 'Star',    cost: 10 },
  { id: 'crown',   emoji: '\uD83D\uDC51', label: 'Crown',   cost: 50 },
  { id: 'rocket',  emoji: '\uD83D\uDE80', label: 'Rocket',  cost: 100 },
  { id: 'diamond', emoji: '\uD83D\uDC8E', label: 'Diamond', cost: 200 },
]

const MOCK_COMMENTS = [
  { id: 1, user: 'Viewer_1', text: 'Great stream!' },
  { id: 2, user: 'StreamFan', text: 'Hello everyone!' },
  { id: 3, user: 'CoolCat', text: 'Looking good!' },
  { id: 4, user: 'MusicLover', text: 'What song is this?' },
  { id: 5, user: 'Viewer_1', text: 'Keep it up!' },
]

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

const reactions = [
  { id: 'smile',    label: 'Smile',    emoji: '\u{1F642}' },
  { id: 'happy',    label: 'Happy',    emoji: '\u{1F600}' },
  { id: 'laughing', label: 'Laughing', emoji: '\u{1F602}' },
  { id: 'sad',      label: 'Sad',      emoji: '\u{1F61E}' },
  { id: 'crying',   label: 'Crying',   emoji: '\u{1F622}' },
  { id: 'angry',    label: 'Angry',    emoji: '\u{1F620}' },
  { id: 'heart',    label: 'Heart',    emoji: '\u{2764}\u{FE0F}' },
]

type WatchPageProps = {
  roomName: string
  onBack: () => void
}

function generateViewerId(): string {
  return `viewer-${Math.random().toString(36).substring(2, 9)}`
}

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
      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }}
    />
  )
}

function AudioRenderer() {
  const tracks = useTracks([Track.Source.Microphone])
  const { localParticipant } = useLocalParticipant()

  if (tracks.length === 0) return null

  return (
    <>
      {tracks.map((track) => {
        if (track.participant.identity === localParticipant?.identity) return null
        return (
          <AudioTrack key={track.participant.identity} trackRef={track} />
        )
      })}
    </>
  )
}

function ReactionReceiver({
  onReaction,
  onDance,
}: {
  onReaction: (emoji: string) => void
  onDance: (danceType: string, emoji: string) => void
}) {
  const room = useRoomContext()
  const connectionState = useConnectionState()
  const reactionRef = useRef(onReaction)
  const danceRef = useRef(onDance)

  reactionRef.current = onReaction
  danceRef.current = onDance

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return
    if (!room || !room.localParticipant) return

    const handler = (payload: Uint8Array, participant?: Participant) => {
      if (participant?.identity === room.localParticipant?.identity) return
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg?.type === 'reaction' && typeof msg.emoji === 'string') {
          reactionRef.current(msg.emoji)
        }
        if (msg?.type === 'dance' && typeof msg.danceType === 'string' && typeof msg.emoji === 'string') {
          danceRef.current(msg.danceType, msg.emoji)
        }
      } catch { /* ignore */ }
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => { room.off(RoomEvent.DataReceived, handler) }
  }, [room, connectionState])

  return null
}

function WatchPage({ roomName, onBack }: WatchPageProps) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [isMaximized, setIsMaximized] = useState(false)

  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const [remoteReactions, setRemoteReactions] = useState<FloatingReaction[]>([])
  const [danceAnimations, setDanceAnimations] = useState<DanceAnimation[]>([])
  const [comments] = useState(MOCK_COMMENTS)
  const [chatText, setChatText] = useState('')
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const reactionId = useRef(0)
  const remoteReactionId = useRef(0)
  const danceId = useRef(0)
  const pickerRef = useRef<HTMLDivElement>(null)

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

  const addLocalReaction = useCallback((emoji: string) => {
    const key = reactionId.current++
    const newReaction: FloatingReaction = {
      key, emoji,
      left: 5 + Math.random() * 90,
      duration: 2200 + Math.random() * 800,
    }
    setFloatingReactions((prev) => [...prev, newReaction])
    window.setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.key !== key))
    }, newReaction.duration)
  }, [])

  const addRemoteReaction = useCallback((emoji: string) => {
    const key = remoteReactionId.current++
    const newReaction: FloatingReaction = {
      key, emoji,
      left: 5 + Math.random() * 90,
      duration: 2400 + Math.random() * 1000,
    }
    setRemoteReactions((prev) => [...prev, newReaction])
    window.setTimeout(() => {
      setRemoteReactions((prev) => prev.filter((r) => r.key !== key))
    }, newReaction.duration)
  }, [])

  const addDanceAnimation = useCallback((danceType: string, emoji: string) => {
    const key = danceId.current++
    const sound = DANCE_SOUND_MAP[danceType]
    if (sound) playSound(sound)
    const newDance: DanceAnimation = {
      key, danceType, emoji,
      left: 10 + Math.random() * 60,
      createdAt: Date.now(),
    }
    setDanceAnimations((prev) => [...prev, newDance])
    window.setTimeout(() => {
      setDanceAnimations((prev) => prev.filter((d) => d.key !== key))
    }, 3500)
  }, [])

  const wrapperRef = useRef<HTMLDivElement>(null)

  const isMobileOrTablet = useCallback(() => {
    return window.innerWidth <= 1023
  }, [])

  const toggleMaximize = useCallback(() => {
    if (isMobileOrTablet()) {
      // Mobile/Tablet: use browser fullscreen API
      const el = wrapperRef.current
      if (!el) return
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      } else {
        el.requestFullscreen().catch(() => {
          // Fallback: CSS maximize
          setIsMaximized((prev) => !prev)
        })
      }
    } else {
      // Desktop: CSS maximize within page
      setIsMaximized((prev) => !prev)
    }
  }, [isMobileOrTablet])

  // Fullscreen change listener (for mobile/tablet)
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

  // Close reaction picker when clicking outside
  useEffect(() => {
    if (!showReactionPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowReactionPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showReactionPicker])

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setChatText('')
  }

  const handleGift = (giftId: string) => {
    // Send gift as a reaction so it appears as floating emoji on the stream
    const gift = MOCK_GIFTS.find((g) => g.id === giftId)
    if (!gift) return
    const emoji = gift.emoji
    addLocalReaction(emoji)
    // Dispatch custom event so TtReactionSender sends it over the data channel
    window.dispatchEvent(new CustomEvent('tt-reaction', { detail: { emoji } }))
  }

  const handleReactionClick = (emoji: string) => {
    addLocalReaction(emoji)
    setShowReactionPicker(false)
    // Dispatch custom event so TtReactionSender sends it over the data channel
    window.dispatchEvent(new CustomEvent('tt-reaction', { detail: { emoji } }))
  }

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  if (error) {
    return (
      <main className="watch-page">
        <div className="watch-error">
          <p role="alert">{error}</p>
          <button type="button" onClick={onBack}>Back to homepage</button>
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

  return (
    <main className="watch-page">
      <div className="watch-header">
        <button type="button" className="watch-back" onClick={onBack}>← Back</button>
        <strong className="watch-room-name">{roomName}</strong>
      </div>
      <div className="watch-container">
          <div
          ref={wrapperRef}
          id="watch-video-wrapper"
          className={`watch-video-wrapper${isMaximized ? ' is-maximized' : ''}`}
          style={{ background: '#fff' }}
        >
          {/* Back button for fullscreen mode (mobile/tablet) */}
          <button
            type="button"
            className="fs-back-button"
            aria-label="Exit fullscreen and go back"
            title="Exit fullscreen"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {})
              }
              onBack()
            }}
          >
            ←
          </button>
          <button
            type="button"
            className="fullscreen-button"
            aria-label={isMaximized ? 'Exit maximize' : 'Maximize'}
            title={isMaximized ? 'Exit maximize' : 'Maximize'}
            onClick={toggleMaximize}
          >
            {isMaximized ? '\u2715' : '\u26F6'}
          </button>
          <LiveKitRoom
            video={false}
            audio={false}
            token={token}
            serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'wss://glivestreamer-t2otgzur.livekit.cloud'}
            data-lk-theme="default"
            connect={true}
            onDisconnected={() => { setToken(null) }}
          >
            <StreamerView />
            <AudioRenderer />
            <ReactionReceiver
              onReaction={addRemoteReaction}
              onDance={addDanceAnimation}
            />

            {/* ── Floating reactions & dances ── */}
            <div className="tt-reaction-stage" aria-hidden="true">
              {floatingReactions.map((r) => (
                <span key={r.key} className="tt-floating-reaction"
                  style={{ left: `${r.left}%`, animationDuration: `${r.duration}ms` }}>
                  {r.emoji}
                </span>
              ))}
              {remoteReactions.map((r) => (
                <span key={r.key} className="tt-floating-reaction"
                  style={{ left: `${r.left}%`, animationDuration: `${r.duration}ms` }}>
                  {r.emoji}
                </span>
              ))}
              {danceAnimations.map((dance) => (
                <span
                  key={dance.key}
                  className={`tt-dance-emoji tt-dance-${dance.danceType}`}
                  style={{ left: `${dance.left}%` }}
                >
                  {dance.emoji}
                </span>
              ))}
            </div>

            {/* ── Comments overlay (left side) ── */}
            <div className="tt-comments-overlay" aria-label="Comments">
              <div className="tt-comments-list">
                {comments.map((c) => (
                  <div key={c.id} className="tt-comment">
                    <span className="tt-comment-user">{c.user}</span>
                    <span className="tt-comment-text">{c.text}</span>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            </div>

            {/* ── Bottom interaction bar: gifts + reaction trigger + chat ── */}
            <div className="tt-bottom-bar">
              {/* Gifts row */}
              <div className="tt-gifts-row">
                {MOCK_GIFTS.slice(0, 4).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="tt-gift-btn"
                    title={`${g.label} (${g.cost} tokens)`}
                    onClick={() => handleGift(g.id)}
                  >
                    {g.emoji}
                  </button>
                ))}
              </div>

              {/* Reaction trigger button */}
              <div className="tt-reaction-trigger-wrapper" ref={pickerRef}>
                <button
                  type="button"
                  className="tt-reaction-trigger"
                  aria-label="Send reaction"
                  onClick={() => setShowReactionPicker((prev) => !prev)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
                {showReactionPicker && (
                  <div className="tt-reaction-picker">
                    {reactions.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="tt-reaction-pick"
                        title={r.label}
                        onClick={() => handleReactionClick(r.emoji)}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat input */}
              <form className="tt-chat-form" onSubmit={handleChatSubmit}>
                <input
                  type="text"
                  className="tt-chat-input"
                  placeholder="Send a message…"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  maxLength={500}
                />
              </form>
            </div>

            {/* Inline reaction-sender that uses LiveKit data channel */}
            <TtReactionSender onLocalReaction={addLocalReaction} />
          </LiveKitRoom>
        </div>
      </div>
    </main>
  )
}

/** Sends reactions & dances over the LiveKit data channel */
function TtReactionSender({ onLocalReaction }: { onLocalReaction: (emoji: string) => void }) {
  const { localParticipant } = useLocalParticipant()
  const lastSentAt = useRef<number>(0)

  // We use a custom event approach: listen for a custom DOM event from the reaction picker
  useEffect(() => {
    if (!localParticipant) return

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { emoji: string }
      if (!detail?.emoji) return

      const now = Date.now()
      if (now - lastSentAt.current < 500) return
      lastSentAt.current = now

      const sound = REACTION_SOUND_MAP[detail.emoji]
      if (sound) playSound(sound)

      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ type: 'reaction', emoji: detail.emoji })
        )
        localParticipant.publishData(payload, { reliable: false })
      } catch (err) {
        console.warn(err)
      }

      onLocalReaction(detail.emoji)
    }

    window.addEventListener('tt-reaction', handler)
    return () => window.removeEventListener('tt-reaction', handler)
  }, [localParticipant, onLocalReaction])

  return null
}

export default WatchPage