"""
lf0_chat.py
-----------
API Gateway POST /chat → Lex V2 runtime (us-east-1) → structured response.

When SearchRestaurants is fulfilled, returns:
  { "type": "search", "text": "...", "area": "...", "cuisine": "..." }
The frontend filters the local Zomato dataset using area/cuisine.

For other responses:
  { "type": "text", "text": "..." }
"""

import json
import os
import boto3

LEX_BOT_ID    = os.environ['LEX_BOT_ID']
LEX_BOT_ALIAS = os.environ['LEX_BOT_ALIAS_ID']
LEX_LOCALE    = 'en_US'

lex = boto3.client('lexv2-runtime', region_name='us-east-1')


def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Content-Type': 'application/json',
        },
        'body': json.dumps(body),
    }


def extract_slot(slots, name):
    """Safely extract a slot value from Lex V2 slots dict."""
    slot = slots.get(name)
    if not slot:
        return ''
    val = slot.get('value', {})
    # Prefer interpretedValue (resolved), fall back to originalValue
    return val.get('interpretedValue') or val.get('originalValue') or ''


def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})

    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return cors_response(400, {'error': 'Invalid JSON'})

    message    = body.get('message', '').strip()
    session_id = body.get('sessionId', 'default-session')

    if not message:
        return cors_response(400, {'error': 'message is required'})

    try:
        lex_resp = lex.recognize_text(
            botId=LEX_BOT_ID,
            botAliasId=LEX_BOT_ALIAS,
            localeId=LEX_LOCALE,
            sessionId=session_id,
            text=message,
        )
    except Exception as e:
        print(f'[lf0] Lex error: {e}')
        return cors_response(500, {'error': 'Lex unavailable', 'detail': str(e)})

    # Reply text from Lex
    messages   = lex_resp.get('messages', [])
    reply_text = ' '.join(m.get('content', '') for m in messages) or "I didn't catch that — which area are you looking in?"

    # Session state
    session_state = lex_resp.get('sessionState', {})
    intent_state  = session_state.get('intent', {})
    intent_name   = intent_state.get('name', '')
    intent_status = intent_state.get('state', '')   # Fulfilled | ReadyForFulfillment | InProgress | Failed
    slots         = intent_state.get('slots') or {}

    print(f'[lf0] Intent={intent_name} State={intent_status} Slots={slots}')

    # When SearchRestaurants is ready/fulfilled — pass slots to frontend
    if intent_name == 'SearchRestaurants' and intent_status in ('Fulfilled', 'ReadyForFulfillment'):
        area    = extract_slot(slots, 'Area')
        cuisine = extract_slot(slots, 'Cuisine')
        return cors_response(200, {
            'type': 'search',
            'text': reply_text,
            'area': area,
            'cuisine': cuisine,
        })

    return cors_response(200, {
        'type': 'text',
        'text': reply_text,
    })
