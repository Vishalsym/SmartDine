import { useState } from 'react'
import { Send } from 'lucide-react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  const quickPrompts = [
    'Indian food tonight',
    'Best sushi nearby',
    'Italian for 4 people',
    'Show me Mexican places',
  ]

  return (
    <div className="border-t border-white/8 px-4 py-4" style={{ background: '#111' }}>
      {/* Quick prompts */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => onSend(p)}
            disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-full text-white/60 hover:text-orange-400 transition-colors cursor-pointer disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {p}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Ask me anything about dining..."
            rows={1}
            disabled={disabled}
            className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all leading-relaxed"
            style={{
              background: '#1e1e1e',
              border: '1px solid rgba(255,255,255,0.1)',
              minHeight: '44px',
              maxHeight: '120px',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
        >
          <Send size={16} className="text-white" />
        </button>
      </form>
    </div>
  )
}
