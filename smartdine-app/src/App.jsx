import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { MessageSquare, Calendar, Heart } from 'lucide-react'
import Sidebar from './components/Layout/Sidebar'
import ChatPage from './pages/ChatPage'
import BookingsPage from './pages/BookingsPage'
import FavouritesPage from './pages/FavouritesPage'

const mobileNav = [
  { to: '/', icon: MessageSquare, label: 'Chat' },
  { to: '/bookings', icon: Calendar, label: 'Bookings' },
  { to: '/favourites', icon: Heart, label: 'Favourites' },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/favourites" element={<FavouritesPage />} />
            </Routes>
          </main>
          {/* Mobile bottom nav — hidden on md+ where sidebar is visible */}
          <nav className="flex md:hidden shrink-0 border-t border-white/8" style={{ background: '#111' }}>
            {mobileNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ${
                    isActive ? 'text-orange-400' : 'text-white/40'
                  }`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </BrowserRouter>
  )
}
