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

function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => { document.title = prev }
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
      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
    />
  )
}

/**
 * Subscribes to the streamer's microphone audio and renders it.
 * Uses useTracks() which returns proper TrackReference objects.
 */
function AudioRenderer() {
  const tracks = useTracks([Track.Source.Microphone])
  const { localParticipant } = useLocalParticipant()

  if (tracks.length === 0) return null

  // Only render audio from remote participants (skip the viewer's own mic — they don't publish one anyway)
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

/**
 * Reaction bar that publishes emoji via data channel to the streamer.
 */
function ReactionSender({ onLocalReaction }: { onLocalReaction: (emoji: string) => void }) {
  const { localParticipant } = useLocalParticipant()
  const lastSentAt = useRef<number>(0)

  const handleReaction = useCallback((emoji: string) => {
    if (!localParticipant) return

    const now = Date.now()
    if (now - lastSentAt.current < 500) return
    lastSentAt.current = now

    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ type: 'reaction', emoji })
      )
      localParticipant.publishData(payload, { reliable: false })
      console.log('[WatchPage] published reaction:', emoji, '(identity:', localParticipant.identity, ')')
    } catch (err) {
      console.warn('[WatchPage] publishData error:', err)
    }

    onLocalReaction(emoji)
  }, [localParticipant, onLocalReaction])

  return (
    <div className="reaction-bar" role="group" aria-label="Send a reaction">
      {reactions.map((reaction) => (
        <button
          key={reaction.id}
          type="button"
          className="reaction-button"
          title={reaction.label}
          aria-label={`React with ${reaction.label}`}
          onClick={() => handleReaction(reaction.emoji)}
        >
          <span aria-hidden="true">{reaction.emoji}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Listens for data messages from other participants (the streamer).
 * Uses useRoomContext() with useConnectionState() guard.
 */
function ReactionReceiver({ onReaction }: { onReaction: (emoji: string) => void }) {
  const room = useRoomContext()
  const connectionState = useConnectionState()
  const callbackRef = useRef(onReaction)
  callbackRef.current = onReaction

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return
    if (!room || !room.localParticipant) return

    const handler = (payload: Uint8Array, participant?: Participant) => {
      if (participant?.identity === room.localParticipant?.identity) return
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg?.type === 'reaction' && typeof msg.emoji === 'string') {
          callbackRef.current(msg.emoji)
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const [remoteReactions, setRemoteReactions] = useState<FloatingReaction[]>([])
  const reactionId = useRef(0)
  const remoteReactionId = useRef(0)

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
        <button type="button" className="watch-fullscreen" onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? '⛶' : '⛶'}
        </button>
      </div>
      <div className="watch-container">
        <div
          id="watch-video-wrapper"
          className={`watch-video-wrapper${isFullscreen ? ' is-fullscreen' : ''}`}
          style={{ background: '#000' }}
        >
          <LiveKitRoom
            video={false}
            audio={true}
            token={token}
            serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'wss://glivestreamer-t2otgzur.livekit.cloud'}
            data-lk-theme="default"
            connect={true}
            onDisconnected={() => { setToken(null) }}
          >
            <StreamerView />
            <AudioRenderer />
            <ReactionReceiver onReaction={addRemoteReaction} />

            <div className="reaction-stage" aria-hidden="true">
              {floatingReactions.map((r) => (
                <span key={r.key} className="floating-reaction"
                  style={{ left: `${r.left}%`, animationDuration: `${r.duration}ms` }}>
                  {r.emoji}
                </span>
              ))}
              {remoteReactions.map((r) => (
                <span key={r.key} className="floating-reaction"
                  style={{ left: `${r.left}%`, animationDuration: `${r.duration}ms` }}>
                  {r.emoji}
                </span>
              ))}
            </div>

            <ReactionSender onLocalReaction={addLocalReaction} />
          </LiveKitRoom>
        </div>
      </div>
    </main>
  )
}

export default WatchPage