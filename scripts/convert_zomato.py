import csv, json

CUISINE_IMAGES = {
    'north indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    'mughlai': 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600&q=80',
    'chinese': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
    'italian': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    'south indian': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600&q=80',
    'continental': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
    'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80',
    'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    'cafe': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80',
    'desserts': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80',
    'street food': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80',
    'fast food': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    'seafood': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80',
    'awadhi': 'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=600&q=80',
    'punjabi': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80',
    'modern indian': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80',
    'japanese': 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
    'thai': 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80',
    'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
    'bar': 'https://images.unsplash.com/photo-1574096079513-d8259312b785?w=600&q=80',
    'default': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
}

def get_image(cuisine):
    c = cuisine.lower()
    for key, url in CUISINE_IMAGES.items():
        if key in c:
            return url
    return CUISINE_IMAGES['default']

def price_range(pricing):
    try:
        p = int(float(pricing))
        if p < 500: return '$'
        if p < 1000: return '$$'
        if p < 2000: return '$$$'
        return '$$$$'
    except:
        return '$$'

def clean_phone(ph):
    if not ph or str(ph).strip() in ('', 'nan'):
        return ''
    try:
        num = int(float(ph))
        s = str(num)
        if len(s) == 10:
            return '+91 ' + s
        if len(s) == 11 and s.startswith('0'):
            return '+91 ' + s[1:]
        if len(s) == 12 and s.startswith('91'):
            return '+' + s
        return s
    except:
        return str(ph).strip()

def clean_area(loc):
    loc = loc.strip()
    parts = [p.strip() for p in loc.split(',')]
    if len(parts) >= 2:
        return parts[-2].strip()
    return parts[0].strip()

def primary_cuisine(category):
    if not category or str(category).strip() in ('', 'nan'):
        return 'Multi-cuisine'
    parts = [c.strip() for c in str(category).split(',')]
    return parts[0] if parts else 'Multi-cuisine'

def get_tags(row):
    tags = []
    for field in ['Known_For2', 'Known_For22']:
        val = str(row.get(field, '')).strip()
        if val and val.lower() not in ('nan', '', 'none'):
            tags.append(val)
    return tags[:3]

with open('G:/Smartdine/data/DelhiNCR Restaurants.csv', encoding='utf-8', errors='ignore') as f:
    rows = list(csv.DictReader(f))

filtered = [r for r in rows
            if r['Dining_Rating'] and r['Dining_Rating'] not in ('NEW', '-', '')
            and float(r['Dining_Rating']) >= 4.0
            and r['Restaurant_Name'].strip()
            and r['Locality'].strip()]

restaurants = []
for i, r in enumerate(filtered):
    cuisine = primary_cuisine(r['Category'])
    area = clean_area(r['Locality'])
    tags = get_tags(r)
    try:
        rating = float(r['Dining_Rating'])
        review_count = int(float(r['Dining_Review_Count'])) if r['Dining_Review_Count'] else 0
    except:
        rating = 4.0
        review_count = 0

    restaurants.append({
        'id': 'z-' + str(i + 1).zfill(4),
        'name': r['Restaurant_Name'].strip(),
        'cuisine': cuisine,
        'rating': rating,
        'reviewCount': review_count,
        'priceRange': price_range(r['Pricing_for_2']),
        'address': r['Address'].strip(),
        'phone': clean_phone(r['Phone_No']),
        'email': '',
        'image': get_image(cuisine),
        'openNow': True,
        'distance': '',
        'area': area,
        'tags': tags,
        'locality': r['Locality'].strip(),
    })

print(f'Total: {len(restaurants)} restaurants')

ALIASES = {
    'cp': ['Connaught Place', 'Barakhamba Road', 'Connaught Lane'],
    'connaught': ['Connaught Place', 'Barakhamba Road'],
    'gk': ['Greater Kailash', 'Greater Kailash 1', 'Greater Kailash 2'],
    'gk1': ['Greater Kailash 1'],
    'gk2': ['Greater Kailash 2'],
    'cyber hub': ['Cyber Hub', 'DLF Cyber City'],
    'cyberhub': ['Cyber Hub', 'DLF Cyber City'],
    'cyber city': ['Cyber Hub', 'DLF Cyber City'],
    'gurgaon': ['Gurgaon'],
    'gurugram': ['Gurgaon'],
    'hauz khas': ['Hauz Khas'],
    'hkv': ['Hauz Khas'],
    'khan market': ['Khan Market'],
    'old delhi': ['Chandni Chowk', 'Daryaganj', 'ITO', 'Asaf Ali Road'],
    'chandni chowk': ['Chandni Chowk'],
    'lajpat': ['Lajpat Nagar', 'Lajpat Nagar 1', 'Lajpat Nagar 2', 'Lajpat Nagar 3'],
    'south delhi': ['Hauz Khas', 'Greater Kailash', 'Saket', 'Vasant Vihar', 'Lajpat Nagar', 'Anand Lok', 'Panchsheel Park'],
    'north delhi': ['Pitampura', 'Rohini', 'Ashok Vihar'],
    'noida': ['Noida', 'Sector 18', 'Sector 62', 'Sector 135'],
    'saket': ['Saket', 'Malviya Nagar'],
    'vasant vihar': ['Vasant Vihar', 'Vasant Kunj'],
    'aerocity': ['Aerocity'],
    'dwarka': ['Dwarka'],
    'rohini': ['Rohini'],
    'pitampura': ['Pitampura'],
    'rajouri': ['Rajouri Garden'],
    'karol bagh': ['Karol Bagh'],
    'paharganj': ['Paharganj'],
    'defence colony': ['Defence Colony'],
    'greater noida': ['Greater Noida'],
    'faridabad': ['Faridabad'],
    'indirapuram': ['Indirapuram'],
    'sector 29': ['Sector 29'],
}

js_content = (
    '/**\n'
    ' * Delhi & NCR restaurant dataset — Zomato listings (Kaggle).\n'
    ' * ' + str(len(restaurants)) + ' restaurants across all major areas.\n'
    ' */\n\n'
    'export const DELHI_NCR_RESTAURANTS = ' +
    json.dumps(restaurants, ensure_ascii=False, indent=2) +
    '\n\nexport const AREA_KEYWORDS = ' +
    json.dumps(ALIASES, ensure_ascii=False, indent=2) +
    '\n'
)

with open('G:/Smartdine/smartdine-app/src/data/restaurantData.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print('Done. Written to restaurantData.js')
print('Sample:', restaurants[0]['name'], '|', restaurants[0]['phone'], '|', restaurants[0]['tags'])
