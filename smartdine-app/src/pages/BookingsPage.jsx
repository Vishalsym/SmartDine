import { useState } from 'react'
import { Calendar, Clock, Users, MapPin, X, CheckCircle, XCircle, Repeat } from 'lucide-react'
import { format, isToday, isFuture, parseISO } from 'date-fns'
import { useBookingStore } from '../store/useBookingStore'

const STATUS_STYLES = {
  confirmed: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', text: 'text-green-400', label: 'Confirmed' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', text: 'text-red-400', label: 'Cancelled' },
  pending: { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)', text: 'text-yellow-400', label: 'Pending' },
}

function BookingCard({ booking, onCancel }) {
  const s = STATUS_STYLES[booking.status] || STATUS_STYLES.confirmed
  const isRecurring = booking.bookingType === 'recurring'
  const isPreBook = booking.bookingType === 'pre-book'

  let dateLabel = booking.date
  try {
    if (!isRecurring && booking.date) {
      const d = parseISO(booking.date)
      dateLabel = isToday(d) ? 'Today' : format(d, 'EEE, MMM d yyyy')
    }
  } catch {}

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Restaurant image strip */}
      <div className="relative h-24 overflow-hidden">
        <img src={booking.restaurantImage} alt="" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.8) 40%, transparent)' }} />
        <div className="absolute inset-0 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm">{booking.restaurantName}</h3>
            <p className="text-white/50 text-xs mt-0.5">{booking.cuisine}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.text}`}
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              {s.label}
            </span>
            {isRecurring && (
              <span className="text-xs px-2 py-0.5 rounded-full text-orange-400 flex items-center gap-1"
                style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                <Repeat size={10} /> Weekly
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 grid grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <Calendar size={12} className="text-white/30" />
          <span>{dateLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <Clock size={12} className="text-white/30" />
          <span>{booking.time}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <Users size={12} className="text-white/30" />
          <span>{booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-xs truncate">
          <MapPin size={12} className="text-white/30 shrink-0" />
          <span className="truncate">{booking.address}</span>
        </div>
      </div>

      {/* Booking ID + cancel */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <span className="text-white/25 text-xs font-mono">{booking.id}</span>
        {booking.status === 'confirmed' && (
          <button
            onClick={() => onCancel(booking.id)}
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X size={11} /> Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const bookings = useBookingStore((s) => s.bookings)
  const cancelBooking = useBookingStore((s) => s.cancelBooking)
  const [filter, setFilter] = useState('upcoming')

  const filtered = bookings.filter((b) => {
    if (filter === 'upcoming') return b.status === 'confirmed'
    if (filter === 'cancelled') return b.status === 'cancelled'
    return true
  })

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: bookings.filter((b) => b.status === 'confirmed').length },
    { id: 'all', label: 'All', count: bookings.length },
    { id: 'cancelled', label: 'Cancelled', count: bookings.filter((b) => b.status === 'cancelled').length },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/8 shrink-0" style={{ background: '#111' }}>
        <h1 className="text-white font-semibold text-base">My Bookings</h1>
        <p className="text-white/40 text-xs mt-0.5">{bookings.length} total reservations</p>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-2 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === tab.id ? 'text-orange-400' : 'text-white/40 hover:text-white'
            }`}
            style={{
              background: filter === tab.id ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === tab.id ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs ${filter === tab.id ? 'text-orange-400' : 'text-white/30'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Calendar size={36} className="text-white/15 mb-4" />
            <p className="text-white/40 text-sm">No {filter === 'cancelled' ? 'cancelled' : 'upcoming'} bookings</p>
            <p className="text-white/20 text-xs mt-1">Chat with the concierge to find and book restaurants</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((b) => (
              <BookingCard key={b.id} booking={b} onCancel={cancelBooking} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
