import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useBookingStore = create(
  persist(
    (set, get) => ({
      bookings: [],
      favourites: [],

      addBooking: (booking) => {
        const newBooking = {
          ...booking,
          id: `BK-${Date.now()}`,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ bookings: [newBooking, ...state.bookings] }))
        return newBooking
      },

      cancelBooking: (bookingId) => {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'cancelled' } : b
          ),
        }))
      },

      addFavourite: (fav) => {
        const exists = get().favourites.find((f) => f.restaurantId === fav.restaurantId)
        if (exists) {
          set((state) => ({
            favourites: state.favourites.map((f) =>
              f.restaurantId === fav.restaurantId ? { ...fav, id: f.id } : f
            ),
          }))
        } else {
          set((state) => ({
            favourites: [
              ...state.favourites,
              { ...fav, id: `FAV-${Date.now()}`, active: true, addedAt: new Date().toISOString() },
            ],
          }))
        }
      },

      removeFavourite: (restaurantId) => {
        set((state) => ({
          favourites: state.favourites.filter((f) => f.restaurantId !== restaurantId),
        }))
      },

      toggleFavouriteActive: (restaurantId) => {
        set((state) => ({
          favourites: state.favourites.map((f) =>
            f.restaurantId === restaurantId ? { ...f, active: !f.active } : f
          ),
        }))
      },
    }),
    { name: 'smartdine-bookings' }
  )
)
