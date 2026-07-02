import { useState, useRef, useEffect } from 'react'

type ChatMessage = {
  id: number
  user: string
  text: string
  timestamp: number
}

type LiveSidePanelProps = {
  /** Optional gifts config; empty array hides the gifts section */
  gifts?: { id: string; emoji: string; label: string; cost: number }[]
  /** Called when a gift is clicked – no-op placeholder by default */
  onGift?: (giftId: string) => void
  /** Placeholder label for chat input */
  chatPlaceholder?: string
}

const MOCK_GIFTS = [
  { id: 'like',    emoji: '\uD83D\uDC4D', label: 'Like',      cost: 1 },
  { id: 'heart',   emoji: '\u2764\uFE0F', label: 'Heart',     cost: 5 },
  { id: 'star',    emoji: '\uD83C\uDF1F', label: 'Star',      cost: 10 },
  { id: 'crown',   emoji: '\uD83D\uDC51', label: 'Crown',     cost: 50 },
  { id: 'rocket',  emoji: '\uD83D\uDE80', label: 'Rocket',    cost: 100 },
  { id: 'diamond', emoji: '\uD83D\uDC8E', label: 'Diamond',   cost: 200 },
]

const MOCK_COMMENTS: ChatMessage[] = [
  { id: 1, user: 'Viewer_1', text: 'Great stream!', timestamp: Date.now() - 60000 },
  { id: 2, user: 'StreamFan', text: 'Hello everyone!', timestamp: Date.now() - 45000 },
  { id: 3, user: 'CoolCat', text: 'Looking good!', timestamp: Date.now() - 30000 },
  { id: 4, user: 'MusicLover', text: 'What song is this?', timestamp: Date.now() - 15000 },
  { id: 5, user: 'Viewer_1', text: 'Keep it up!', timestamp: Date.now() - 5000 },
]

function LiveSidePanel({
  gifts = MOCK_GIFTS,
  onGift,
  chatPlaceholder = 'Send a message…',
}: LiveSidePanelProps) {
  const [comments] = useState<ChatMessage[]>(MOCK_COMMENTS)
  const [chatText, setChatText] = useState('')
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Placeholder – no actual sending logic yet
    setChatText('')
  }

  return (
    <aside className="live-side-panel" aria-label="Live interactions">
      {/* ── Comments Feed ── */}
      <section className="side-comments" aria-label="Comments">
        <div className="side-comments-header">
          <h3>Comments</h3>
          <span className="side-comments-count">{comments.length}</span>
        </div>
        <div className="side-comments-list">
          {comments.map((c) => (
            <div key={c.id} className="side-comment">
              <span className="side-comment-user">{c.user}</span>
              <span className="side-comment-text">{c.text}</span>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
      </section>

      {/* ── Gifts / Tokens ── */}
      {gifts.length > 0 && (
        <section className="side-gifts" aria-label="Send a gift">
          <div className="side-gifts-header">
            <h3>Gifts</h3>
          </div>
          <div className="side-gifts-row">
            {gifts.map((g) => (
              <button
                key={g.id}
                type="button"
                className="side-gift-button"
                title={`${g.label} (${g.cost} tokens)`}
                aria-label={`Send ${g.label}`}
                onClick={() => onGift?.(g.id)}
              >
                <span className="side-gift-emoji">{g.emoji}</span>
                <span className="side-gift-label">{g.label}</span>
                <span className="side-gift-cost">{g.cost}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Chat Input ── */}
      <form className="side-chat-form" onSubmit={handleChatSubmit}>
        <input
          type="text"
          className="side-chat-input"
          placeholder={chatPlaceholder}
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          maxLength={500}
        />
        <button type="submit" className="side-chat-send" disabled={!chatText.trim()}>
          Send
        </button>
      </form>
    </aside>
  )
}

export default LiveSidePanel