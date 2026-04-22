import { useRef, useEffect, useState } from 'react'
import { useChatStore } from '../store/useChatStore'
import { sendMessage, resetChat } from '../services/lexService'
import ChatMessage from '../components/Chat/ChatMessage'
import ChatInput from '../components/Chat/ChatInput'
import TypingIndicator from '../components/Chat/TypingIndicator'
import RestaurantList from '../components/Restaurant/RestaurantList'
import BookingModal from '../components/Booking/BookingModal'

export default function ChatPage() {
  const { messages, isTyping, restaurantResults, addMessage, setTyping, setRestaurantResults, resetMessages } = useChatStore()
  const [bookingTarget, setBookingTarget] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, restaurantResults])

  const handleSend = async (text) => {
    addMessage('user', text)
    setTyping(true)
    setRestaurantResults([])

    try {
      const response = await sendMessage(text)

      if (response.type === 'restaurants') {
        addMessage('bot', response.text)
        setRestaurantResults(response.restaurants)
      } else {
        addMessage('bot', response.text)
      }
    } catch {
      addMessage('bot', "Sorry, I'm having trouble connecting right now. Please try again.")
    } finally {
      setTyping(false)
    }
  }

  const handleReset = () => {
    resetMessages()
    resetChat()
    setRestaurantResults([])
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div
        className="px-4 sm:px-6 py-4 border-b border-white/8 flex items-center justify-between shrink-0"
        style={{ background: '#111' }}
      >
        <div>
          <h1 className="text-white font-semibold text-base">Dining Concierge</h1>
          <p className="text-white/40 text-xs flex items-center gap-1.5 mt-0.5 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 inline-block" />
            <span className="truncate whitespace-nowrap">Online · Powered by Amazon Lex · Built by Vishal Sharma</span>
          </p>
        </div>
        <button
          onClick={handleReset}
          className="text-white/30 hover:text-white/70 text-xs transition-colors cursor-pointer px-2 py-1 rounded-lg"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        {restaurantResults.length > 0 && (
          <RestaurantList restaurants={restaurantResults} onBook={setBookingTarget} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} />

      {/* Booking modal */}
      {bookingTarget && (
        <BookingModal
          restaurant={bookingTarget}
          onClose={() => setBookingTarget(null)}
        />
      )}
    </div>
  )
}
