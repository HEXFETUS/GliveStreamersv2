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

const danceReactions = [
  { id: 'dance1', label: 'Spin',   emoji: '\u{1F483}', danceType: 'dance1' },
  { id: 'dance2', label: 'Bounce', emoji: '\u{1F57A}', danceType: 'dance2' },
  { id: 'dance3', label: 'Wave',   emoji: '\u{1F389}', danceType: 'dance3' },
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
  const lastDanceAt = useRef<number>(0)

const handleReaction = useCallback((emoji: string) => {
  if (!localParticipant) return

  const now = Date.now()
  if (now - lastSentAt.current < 500) return
  lastSentAt.current = now

const sound = REACTION_SOUND_MAP[emoji]
if (sound) {
  playSound(sound)
}

  try {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'reaction', emoji })
    )

    localParticipant.publishData(payload, { reliable: false })
  } catch (err) {
    console.warn(err)
  }

  onLocalReaction(emoji)
}, [localParticipant, onLocalReaction])

const handleDance = useCallback((danceType: string, emoji: string) => {
  if (!localParticipant) return

  const now = Date.now()
  if (now - lastDanceAt.current < 2000) return
  lastDanceAt.current = now

const sound = DANCE_SOUND_MAP[danceType]
  if (sound) {
    playSound(sound);
  }

  try {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'dance', danceType, emoji })
    )

    localParticipant.publishData(payload, { reliable: false })
    console.log('[WatchPage] published dance:', danceType)
  } catch (err) {
    console.warn(err)
  }
}, [localParticipant])

  return (
    <>
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
      <div className="dance-bar" role="group" aria-label="Send a dance">
        {danceReactions.map((dance) => (
          <button
            key={dance.id}
            type="button"
            className="dance-button"
            title={dance.label}
            aria-label={`Send ${dance.label} dance`}
            onClick={() => handleDance(dance.danceType, dance.emoji)}
          >
            <span aria-hidden="true">{dance.emoji}</span>
            <span className="dance-label">{dance.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

/**
 * Listens for data messages from other participants (the streamer).
 * Uses useRoomContext() with useConnectionState() guard.
 */
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
if (
  msg?.type === "reaction" &&
  typeof msg.emoji === "string"
) {
  reactionRef.current(msg.emoji)
}

if (
  msg?.type === "dance" &&
  typeof msg.danceType === "string" &&
  typeof msg.emoji === "string"
) {
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

const reactionId = useRef(0)
const remoteReactionId = useRef(0)
const danceId = useRef(0)

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
 console.log("Dance animation called", danceType, emoji)
  const sound = DANCE_SOUND_MAP[danceType]
  if (sound) {
    playSound(sound)
  }

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

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMaximized])

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
          id="watch-video-wrapper"
          className={`watch-video-wrapper${isMaximized ? ' is-maximized' : ''}`}
          style={{ background: '#fff' }}
        >
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
            audio={true}
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
            onDance={addDanceAnimation}/>

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

            <ReactionSender onLocalReaction={addLocalReaction} />
          </LiveKitRoom>
        </div>
      </div>
    </main>
  )
}

export default WatchPage