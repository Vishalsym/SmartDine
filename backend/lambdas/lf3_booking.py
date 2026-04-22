"""
lf3_booking.py
--------------
Triggered by: API Gateway POST /booking
Purpose: Validate and store a table booking in DynamoDB, then invoke lf4 for notifications.
"""

import json
import os
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name=os.environ['AWS_REGION_NAME'])
lambda_client = boto3.client('lambda', region_name=os.environ['AWS_REGION_NAME'])

BOOKINGS_TABLE = os.environ['BOOKINGS_TABLE']
FAVOURITES_TABLE = os.environ['FAVOURITES_TABLE']
NOTIFY_LAMBDA = os.environ['NOTIFY_LAMBDA_NAME']


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


def lambda_handler(event, context):
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})

    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return cors_response(400, {'error': 'Invalid JSON body'})

    # Required fields
    required = ['restaurantId', 'restaurantName', 'date', 'time', 'partySize',
                'customerName', 'customerEmail', 'bookingType']
    missing = [f for f in required if not body.get(f)]
    if missing:
        return cors_response(400, {'error': f'Missing fields: {", ".join(missing)}'})

    booking_id = f'BK-{uuid.uuid4().hex[:10].upper()}'
    now = datetime.utcnow().isoformat()

    booking = {
        'bookingId': booking_id,
        'restaurantId': body['restaurantId'],
        'restaurantName': body['restaurantName'],
        'restaurantEmail': body.get('restaurantEmail', ''),
        'restaurantPhone': body.get('restaurantPhone', ''),
        'restaurantAddress': body.get('address', ''),
        'cuisine': body.get('cuisine', ''),
        'date': body['date'],
        'time': body['time'],
        'partySize': int(body['partySize']),
        'customerName': body['customerName'],
        'customerEmail': body['customerEmail'],
        'customerPhone': body.get('customerPhone', ''),
        'specialRequests': body.get('specialRequests', ''),
        'bookingType': body['bookingType'],  # same-day | pre-book | recurring
        'recurringDay': body.get('recurringDay', ''),
        'status': 'confirmed',
        'createdAt': now,
    }

    # Write to DynamoDB
    table = dynamodb.Table(BOOKINGS_TABLE)
    table.put_item(Item=booking)

    # If marked as favourite, upsert into favourites table
    if body.get('setAsFavourite') or body['bookingType'] == 'recurring':
        fav_table = dynamodb.Table(FAVOURITES_TABLE)
        fav_table.put_item(Item={
            'customerId': body['customerEmail'],          # PK
            'restaurantId': body['restaurantId'],         # SK
            'restaurantName': body['restaurantName'],
            'restaurantEmail': body.get('restaurantEmail', ''),
            'restaurantPhone': body.get('restaurantPhone', ''),
            'cuisine': body.get('cuisine', ''),
            'dayOfWeek': body.get('recurringDay', 'Friday'),
            'preferredTime': body['time'],
            'partySize': int(body['partySize']),
            'customerPhone': body.get('customerPhone', ''),
            'active': True,
            'addedAt': now,
            'lastBooked': now,
        })

    # Async invoke lf4 for notifications (don't wait for it)
    lambda_client.invoke(
        FunctionName=NOTIFY_LAMBDA,
        InvocationType='Event',  # async
        Payload=json.dumps({
            'booking': booking,
            'notifyCustomer': True,
            'notifyRestaurant': True,
        }),
    )

    return cors_response(200, {
        'success': True,
        'bookingId': booking_id,
        'booking': booking,
        'message': 'Booking confirmed. Notifications sent to customer and restaurant.',
    })
