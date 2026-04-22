/**
 * Notification service — sends booking confirmations to customer + restaurant.
 * In production, POST to your API Gateway endpoint which triggers lf4 Lambda (SES + SNS).
 */

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || null

export async function sendBookingNotifications({ booking, customer, restaurant }) {
  if (API_ENDPOINT) {
    await fetch(`${API_ENDPOINT}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking, customer, restaurant }),
    })
    return
  }

  // Mock: log what would be sent
  console.log('[SmartDine] Notification sent to customer:', customer.email)
  console.log('[SmartDine] Notification sent to restaurant:', restaurant.email)
  console.log('[SmartDine] Booking details:', booking)
}

export async function sendRecurringBookingNotification({ booking, customer, restaurant }) {
  if (API_ENDPOINT) {
    await fetch(`${API_ENDPOINT}/notify/recurring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking, customer, restaurant, type: 'recurring' }),
    })
    return
  }

  console.log('[SmartDine] Recurring booking notification:', { customer, restaurant, booking })
}
