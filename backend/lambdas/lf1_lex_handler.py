"""
lf1_lex_handler.py  (deploy in us-east-1 — same region as Lex bot)
------------------------------------------------------------------
Lex v2 code hook: handles both DialogCodeHook and FulfillmentCodeHook
for DiningSuggestionsIntent.

Slot collection order:
  1. Location   (Delhi area: CP, Hauz Khas, Khan Market, Old Delhi …)
  2. Cuisine    (Indian, Mughlai, North Indian, Chinese, etc.)
  3. DiningDate (today / tomorrow / YYYY-MM-DD)
  4. DiningTime (7:00 PM, 8:30 PM …)
  5. NumberOfPeople
  6. Email

On fulfillment: returns top matching Delhi restaurants as JSON in
the session state so lf0 can pass them straight to the frontend.
"""

import json
import re
from datetime import date, timedelta

# ── Delhi restaurant catalogue ────────────────────────────────────────────────
RESTAURANTS = [
    {"id":"rest-001","name":"Bukhara","cuisine":"North Indian","rating":4.8,"reviewCount":2841,"priceRange":"$$$$","address":"ITC Maurya, Sardar Patel Marg, Diplomatic Enclave, New Delhi 110021","phone":"+91 11 2611 2233","email":"bukhara@itchotels.in","image":"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80","openNow":True,"distance":"3.2 km","area":"Diplomatic Enclave","tags":["Dal Bukhara","Tandoor","Fine Dining"]},
    {"id":"rest-002","name":"Indian Accent","cuisine":"Modern Indian","rating":4.9,"reviewCount":1923,"priceRange":"$$$$","address":"The Lodhi, Lodhi Road, New Delhi 110003","phone":"+91 11 4323 5151","email":"reservations@indianaccent.com","image":"https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80","openNow":True,"distance":"5.1 km","area":"Lodhi Road","tags":["Tasting Menu","Cocktail Bar","Award Winning"]},
    {"id":"rest-003","name":"Moti Mahal Delux","cuisine":"Mughlai","rating":4.5,"reviewCount":3102,"priceRange":"$$","address":"3703, Netaji Subhash Marg, Daryaganj, New Delhi 110002","phone":"+91 11 2327 3011","email":"info@motimahaldelux.com","image":"https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600&q=80","openNow":True,"distance":"7.4 km","area":"Daryaganj","tags":["Butter Chicken Origin","Dal Makhani","Since 1947"]},
    {"id":"rest-004","name":"Dum Pukht","cuisine":"Awadhi","rating":4.7,"reviewCount":1456,"priceRange":"$$$$","address":"ITC Maurya, Sardar Patel Marg, New Delhi 110021","phone":"+91 11 2611 2233","email":"dumpukht@itchotels.in","image":"https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=600&q=80","openNow":False,"distance":"3.2 km","area":"Diplomatic Enclave","tags":["Dum Cooking","Biryani","Royal Cuisine"]},
    {"id":"rest-005","name":"Karim's","cuisine":"Mughlai","rating":4.6,"reviewCount":5234,"priceRange":"$","address":"16, Gali Kababian, Jama Masjid, Old Delhi 110006","phone":"+91 11 2326 9880","email":"karims@olddelhi.com","image":"https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80","openNow":True,"distance":"8.9 km","area":"Old Delhi","tags":["Mutton Korma","Seekh Kebab","Since 1913"]},
    {"id":"rest-006","name":"Punjabi By Nature","cuisine":"Punjabi","rating":4.4,"reviewCount":2187,"priceRange":"$$$","address":"11, Basant Lok, Vasant Vihar, New Delhi 110057","phone":"+91 11 4600 6666","email":"book@punjabibynature.com","image":"https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80","openNow":True,"distance":"6.8 km","area":"Vasant Vihar","tags":["Sarson da Saag","Patiala Peg","Live Music"]},
    {"id":"rest-007","name":"SodaBottleOpenerWala","cuisine":"Parsi","rating":4.3,"reviewCount":1876,"priceRange":"$$","address":"Khan Market, New Delhi 110003","phone":"+91 98 1839 9008","email":"hello@sodabottleopenerwala.in","image":"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80","openNow":True,"distance":"4.5 km","area":"Khan Market","tags":["Bun Maska","Dhansak","Retro Vibe"]},
    {"id":"rest-008","name":"Farzi Cafe","cuisine":"Modern Indian","rating":4.5,"reviewCount":3421,"priceRange":"$$$","address":"Cyber Hub, DLF Cyber City, Gurugram 122002","phone":"+91 124 489 4949","email":"delhi@farzicafe.com","image":"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80","openNow":True,"distance":"12.3 km","area":"Cyber Hub","tags":["Molecular Gastronomy","Craft Cocktails","Trendy"]},
    {"id":"rest-009","name":"The Great Kabab Factory","cuisine":"Kebab","rating":4.6,"reviewCount":2654,"priceRange":"$$$","address":"Radisson Blu, National Highway 8, Mahipalpur, New Delhi 110037","phone":"+91 11 2677 9191","email":"gkf@radisson.com","image":"https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80","openNow":True,"distance":"9.1 km","area":"Mahipalpur","tags":["101 Kabab Varieties","Live Counter","Unlimited"]},
    {"id":"rest-010","name":"Lodi - The Garden Restaurant","cuisine":"North Indian","rating":4.7,"reviewCount":1543,"priceRange":"$$$","address":"Lodi Road, Near Lodi Garden, New Delhi 110003","phone":"+91 11 2436 3935","email":"book@lodigarden.com","image":"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80","openNow":True,"distance":"4.8 km","area":"Lodi Colony","tags":["Outdoor Seating","Al Fresco","Garden View"]},
]

VALID_LOCATIONS = [
    'delhi', 'new delhi', 'connaught place', 'cp', 'hauz khas', 'khan market',
    'old delhi', 'south delhi', 'north delhi', 'vasant vihar', 'lajpat nagar',
    'saket', 'cyber hub', 'gurugram', 'gurgaon', 'noida', 'lodi', 'daryaganj',
    'diplomatic enclave', 'mahipalpur',
]

VALID_CUISINES = [
    'indian', 'north indian', 'south indian', 'mughlai', 'awadhi', 'punjabi',
    'chinese', 'continental', 'italian', 'thai', 'japanese', 'mexican',
    'parsi', 'kebab', 'modern indian', 'street food',
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_slot(slots, name):
    s = slots.get(name)
    if not s:
        return None
    val = s.get('value', {})
    return val.get('interpretedValue') or val.get('originalValue')


def elicit_slot(session_state, intent, slot_name, message):
    return {
        'sessionState': {
            **session_state,
            'dialogAction': {'type': 'ElicitSlot', 'slotToElicit': slot_name},
            'intent': intent,
        },
        'messages': [{'contentType': 'PlainText', 'content': message}],
    }


def delegate(session_state, intent):
    return {
        'sessionState': {
            **session_state,
            'dialogAction': {'type': 'Delegate'},
            'intent': intent,
        },
    }


def close(session_state, intent, message, restaurants=None):
    ctx = session_state.get('sessionAttributes', {})
    if restaurants is not None:
        ctx['restaurantResults'] = json.dumps(restaurants)
    return {
        'sessionState': {
            **session_state,
            'sessionAttributes': ctx,
            'dialogAction': {'type': 'Close'},
            'intent': {**intent, 'state': 'Fulfilled'},
        },
        'messages': [{'contentType': 'PlainText', 'content': message}],
    }


def resolve_date(raw):
    if not raw:
        return None
    raw_l = raw.lower().strip()
    if raw_l in ('today', 'aaj'):
        return str(date.today())
    if raw_l in ('tomorrow', 'kal'):
        return str(date.today() + timedelta(days=1))
    # Accept ISO format or dd/mm patterns
    m = re.match(r'(\d{4}-\d{2}-\d{2})', raw)
    if m:
        return m.group(1)
    return raw  # pass through as-is


# ── Validation ────────────────────────────────────────────────────────────────

def validate(slots):
    location = get_slot(slots, 'Location')
    cuisine  = get_slot(slots, 'Cuisine')
    dining_date = get_slot(slots, 'DiningDate')
    dining_time = get_slot(slots, 'DiningTime')
    num_people  = get_slot(slots, 'NumberOfPeople')
    email       = get_slot(slots, 'Email')

    if location:
        if not any(v in location.lower() for v in VALID_LOCATIONS):
            return 'Location', f'Sorry, we currently cover Delhi NCR. Which area in Delhi — Connaught Place, Hauz Khas, Khan Market, Old Delhi, or others?'

    if cuisine:
        if not any(c in cuisine.lower() for c in VALID_CUISINES):
            return 'Cuisine', f'We have North Indian, Mughlai, Awadhi, Punjabi, Modern Indian, Kebab, Chinese and more. Which cuisine?'

    if dining_date:
        resolved = resolve_date(dining_date)
        if not resolved:
            return 'DiningDate', 'Please tell me the date — today, tomorrow, or a specific date like April 15.'

    if num_people:
        try:
            n = int(num_people)
            if n < 1 or n > 20:
                return 'NumberOfPeople', 'Party size should be between 1 and 20. How many guests?'
        except ValueError:
            return 'NumberOfPeople', 'How many people will be dining? (e.g. 2, 4)'

    if email:
        if '@' not in email or '.' not in email:
            return 'Email', 'That email doesn\'t look right. Please share a valid email address.'

    return None, None


# ── Restaurant search ─────────────────────────────────────────────────────────

def search_restaurants(cuisine, location):
    results = RESTAURANTS[:]

    if cuisine:
        cl = cuisine.lower()
        filtered = [r for r in results if cl in r['cuisine'].lower()]
        if filtered:
            results = filtered

    if location:
        ll = location.lower()
        filtered = [r for r in results if ll in r['area'].lower() or ll in r['address'].lower()]
        if filtered:
            results = filtered

    # Sort by rating
    results.sort(key=lambda r: r['rating'], reverse=True)
    return results[:6]


# ── Main handler ──────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    print(json.dumps(event))

    invocation_source = event.get('invocationSource')
    intent            = event.get('sessionState', {}).get('intent', {})
    slots             = intent.get('slots', {})
    session_state     = event.get('sessionState', {})

    intent_name = intent.get('name', '')

    # ── GreetingIntent ────────────────────────────────────────────────────────
    if intent_name == 'GreetingIntent':
        return close(session_state, intent,
            'Namaste! I\'m SmartDine, your Delhi dining concierge. '
            'What cuisine are you craving, and which area of Delhi?')

    # ── ThankYouIntent ────────────────────────────────────────────────────────
    if intent_name == 'ThankYouIntent':
        return close(session_state, intent, 'You\'re welcome! Enjoy your meal. 🍽️')

    # ── DiningSuggestionsIntent ───────────────────────────────────────────────
    if intent_name != 'DiningSuggestionsIntent':
        return close(session_state, intent,
            'I can help you find great Delhi restaurants. '
            'Tell me a cuisine and area to get started!')

    # Dialog code hook — validate on every turn
    if invocation_source == 'DialogCodeHook':
        slot_name, msg = validate(slots)
        if slot_name:
            return elicit_slot(session_state, intent, slot_name, msg)
        return delegate(session_state, intent)

    # Fulfillment code hook — all slots collected
    if invocation_source == 'FulfillmentCodeHook':
        cuisine     = get_slot(slots, 'Cuisine') or ''
        location    = get_slot(slots, 'Location') or 'Delhi'
        dining_date = resolve_date(get_slot(slots, 'DiningDate') or 'today')
        dining_time = get_slot(slots, 'DiningTime') or '7:00 PM'
        num_people  = get_slot(slots, 'NumberOfPeople') or '2'

        restaurants = search_restaurants(cuisine, location)

        msg = (
            f"Here are the top restaurants in {location}"
            + (f" for {cuisine} cuisine" if cuisine else "")
            + f" on {dining_date} at {dining_time} for {num_people} guests. "
            "Tap **Book Now** to reserve your table!"
        )

        return close(session_state, intent, msg, restaurants)

    return close(session_state, intent, 'Something went wrong. Please try again.')
