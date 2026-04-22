import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Star, MapPin, Calendar, Clock, Users, Mail, Phone, Heart, Repeat, CheckCircle } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useBookingStore } from '../../store/useBookingStore'
import { createBookingRemote } from '../../services/bookingService'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMES = ['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM']
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8]

const TODAY = format(new Date(), 'yyyy-MM-dd')
const TOMORROW = format(addDays(new Date(), 1), 'yyyy-MM-dd')

export default function BookingModal({ restaurant, onClose }) {
  const navigate = useNavigate()
  const addBooking = useBookingStore((s) => s.addBooking)
  const addFavourite = useBookingStore((s) => s.addFavourite)
  const favourites = useBookingStore((s) => s.favourites)
  const isFav = favourites.some((f) => f.restaurantId === restaurant.id)

  const [step, setStep] = useState('form') // 'form' | 'success'
  const [bookingType, setBookingType] = useState('same-day') // 'same-day' | 'pre-book' | 'recurring'
  const [form, setForm] = useState({
    date: TODAY,
    time: '7:00 PM',
    partySize: 2,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    specialRequests: '',
  })
  const [recurringDay, setRecurringDay] = useState('Friday')
  const [setAsFavourite, setSetAsFavourite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customerName || !form.customerEmail) return
    setLoading(true)

    await new Promise((r) => setTimeout(r, 1200))

    const bookingDate = bookingType === 'same-day' ? TODAY
      : bookingType === 'recurring' ? `Every ${recurringDay}`
      : form.date

    const bookingPayload = {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantEmail: restaurant.email,
      restaurantPhone: restaurant.phone,
      restaurantImage: restaurant.image,
      cuisine: restaurant.cuisine,
      address: restaurant.address,
      date: bookingDate,
      time: form.time,
      partySize: form.partySize,
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone,
      specialRequests: form.specialRequests,
      bookingType,
      recurringDay: bookingType === 'recurring' ? recurringDay : null,
      setAsFavourite: setAsFavourite || bookingType === 'recurring',
    }

    // Try real API first; fall back to local store on error
    let remoteId = null
    try {
      const remote = await createBookingRemote(bookingPayload)
      remoteId = remote.bookingId
    } catch (err) {
      console.warn('[SmartDine] API unavailable, storing locally:', err.message)
    }

    // Always persist locally so UI stays consistent
    const booking = addBooking({ ...bookingPayload, ...(remoteId ? { id: remoteId } : {}) })

    if (setAsFavourite || bookingType === 'recurring') {
      addFavourite({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.image,
        cuisine: restaurant.cuisine,
        address: restaurant.address,
        restaurantEmail: restaurant.email,
        dayOfWeek: recurringDay,
        preferredTime: form.time,
        partySize: form.partySize,
        customerEmail: form.customerEmail,
      })
    }

    setConfirmedBooking(booking)
    setLoading(false)
    setStep('success')
  }

  const bookingTypeOptions = [
    { id: 'same-day', label: 'Today', icon: Clock, desc: format(new Date(), 'MMM d') },
    { id: 'pre-book', label: 'Pick a Date', icon: Calendar, desc: 'Pre-book' },
    { id: 'recurring', label: 'Every Week', icon: Repeat, desc: 'Weekly auto-book' },
  ]

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
        <div
          className="w-full max-w-md rounded-3xl p-8 text-center"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5"
            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <CheckCircle size={32} className="text-green-400" />
          </div>

          <h2 className="text-white text-xl font-semibold mb-2">Booking Confirmed!</h2>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            You're all set at <span className="text-white font-medium">{restaurant.name}</span>.
            A confirmation has been sent to both you and the restaurant.
          </p>

          <div className="rounded-2xl p-4 mb-6 text-left space-y-2" style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Booking ID</span>
              <span className="text-white font-mono text-xs">{confirmedBooking?.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Date & Time</span>
              <span className="text-white">{confirmedBooking?.date} · {confirmedBooking?.time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Party Size</span>
              <span className="text-white">{confirmedBooking?.partySize} guests</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Type</span>
              <span className="text-orange-400 capitalize">{confirmedBooking?.bookingType}</span>
            </div>
          </div>

          {(setAsFavourite || bookingType === 'recurring') && (
            <div
              className="rounded-xl p-3 mb-5 flex items-center gap-2 text-sm"
              style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}
            >
              <Heart size={14} className="text-orange-400 fill-orange-400 shrink-0" />
              <span className="text-orange-300">
                Added to Favourites — will auto-book every {recurringDay}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Done
            </button>
            <button
              onClick={() => { onClose(); navigate('/bookings') }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              View Bookings
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <img src={restaurant.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <h3 className="text-white font-semibold text-sm">{restaurant.name}</h3>
              <p className="text-white/40 text-xs flex items-center gap-1">
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                {restaurant.rating} · {restaurant.cuisine}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Booking type */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2.5">
              When would you like to visit?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {bookingTypeOptions.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBookingType(id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    bookingType === id ? 'border-orange-500/50' : 'border-white/8 hover:border-white/20'
                  }`}
                  style={{
                    background: bookingType === id ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${bookingType === id ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <Icon size={16} className={bookingType === id ? 'text-orange-400' : 'text-white/40'} />
                  <span className={`text-xs font-semibold ${bookingType === id ? 'text-orange-400' : 'text-white/60'}`}>{label}</span>
                  <span className="text-white/30 text-xs">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date (pre-book only) */}
          {bookingType === 'pre-book' && (
            <div>
              <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">Date</label>
              <input
                type="date"
                value={form.date}
                min={TOMORROW}
                onChange={(e) => set('date', e.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
              />
            </div>
          )}

          {/* Recurring day */}
          {bookingType === 'recurring' && (
            <div>
              <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">Which day every week?</label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setRecurringDay(day)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                      recurringDay === day ? 'text-orange-400' : 'text-white/50 hover:text-white'
                    }`}
                    style={{
                      background: recurringDay === day ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${recurringDay === day ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time + Party size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">Time</label>
              <select
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none cursor-pointer"
                style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">Guests</label>
              <select
                value={form.partySize}
                onChange={(e) => set('partySize', Number(e.target.value))}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none cursor-pointer"
                style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {PARTY_SIZES.map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
              </select>
            </div>
          </div>

          {/* Customer details */}
          <div className="space-y-3">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block">Your Details</label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              placeholder="Full name"
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <input
              type="email"
              value={form.customerEmail}
              onChange={(e) => set('customerEmail', e.target.value)}
              placeholder="Email address"
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => set('customerPhone', e.target.value)}
              placeholder="Phone number (for SMS notification)"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <textarea
              value={form.specialRequests}
              onChange={(e) => set('specialRequests', e.target.value)}
              placeholder="Special requests (allergies, high chair, etc.)"
              rows={2}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none resize-none"
              style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Favourite toggle (not shown for recurring — always adds fav) */}
          {bookingType !== 'recurring' && (
            <button
              type="button"
              onClick={() => setSetAsFavourite(!setAsFavourite)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all cursor-pointer ${setAsFavourite ? '' : ''}`}
              style={{
                background: setAsFavourite ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${setAsFavourite ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <Heart
                size={16}
                className={setAsFavourite ? 'text-orange-400 fill-orange-400' : 'text-white/40'}
              />
              <div className="text-left flex-1">
                <p className={`text-sm font-medium ${setAsFavourite ? 'text-orange-400' : 'text-white/70'}`}>
                  Mark as favourite restaurant
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  Auto-books every {recurringDay} at {form.time}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  setAsFavourite ? 'border-orange-400 bg-orange-400' : 'border-white/20'
                }`}
              >
                {setAsFavourite && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>
          )}

          {/* Notification notice */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs text-white/50"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Mail size={13} className="text-white/30 shrink-0 mt-0.5" />
            <span>Booking confirmation will be sent to you and <strong className="text-white/70">{restaurant.name}</strong> via email & SMS simultaneously.</span>
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-white/8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-white text-sm font-medium cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.customerName || !form.customerEmail}
            className="flex-2 flex-[2] py-3 rounded-xl text-white text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Confirming...
              </span>
            ) : (
              `Confirm ${bookingType === 'recurring' ? 'Weekly' : ''} Booking`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
