import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  messages: [
    {
      id: 1,
      role: 'bot',
      text: "Hi! I'm SmartDine, your dining concierge for Delhi & NCR. Which area are you looking to eat in?",
      timestamp: new Date().toISOString(),
    },
  ],
  isTyping: false,
  sessionId: crypto.randomUUID?.() ?? (Math.random().toString(36).slice(2) + Date.now().toString(36)),
  restaurantResults: [],
  selectedRestaurant: null,

  addMessage: (role, text, extra = {}) => {
    const msg = {
      id: Date.now(),
      role,
      text,
      timestamp: new Date().toISOString(),
      ...extra,
    }
    set((state) => ({ messages: [...state.messages, msg] }))
    return msg
  },

  setTyping: (val) => set({ isTyping: val }),

  setRestaurantResults: (results) => set({ restaurantResults: results }),

  setSelectedRestaurant: (restaurant) => set({ selectedRestaurant: restaurant }),

  clearResults: () => set({ restaurantResults: [] }),

  resetMessages: () => set({
    messages: [{
      id: Date.now(),
      role: 'bot',
      text: "Hi! I'm SmartDine, your dining concierge for Delhi & NCR. Which area are you looking to eat in?",
      timestamp: new Date().toISOString(),
    }],
    restaurantResults: [],
    isTyping: false,
  }),
}))
