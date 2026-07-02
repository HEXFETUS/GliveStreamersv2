export const REACTION_SOUND_MAP: Record<string, string> = {
  "🙂": "/audio/slight-smile.wav",
  "😀": "/audio/grin.mp3",
  "😂": "/audio/sitcom-laughing.mp3",
  "😞": "/audio/sad.mp3",
  "😢": "/audio/funnycrying.mp3",
  "😠": "/audio/angry-grrrr.mp3",
  "❤️": "/audio/heart.wav",
}

export const DANCE_SOUND_MAP: Record<string, string> = {
  dance1: "/audio/spin.mp3",
  dance2: "/audio/bounce.mp3",
  dance3: "/audio/horn.mp3",
}

// Gift emojis used in the gift buttons — these play synthetic sounds via sound.ts
export const GIFT_EMOJIS = new Set([
  "\uD83D\uDC4D",   // 👍 Like
  "\u2764\uFE0F",   // ❤️ Heart
  "\uD83C\uDF1F",   // ⭐ Star
  "\uD83D\uDC51",   // 👑 Crown
  "\uD83D\uDE80",   // 🚀 Rocket
  "\uD83D\uDC8E",   // 💎 Diamond
])
