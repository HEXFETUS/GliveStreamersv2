// Shared AudioContext — created once on first user interaction
let ctx: AudioContext | null = null

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  return ctx
}

// Cache loaded audio buffers
const bufferCache = new Map<string, AudioBuffer>()

/**
 * Load an audio file and decode it into an AudioBuffer.
 * Results are cached for instant replay.
 */
async function loadBuffer(path: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(path)) return bufferCache.get(path)!

  try {
    const res = await fetch(path)
    const arrayBuf = await res.arrayBuffer()
    const audioBuf = await getContext().decodeAudioData(arrayBuf)
    bufferCache.set(path, audioBuf)
    return audioBuf
  } catch {
    console.warn(`Failed to load audio: ${path}`)
    return null
  }
}

/**
 * Play a pre-loaded audio file with optional volume boost.
 * Uses Web Audio API GainNode for amplification beyond 1.0.
 */
export async function playSound(path: string, volume = 2.0) {
  const buffer = await loadBuffer(path)
  if (!buffer) return

  const ac = getContext()
  const source = ac.createBufferSource()
  source.buffer = buffer

  const gain = ac.createGain()
  gain.gain.value = volume

  source.connect(gain)
  gain.connect(ac.destination)
  source.start(0)
}

// ── Synthetic gift sound generators ──

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  rampDown = true,
) {
  const ac = getContext()
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ac.currentTime)

  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, ac.currentTime)
  if (rampDown) {
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  }

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(0)
  osc.stop(ac.currentTime + duration)
}

function playDualTone(f1: number, f2: number, duration: number, volume = 0.25) {
  playTone(f1, duration, 'sine', volume)
  playTone(f2, duration, 'sine', volume)
}

/** 👍 Like — short pleasant note */
export function playLikeSound() {
  playTone(440, 0.15, 'sine', 0.3)
}

/** ❤️ Heart — two ascending notes */
export function playHeartSound() {
  playTone(440, 0.12, 'sine', 0.3)
  setTimeout(() => playTone(660, 0.18, 'sine', 0.25), 100)
}

/** ⭐ Star — high sparkle (dual tone) */
export function playStarSound() {
  playDualTone(880, 1320, 0.2, 0.2)
}

/** 👑 Crown — three-note fanfare */
export function playCrownSound() {
  playTone(523, 0.1, 'triangle', 0.25)
  setTimeout(() => playTone(659, 0.1, 'triangle', 0.25), 100)
  setTimeout(() => playTone(784, 0.2, 'triangle', 0.25), 200)
}

/** 🚀 Rocket — rising pitch sweep */
export function playRocketSound() {
  const ac = getContext()
  const osc = ac.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(150, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.4)

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.15, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(0)
  osc.stop(ac.currentTime + 0.45)
}

/** 💎 Diamond — crystal chime with long decay */
export function playDiamondSound() {
  playDualTone(1200, 1600, 0.6, 0.2)
  setTimeout(() => playTone(800, 0.4, 'sine', 0.12), 150)
}

/**
 * Map emoji gift to its synthetic sound.
 */
export function playGiftSound(emoji: string) {
  switch (emoji) {
    case '\uD83D\uDC4D': playLikeSound(); break     // 👍
    case '\u2764\uFE0F': playHeartSound(); break     // ❤️
    case '\uD83C\uDF1F': playStarSound(); break      // ⭐
    case '\uD83D\uDC51': playCrownSound(); break     // 👑
    case '\uD83D\uDE80': playRocketSound(); break    // 🚀
    case '\uD83D\uDC8E': playDiamondSound(); break   // 💎
    default: break
  }
}