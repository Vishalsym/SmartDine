/**
 * Chat service — calls AWS Lex via API Gateway when available.
 * Falls back to a smart local bot using keyword + area detection.
 * Restaurant data: 1631 real Zomato Delhi/NCR listings.
 */

import { DELHI_NCR_RESTAURANTS, AREA_KEYWORDS } from '../data/restaurantData'

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || null

// ── Area filtering ────────────────────────────────────────────────────────────

function filterRestaurants(area, cuisine) {
  let results = DELHI_NCR_RESTAURANTS

  if (area) {
    const key = area.toLowerCase().trim()
    let matched = []

    // Check AREA_KEYWORDS aliases first (cp, gk, hkv, etc.)
    for (const [keyword, areas] of Object.entries(AREA_KEYWORDS)) {
      if (key.includes(keyword) || keyword.includes(key)) {
        matched = DELHI_NCR_RESTAURANTS.filter((r) =>
          areas.some((a) =>
            r.area.toLowerCase().includes(a.toLowerCase()) ||
            r.locality.toLowerCase().includes(a.toLowerCase())
          )
        )
        if (matched.length) break
      }
    }

    // Direct match on area / locality / address
    if (!matched.length) {
      matched = DELHI_NCR_RESTAURANTS.filter((r) =>
        r.area.toLowerCase().includes(key) ||
        r.locality.toLowerCase().includes(key) ||
        r.address.toLowerCase().includes(key)
      )
    }

    if (matched.length) results = matched
  }

  if (cuisine) {
    const c = cuisine.toLowerCase()
    const byCuisine = results.filter((r) => r.cuisine.toLowerCase().includes(c))
    if (byCuisine.length) results = byCuisine
  }

  // Sort by rating desc
  return results.sort((a, b) => b.rating - a.rating)
}

// ── Smart local bot (fallback when Lex is unavailable) ───────────────────────

const AREA_PATTERN = new RegExp(
  '\\b(' + [
    ...Object.keys(AREA_KEYWORDS),
    'aerocity', 'mehrauli', 'dwarka', 'rohini', 'pitampura',
    'rajouri', 'karol bagh', 'paharganj', 'defence colony',
    'greater noida', 'faridabad', 'indirapuram', 'sector 29',
    'janakpuri', 'dilshad garden', 'preet vihar', 'anand vihar',
    'vasant kunj', 'malviya nagar', 'panchsheel', 'alaknanda',
    'nehru place', 'okhla', 'jasola', 'tughlakabad',
  ].map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'i'
)

const CUISINE_PATTERN = /\b(north indian|south indian|chinese|italian|mughlai|punjabi|continental|biryani|pizza|cafe|desserts|street food|fast food|seafood|awadhi|modern indian|japanese|thai|bakery|parsi|kebab|burger|sushi|mexican|lebanese|mediterranean|multi.?cuisine)\b/i

let localStep = 0
let localArea = ''
let localCuisine = ''

function localBot(userText) {
  const areaMatch  = userText.match(AREA_PATTERN)
  const cuisineMatch = userText.match(CUISINE_PATTERN)

  if (areaMatch)   localArea    = areaMatch[0]
  if (cuisineMatch) localCuisine = cuisineMatch[0]

  const wantsResults = /\b(show|find|search|book|dikhao|batao|suggest|recommend|dhundho|list|options|restaurants?|khaana|khana|food)\b/i.test(userText)
  const isGreeting  = /\b(hi|hello|hey|namaste|hola)\b/i.test(userText)

  if (isGreeting && !areaMatch) {
    localStep = 1
    return { type: 'text', text: "Namaste! Which area in Delhi NCR are you looking to eat in?" }
  }

  // Show results if we have area, or user is asking
  if (localArea || (wantsResults && localStep >= 1)) {
    const area = localArea || ''
    const cuisine = localCuisine || ''
    const results = filterRestaurants(area, cuisine)
    const label = [cuisine, area].filter(Boolean).join(' in ') || 'Delhi NCR'
    localStep = 0
    return {
      type: 'restaurants',
      text: `Here are the top picks for **${label}**! Tap **Book Now** to reserve.`,
      restaurants: results,
    }
  }

  // Ask for area if we don't have it
  localStep++
  if (localStep === 1 || !localArea) {
    return { type: 'text', text: "Which area in Delhi NCR are you looking to eat in? (e.g. Hauz Khas, CP, Cyber Hub, Noida)" }
  }

  return { type: 'text', text: "Tell me the area and I'll show you the best restaurants there!" }
}

// ── Conversation history for Lex sessions ────────────────────────────────────

const uuid = () => crypto.randomUUID?.() ?? (Math.random().toString(36).slice(2) + Date.now().toString(36))

let sessionId = uuid()

export async function sendMessage(userText) {
  // Try real Lex endpoint first
  if (API_ENDPOINT) {
    try {
      const res = await fetch(`${API_ENDPOINT}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, sessionId }),
      })
      if (res.ok) {
        const data = await res.json()
        // Lex returns type:'search' with area+cuisine — filter locally
        if (data.type === 'search' || data.type === 'restaurants') {
          const restaurants = filterRestaurants(data.area || '', data.cuisine || '')
          const label = [data.cuisine, data.area].filter(Boolean).join(' in ') || 'Delhi NCR'
          return {
            type: 'restaurants',
            text: data.text || `Here are the top picks for **${label}**! Tap **Book Now** to reserve.`,
            restaurants,
          }
        }
        return data
      }
    } catch (err) {
      console.warn('[SmartDine] Lex unavailable, using local bot:', err.message)
    }
  }

  // Fallback: smart local bot
  return localBot(userText)
}

export function resetChat() {
  localStep = 0
  localArea = ''
  localCuisine = ''
  sessionId = uuid()
}

export function getRestaurantById(id) {
  return DELHI_NCR_RESTAURANTS.find((r) => r.id === id) || null
}

export { DELHI_NCR_RESTAURANTS as DELHI_RESTAURANTS }
