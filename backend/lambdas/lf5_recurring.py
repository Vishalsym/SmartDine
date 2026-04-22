"""
lf5_recurring.py
----------------
Triggered by: EventBridge rule — every Monday at 8:00 AM IST (2:30 AM UTC)
Purpose: Read all active favourites, auto-create this week's bookings, notify both parties.
"""

import json
import os
import uuid
import boto3
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name=os.environ['AWS_REGION_NAME'])
lambda_client = boto3.client('lambda', region_name=os.environ['AWS_REGION_NAME'])

FAVOURITES_TABLE = os.environ['FAVOURITES_TABLE']
BOOKINGS_TABLE = os.environ['BOOKINGS_TABLE']
NOTIFY_LAMBDA = os.environ['NOTIFY_LAMBDA_NAME']

DAY_OFFSETS = {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
    'Friday': 4, 'Saturday': 5, 'Sunday': 6,
}


def get_next_date_for_day(day_name: str) -> str:
    """Return the date string (YYYY-MM-DD) of the upcoming given weekday."""
    today = datetime.utcnow().date()
    today_weekday = today.weekday()  # Monday=0
    target_weekday = DAY_OFFSETS.get(day_name, 4)  # default Friday
    days_ahead = (target_weekday - today_weekday) % 7
    if days_ahead == 0:
        days_ahead = 7  # book for next week, not today
    return str(today + timedelta(days=days_ahead))


def lambda_handler(event, context):
    fav_table = dynamodb.Table(FAVOURITES_TABLE)
    booking_table = dynamodb.Table(BOOKINGS_TABLE)
    now = datetime.utcnow().isoformat()

    # Scan all active favourites
    try:
        response = fav_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('active').eq(True)
        )
    except ClientError as e:
        print(f'[lf5] DynamoDB scan error: {e}')
        return {'success': False, 'error': str(e)}

    favourites = response.get('Items', [])
    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = fav_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('active').eq(True),
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        favourites.extend(response.get('Items', []))

    print(f'[lf5] Processing {len(favourites)} active favourites')

    created = []
    for fav in favourites:
        booking_date = get_next_date_for_day(fav.get('dayOfWeek', 'Friday'))
        booking_id = f'BK-{uuid.uuid4().hex[:10].upper()}'

        booking = {
            'bookingId': booking_id,
            'restaurantId': fav['restaurantId'],
            'restaurantName': fav['restaurantName'],
            'restaurantEmail': fav.get('restaurantEmail', ''),
            'restaurantPhone': fav.get('restaurantPhone', ''),
            'date': booking_date,
            'time': fav.get('preferredTime', '7:00 PM'),
            'partySize': int(fav.get('partySize', 2)),
            'customerName': fav.get('customerId', '').split('@')[0].title(),
            'customerEmail': fav['customerId'],
            'customerPhone': fav.get('customerPhone', ''),
            'specialRequests': '',
            'bookingType': 'recurring',
            'recurringDay': fav.get('dayOfWeek', 'Friday'),
            'restaurantAddress': fav.get('address', ''),
            'cuisine': fav.get('cuisine', ''),
            'status': 'confirmed',
            'createdAt': now,
            'autoCreated': True,
        }

        # Write booking
        try:
            booking_table.put_item(Item=booking)
        except ClientError as e:
            print(f'[lf5] Failed to write booking for {fav["customerId"]}: {e}')
            continue

        # Update lastBooked on the favourite
        try:
            fav_table.update_item(
                Key={'customerId': fav['customerId'], 'restaurantId': fav['restaurantId']},
                UpdateExpression='SET lastBooked = :now',
                ExpressionAttributeValues={':now': now},
            )
        except ClientError as e:
            print(f'[lf5] Failed to update lastBooked: {e}')

        # Trigger lf4 notification (async)
        lambda_client.invoke(
            FunctionName=NOTIFY_LAMBDA,
            InvocationType='Event',
            Payload=json.dumps({
                'booking': booking,
                'notifyCustomer': True,
                'notifyRestaurant': True,
            }),
        )

        created.append(booking_id)
        print(f'[lf5] Created recurring booking {booking_id} for {fav["customerId"]} at {fav["restaurantName"]}')

    return {
        'success': True,
        'processed': len(favourites),
        'bookingsCreated': len(created),
        'bookingIds': created,
    }
