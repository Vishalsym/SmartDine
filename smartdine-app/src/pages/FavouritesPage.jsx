import { useState } from 'react'
import { Heart, Repeat, Trash2, Clock, Users, Calendar, ToggleLeft, ToggleRight, Star, MapPin } from 'lucide-react'
import { useBookingStore } from '../store/useBookingStore'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMES = ['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM']

function FavouriteCard({ fav, onRemove, onToggle, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [day, setDay] = useState(fav.dayOfWeek)
  const [time, setTime] = useState(fav.preferredTime)
  const [partySize, setPartySize] = useState(fav.partySize)

  const handleSave = () => {
    onUpdate(fav.restaurantId, { dayOfWeek: day, preferredTime: time, partySize })
    setEditing(false)
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all ${fav.active ? '' : 'opacity-50'}`}
      style={{ background: '#1a1a1a', border: `1px solid ${fav.active ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)'}` }}
    >
      {/* Image */}
      <div className="relative h-28 overflow-hidden">
        <img src={fav.restaurantImage} alt="" className="w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.8))' }} />

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <Heart size={14} className="text-orange-400 fill-orange-400" />
          <span className="text-orange-400 text-xs font-semibold">Favourite</span>
        </div>

        {/* Active toggle */}
        <button
          onClick={() => onToggle(fav.restaurantId)}
          className="absolute top-2.5 right-2.5 cursor-pointer"
          title={fav.active ? 'Disable auto-booking' : 'Enable auto-booking'}
        >
          {fav.active
            ? <ToggleRight size={22} className="text-orange-400" />
            : <ToggleLeft size={22} className="text-white/30" />
          }
        </button>

        <div className="absolute bottom-2.5 left-3">
          <p className="text-white font-semibold text-sm">{fav.restaurantName}</p>
          <p className="text-white/50 text-xs">{fav.cuisine}</p>
        </div>
      </div>

      {/* Schedule info */}
      <div className="p-4">
        {!editing ? (
          <>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
              style={{ background: fav.active ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Repeat size={13} className={fav.active ? 'text-orange-400' : 'text-white/30'} />
              <span className={`text-xs font-medium ${fav.active ? 'text-orange-300' : 'text-white/40'}`}>
                Every {fav.dayOfWeek} · {fav.preferredTime} · {fav.partySize} guests
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white transition-colors cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Edit Schedule
              </button>
              <button
                onClick={() => onRemove(fav.restaurantId)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-white/40 text-xs mb-1.5 font-medium">Day</p>
              <div className="flex gap-1 flex-wrap">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                      day === d ? 'text-orange-400' : 'text-white/40 hover:text-white'
                    }`}
                    style={{
                      background: day === d ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${day === d ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-white/40 text-xs mb-1">Time</p>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
                  style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1">Guests</p>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className="w-full rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
                  style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FavouritesPage() {
  const favourites = useBookingStore((s) => s.favourites)
  const removeFavourite = useBookingStore((s) => s.removeFavourite)
  const toggleFavouriteActive = useBookingStore((s) => s.toggleFavouriteActive)
  const addFavourite = useBookingStore((s) => s.addFavourite)

  const handleUpdate = (restaurantId, updates) => {
    const fav = favourites.find((f) => f.restaurantId === restaurantId)
    if (fav) addFavourite({ ...fav, ...updates })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/8 shrink-0" style={{ background: '#111' }}>
        <h1 className="text-white font-semibold text-base">Favourite Restaurants</h1>
        <p className="text-white/40 text-xs mt-0.5">Auto-booked weekly based on your schedule</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {favourites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}
            >
              <Heart size={24} className="text-orange-400" />
            </div>
            <p className="text-white/50 text-sm font-medium">No favourite restaurants yet</p>
            <p className="text-white/25 text-xs mt-1.5 max-w-xs leading-relaxed">
              When booking a restaurant, toggle "Mark as favourite" to enable weekly auto-booking on your chosen day.
            </p>
          </div>
        ) : (
          <>
            {/* Active count banner */}
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl mb-5"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}
            >
              <Repeat size={16} className="text-orange-400" />
              <div>
                <p className="text-orange-300 text-sm font-medium">
                  {favourites.filter((f) => f.active).length} active weekly bookings
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  SmartDine will auto-book these restaurants on your chosen days each week.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {favourites.map((fav) => (
                <FavouriteCard
                  key={fav.id}
                  fav={fav}
                  onRemove={removeFavourite}
                  onToggle={toggleFavouriteActive}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
