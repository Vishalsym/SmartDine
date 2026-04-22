import { Star, MapPin, Phone, Clock, Heart } from 'lucide-react'
import { useBookingStore } from '../../store/useBookingStore'

export default function RestaurantCard({ restaurant, onBook }) {
  const favourites = useBookingStore((s) => s.favourites)
  const isFav = favourites.some((f) => f.restaurantId === restaurant.id)

  const priceColor = {
    '$': 'text-green-400',
    '$$': 'text-yellow-400',
    '$$$': 'text-orange-400',
    '$$$$': 'text-red-400',
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5 hover:shadow-xl"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7))' }} />

        {/* Open/Closed badge */}
        <span
          className={`absolute top-2.5 left-2.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            restaurant.openNow ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
          style={{ border: `1px solid ${restaurant.openNow ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}
        >
          {restaurant.openNow ? 'Open Now' : 'Closed'}
        </span>

        {isFav && (
          <span className="absolute top-2.5 right-2.5">
            <Heart size={16} className="text-orange-400 fill-orange-400" />
          </span>
        )}

        {/* Price range */}
        <span className={`absolute bottom-2.5 right-2.5 text-sm font-bold ${priceColor[restaurant.priceRange]}`}>
          {restaurant.priceRange}
        </span>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-semibold text-sm leading-snug">{restaurant.name}</h3>
          </div>
          <p className="text-white/50 text-xs mt-0.5">{restaurant.cuisine}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          <span className="text-white text-xs font-semibold">{restaurant.rating}</span>
          <span className="text-white/30 text-xs">({restaurant.reviewCount})</span>
          <span className="text-white/20 text-xs mx-1">·</span>
          <span className="text-white/40 text-xs">{restaurant.distance}</span>
        </div>

        {/* Address */}
        <div className="flex items-start gap-1.5">
          <MapPin size={11} className="text-white/30 mt-0.5 shrink-0" />
          <p className="text-white/40 text-xs leading-snug">{restaurant.address}</p>
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap">
          {restaurant.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full text-white/50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Book button */}
        <button
          onClick={() => onBook(restaurant)}
          className="mt-auto w-full py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
        >
          Book Now
        </button>
      </div>
    </div>
  )
}
