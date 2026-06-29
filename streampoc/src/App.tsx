import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const reactions = [
  { id: 'smile', label: 'Smile', emoji: '\u{1F642}' },
  { id: 'happy', label: 'Happy', emoji: '\u{1F600}' },
  { id: 'laughing', label: 'Laughing', emoji: '\u{1F602}' },
  { id: 'sad', label: 'Sad', emoji: '\u{1F61E}' },
  { id: 'crying', label: 'Crying', emoji: '\u{1F622}' },
]

type FloatingReaction = {
  key: number
  emoji: string
  left: number
  duration: number
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const reactionId = useRef(0)

  const [isLive, setIsLive] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsLive(false)
  }, [])

  const goLive = useCallback(async () => {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera and microphone are not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Apply current toggle state to the freshly opened tracks.
      stream.getVideoTracks().forEach((track) => (track.enabled = cameraOn))
      stream.getAudioTracks().forEach((track) => (track.enabled = micOn))

      setIsLive(true)
    } catch (err) {
      const reason =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Permission to use the camera and microphone was denied.'
          : 'Could not access the camera or microphone.'
      setError(reason)
    }
  }, [cameraOn, micOn])

  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => {
      const next = !prev
      streamRef.current?.getVideoTracks().forEach((track) => (track.enabled = next))
      return next
    })
  }, [])

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev
      streamRef.current?.getAudioTracks().forEach((track) => (track.enabled = next))
      return next
    })
  }, [])

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
      setFloatingReactions((prev) => prev.filter((reaction) => reaction.key !== key))
    }, newReaction.duration)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current
    if (!frame) return

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined)
    } else {
      frame.requestFullscreen().catch(() => {
        setError('Fullscreen is not supported in this browser.')
      })
    }
  }, [])

  // Track fullscreen changes (including Esc to exit).
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Stop all tracks when the component unmounts.
  useEffect(() => stopStream, [stopStream])

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

        <div className="go-live-panel">
          <span>Room</span>
          <strong>demo-main-stage</strong>
          <button type="button" onClick={isLive ? stopStream : goLive}>
            {isLive ? 'End live' : 'Go live'}
          </button>
        </div>
      </aside>

      <section className="workspace">
        <section className="preview-panel" aria-label="Stream preview">
          <div className="preview-frame" ref={frameRef}>
            <video
              ref={videoRef}
              className={`preview-video ${isLive ? 'is-live' : ''}`}
              autoPlay
              playsInline
              muted
            />
            {!isLive && <div className="preview-noise"></div>}

            <button
              type="button"
              className="fullscreen-button"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? '\u2715' : '\u26F6'}
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

export default App
