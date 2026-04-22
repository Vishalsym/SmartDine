import { NavLink } from 'react-router-dom'
import { MessageSquare, Calendar, Heart, ChevronRight } from 'lucide-react'
import { useBookingStore } from '../../store/useBookingStore'

const navItems = [
  { to: '/', icon: MessageSquare, label: 'Chat', exact: true },
  { to: '/bookings', icon: Calendar, label: 'My Bookings' },
  { to: '/favourites', icon: Heart, label: 'Favourites' },
]

export default function Sidebar() {
  const bookings = useBookingStore((s) => s.bookings)
  const upcoming = bookings.filter((b) => b.status === 'confirmed').length
  const favourites = useBookingStore((s) => s.favourites)

  const badges = {
    '/bookings': upcoming || null,
    '/favourites': favourites.length || null,
  }

  return (
    <aside className="w-64 shrink-0 border-r border-white/8 hidden md:flex flex-col" style={{ background: '#111' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}
          >
            SD
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">SmartDine</p>
            <p className="text-white/40 text-xs mt-0.5">Dining Concierge</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-orange-500/15 text-orange-400'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {badges[to] && (
              <span className="text-xs bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                {badges[to]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer hint */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="rounded-xl p-3" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
          <p className="text-orange-400 text-xs font-medium">Weekly Favourites</p>
          <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
            Mark restaurants as favourite to auto-book every week.
          </p>
        </div>
      </div>
    </aside>
  )
}
