import { useState } from 'react'
import RestaurantCard from './RestaurantCard'

const PAGE_SIZE = 6

export default function RestaurantList({ restaurants, onBook }) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  const shown = restaurants.slice(0, visible)
  const hasMore = visible < restaurants.length

  return (
    <div className="mt-3 mx-2 sm:mx-8">
      <p className="text-white/40 text-xs mb-3 font-medium uppercase tracking-wider">
        Showing {shown.length} of {restaurants.length} restaurants
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:grid-cols-3">
        {shown.map((r) => (
          <RestaurantCard key={r.id} restaurant={r} onBook={onBook} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-colors cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Show more ({restaurants.length - visible} remaining)
        </button>
      )}
    </div>
  )
}