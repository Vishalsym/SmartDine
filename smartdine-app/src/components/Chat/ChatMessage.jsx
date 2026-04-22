import { format } from 'date-fns'

function renderText(text) {
  // Bold **text** support
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const time = format(new Date(message.timestamp), 'h:mm a')

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isUser && (
        <div
          className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold"
          style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}
        >
          SD
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'text-white rounded-tr-sm'
              : 'text-white/90 rounded-tl-sm'
          }`}
          style={
            isUser
              ? { background: 'linear-gradient(135deg, #f97316, #ea580c)' }
              : { background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)' }
          }
        >
          {renderText(message.text)}
        </div>
        <span className="text-white/25 text-xs px-1">{time}</span>
      </div>
    </div>
  )
}
