/**
 * bookingService.js
 * Handles real API calls to lf3 (booking Lambda) when VITE_API_ENDPOINT is set.
 * Falls back to local Zustand store in mock mode.
 */

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || null

export async function createBookingRemote(bookingPayload) {
  if (!API_ENDPOINT) {
    // Mock mode — just simulate a delay, actual store write happens in BookingModal
    await new Promise((r) => setTimeout(r, 1000))
    return { success: true, bookingId: bookingPayload.bookingId || `BK-MOCK-${Date.now()}` }
  }

  const res = await fetch(`${API_ENDPOINT}/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingPayload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Booking failed: ${res.status}`)
  }

  return res.json()
}
