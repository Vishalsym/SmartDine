"""
lf4_notify.py
-------------
Triggered by: lf3 (async invoke) or lf5 (recurring)
Sends booking confirmation to BOTH customer AND restaurant via SES email.
SMS via SNS is attempted but gracefully skipped if DLT registration not done
(required by TRAI for Indian numbers in production).
"""

import json
import os
import urllib.request
import urllib.parse
import boto3
from botocore.exceptions import ClientError
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

ses = boto3.client('ses', region_name=os.environ['AWS_REGION_NAME'])
sns = boto3.client('sns', region_name='us-east-1')

SENDER_EMAIL    = os.environ['SENDER_EMAIL']
FAST2SMS_KEY    = os.environ.get('FAST2SMS_KEY', '')
CONFIG_SET      = 'smartdine-emails'


# ── HTML email builder ────────────────────────────────────────────────────────

def customer_html(b):
    recurring_banner = ''
    if b.get('bookingType') == 'recurring':
        recurring_banner = f'''
        <tr>
          <td style="padding:0 32px 16px;">
            <div style="background:#fff3e0;border-left:4px solid #f97316;border-radius:4px;padding:12px 16px;">
              <p style="margin:0;color:#e65100;font-size:13px;">
                ♻️ <strong>Weekly booking active</strong> — auto-booked every <strong>{b.get('recurringDay','')}</strong>
              </p>
            </div>
          </td>
        </tr>'''

    special = ''
    if b.get('specialRequests'):
        special = f'<tr><td style="color:#757575;font-size:13px;padding:6px 0;width:38%;">Special Requests</td><td style="color:#212121;font-size:13px;padding:6px 0;">{b["specialRequests"]}</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Booking Confirmed – SmartDine</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
 <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

   <!-- Header -->
   <tr>
    <td style="background:linear-gradient(135deg,#f97316,#dc2626);padding:32px;text-align:center;">
     <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Booking Confirmed ✓</h1>
     <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">SmartDine Dining Concierge • New Delhi</p>
    </td>
   </tr>

   <!-- Greeting -->
   <tr>
    <td style="padding:28px 32px 16px;">
     <p style="margin:0;font-size:15px;color:#424242;line-height:1.6;">
       Hi <strong style="color:#212121;">{b['customerName']}</strong>,<br>
       Your table reservation is confirmed. We look forward to seeing you!
     </p>
    </td>
   </tr>

   {recurring_banner}

   <!-- Restaurant + booking details -->
   <tr>
    <td style="padding:0 32px 24px;">
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:10px;border:1px solid #e0e0e0;padding:20px;">
      <tr>
       <td colspan="2" style="padding-bottom:14px;border-bottom:1px solid #eeeeee;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#212121;">{b['restaurantName']}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#757575;">{b.get('cuisine','')}</p>
       </td>
      </tr>
      <tr><td height="12"></td></tr>
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;width:38%;">📅 Date</td>
       <td style="color:#212121;font-size:13px;font-weight:700;padding:6px 0;">{b['date']}</td>
      </tr>
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;">🕐 Time</td>
       <td style="color:#212121;font-size:13px;font-weight:700;padding:6px 0;">{b['time']}</td>
      </tr>
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;">👥 Guests</td>
       <td style="color:#212121;font-size:13px;font-weight:700;padding:6px 0;">{b['partySize']} {'guest' if int(b['partySize'])==1 else 'guests'}</td>
      </tr>
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;">📍 Address</td>
       <td style="color:#212121;font-size:13px;padding:6px 0;">{b.get('restaurantAddress','')}</td>
      </tr>
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;">📞 Restaurant</td>
       <td style="color:#212121;font-size:13px;padding:6px 0;">{b.get('restaurantPhone','')}</td>
      </tr>
      {special}
     </table>
    </td>
   </tr>

   <!-- Booking ID -->
   <tr>
    <td style="padding:0 32px 24px;text-align:center;">
     <div style="background:#fff8f0;border:1.5px dashed #f97316;border-radius:8px;padding:14px;">
      <p style="margin:0;color:#9e9e9e;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Booking Reference</p>
      <p style="margin:6px 0 0;color:#f97316;font-size:20px;font-weight:700;font-family:monospace;">{b['bookingId']}</p>
     </div>
    </td>
   </tr>

   <!-- Footer -->
   <tr>
    <td style="background:#fafafa;padding:20px 32px;border-top:1px solid #eeeeee;">
     <p style="margin:0;font-size:12px;color:#9e9e9e;line-height:1.6;text-align:center;">
       Please arrive 5 minutes early. To cancel or modify, contact the restaurant directly.<br>
       <strong style="color:#f97316;">SmartDine</strong> • Your Dining Concierge for Delhi
     </p>
    </td>
   </tr>

  </table>
 </td></tr>
</table>
</body></html>"""


def restaurant_html(b):
    special = ''
    if b.get('specialRequests'):
        special = f'<tr><td style="color:#757575;font-size:13px;padding:6px 0;width:38%;">📝 Special Requests</td><td style="color:#e65100;font-size:13px;font-weight:600;padding:6px 0;">{b["specialRequests"]}</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>New Booking – SmartDine</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
 <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

   <!-- Header -->
   <tr>
    <td style="background:linear-gradient(135deg,#1565c0,#6a1b9a);padding:32px;text-align:center;">
     <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🔔 New Table Booking</h1>
     <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">via SmartDine Concierge</p>
    </td>
   </tr>

   <tr>
    <td style="padding:28px 32px 8px;">
     <p style="margin:0;font-size:15px;color:#424242;line-height:1.6;">
       A new reservation has been placed at <strong style="color:#212121;">{b['restaurantName']}</strong>.
     </p>
    </td>
   </tr>

   <!-- Customer card -->
   <tr>
    <td style="padding:16px 32px;">
     <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9e9e9e;">Customer</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8f4fd;border-radius:8px;padding:16px;border-left:4px solid #1565c0;">
      <tr>
       <td style="font-size:17px;font-weight:700;color:#212121;">{b['customerName']}</td>
      </tr>
      <tr><td style="font-size:13px;color:#1565c0;padding-top:4px;">{b['customerEmail']}</td></tr>
      <tr><td style="font-size:13px;color:#424242;padding-top:2px;">{b.get('customerPhone','Not provided')}</td></tr>
     </table>
    </td>
   </tr>

   <!-- Booking details -->
   <tr>
    <td style="padding:0 32px 24px;">
     <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9e9e9e;">Reservation Details</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:10px;border:1px solid #e0e0e0;padding:16px;">
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;width:38%;">📅 Date</td>
       <td style="color:#212121;font-size:14px;font-weight:700;padding:6px 0;">{b['date']}</td>
      </tr>
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;">🕐 Time</td>
       <td style="color:#212121;font-size:14px;font-weight:700;padding:6px 0;">{b['time']}</td>
      </tr>
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;">👥 Party Size</td>
       <td style="color:#212121;font-size:14px;font-weight:700;padding:6px 0;">{b['partySize']} {'guest' if int(b['partySize'])==1 else 'guests'}</td>
      </tr>
      <tr>
       <td style="color:#757575;font-size:13px;padding:6px 0;">🔖 Type</td>
       <td style="color:#f97316;font-size:13px;font-weight:700;padding:6px 0;text-transform:capitalize;">{b['bookingType']}{(' — Every ' + b.get('recurringDay','')) if b.get('bookingType')=='recurring' else ''}</td>
      </tr>
      {special}
     </table>
    </td>
   </tr>

   <!-- Ref -->
   <tr>
    <td style="padding:0 32px 24px;text-align:center;">
     <div style="background:#f3e5f5;border:1.5px dashed #6a1b9a;border-radius:8px;padding:14px;">
      <p style="margin:0;color:#9e9e9e;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Booking Reference</p>
      <p style="margin:6px 0 0;color:#6a1b9a;font-size:20px;font-weight:700;font-family:monospace;">{b['bookingId']}</p>
     </div>
    </td>
   </tr>

   <tr>
    <td style="background:#fafafa;padding:20px 32px;border-top:1px solid #eeeeee;">
     <p style="margin:0;font-size:12px;color:#9e9e9e;text-align:center;line-height:1.6;">
       This booking was placed through <strong style="color:#f97316;">SmartDine</strong> dining concierge.<br>
       Please confirm the table directly with the customer if needed.
     </p>
    </td>
   </tr>

  </table>
 </td></tr>
</table>
</body></html>"""


# ── Send helpers ──────────────────────────────────────────────────────────────

def send_email(to_address, subject, html_body, text_body):
    """Send via SES using raw MIME so we set all headers correctly."""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = f'SmartDine <{SENDER_EMAIL}>'
    msg['To']      = to_address
    msg['Reply-To'] = SENDER_EMAIL
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html',  'utf-8'))

    try:
        ses.send_raw_email(
            Source=f'SmartDine <{SENDER_EMAIL}>',
            Destinations=[to_address],
            RawMessage={'Data': msg.as_string()},
        )
        print(f'[lf4] ✅ Email sent to {to_address}')
        return True
    except ClientError as e:
        print(f'[lf4] ❌ SES error to {to_address}: {e.response["Error"]["Message"]}')
        return False


def normalize_phone(phone):
    """
    Returns (e164, country) where e164 is the full E.164 number and
    country is 'us' (+1) or 'in' (+91). Returns (None, None) if invalid.
    """
    if not phone or not str(phone).strip():
        return None, None

    raw = str(phone).strip()
    digits = ''.join(c for c in raw if c.isdigit())

    # US number: +1XXXXXXXXXX or 1XXXXXXXXXX (11 digits) or 10 digits starting with a US area code
    if raw.startswith('+1') and len(digits) == 11:
        return f'+{digits}', 'us'
    if raw.startswith('1') and len(digits) == 11:
        return f'+{digits}', 'us'

    # Indian number: +91XXXXXXXXXX or 91XXXXXXXXXX or 10 digits
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith('0') and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10:
        return f'+91{digits}', 'in'

    return None, None


def send_sms(phone, message):
    """Route SMS: US (+1) → AWS SNS, India (+91) → Fast2SMS."""
    e164, country = normalize_phone(phone)
    if not e164:
        print('[lf4] ⚠️  No valid phone number — skipping SMS')
        return

    if country == 'us':
        # AWS SNS — works for US numbers without any DLT registration
        try:
            sns.publish(
                PhoneNumber=e164,
                Message=message,
                MessageAttributes={
                    'AWS.SNS.SMS.SMSType': {
                        'DataType': 'String',
                        'StringValue': 'Transactional',
                    },
                    'AWS.SNS.SMS.SenderID': {
                        'DataType': 'String',
                        'StringValue': 'SmartDine',
                    },
                },
            )
            print(f'[lf4] ✅ SMS sent to {e164} via AWS SNS')
        except Exception as e:
            print(f'[lf4] ⚠️  SNS SMS failed: {e}')

    else:
        # Fast2SMS for Indian numbers
        if not FAST2SMS_KEY:
            print('[lf4] ⚠️  FAST2SMS_KEY not set — skipping SMS')
            return
        number = e164.replace('+91', '')
        params = urllib.parse.urlencode({
            'authorization': FAST2SMS_KEY,
            'route': 'q',
            'message': message,
            'language': 'english',
            'flash': '0',
            'numbers': number,
        })
        url = f'https://www.fast2sms.com/dev/bulkV2?{params}'
        try:
            req = urllib.request.Request(url, headers={'cache-control': 'no-cache'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = json.loads(resp.read().decode())
                if body.get('return'):
                    print(f'[lf4] ✅ SMS sent to {number} via Fast2SMS')
                else:
                    print(f'[lf4] ⚠️  Fast2SMS response: {body}')
        except Exception as e:
            print(f'[lf4] ⚠️  SMS failed: {e}')


# ── Plain text fallback ───────────────────────────────────────────────────────

def customer_text(b):
    return (
        f"SmartDine – Booking Confirmed\n\n"
        f"Hi {b['customerName']},\n\n"
        f"Your table at {b['restaurantName']} is confirmed.\n\n"
        f"Date: {b['date']}\n"
        f"Time: {b['time']}\n"
        f"Guests: {b['partySize']}\n"
        f"Address: {b.get('restaurantAddress','')}\n\n"
        f"Booking Ref: {b['bookingId']}\n\n"
        f"See you soon!\n– SmartDine"
    )

def restaurant_text(b):
    return (
        f"SmartDine – New Booking Alert\n\n"
        f"Restaurant: {b['restaurantName']}\n"
        f"Customer: {b['customerName']}\n"
        f"Email: {b['customerEmail']}\n"
        f"Phone: {b.get('customerPhone','N/A')}\n\n"
        f"Date: {b['date']}\n"
        f"Time: {b['time']}\n"
        f"Guests: {b['partySize']}\n"
        f"Type: {b['bookingType']}\n\n"
        f"Ref: {b['bookingId']}"
    )


# ── Main handler ──────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    booking = event.get('booking', {})
    notify_customer    = event.get('notifyCustomer', True)
    notify_restaurant  = event.get('notifyRestaurant', True)

    if not booking.get('bookingId'):
        print('[lf4] ❌ No booking data')
        return {'success': False, 'error': 'No booking data'}

    results = {}

    if notify_customer and booking.get('customerEmail'):
        subject = f"✅ Booking Confirmed — {booking['restaurantName']}, {booking['date']}"
        ok = send_email(
            booking['customerEmail'],
            subject,
            customer_html(booking),
            customer_text(booking),
        )
        results['customer_email'] = ok
        send_sms(
            booking.get('customerPhone', ''),
            f"SmartDine: Table confirmed at {booking['restaurantName']} on {booking['date']} at {booking['time']}. Ref: {booking['bookingId']}"
        )

    if notify_restaurant and booking.get('restaurantEmail'):
        subject = f"🔔 New Booking — {booking['customerName']}, {booking['date']} {booking['time']}"
        ok = send_email(
            booking['restaurantEmail'],
            subject,
            restaurant_html(booking),
            restaurant_text(booking),
        )
        results['restaurant_email'] = ok
        send_sms(
            booking.get('restaurantPhone', ''),
            f"SmartDine NEW BOOKING: {booking['customerName']} ({booking['partySize']} guests) on {booking['date']} at {booking['time']}. Ref: {booking['bookingId']}"
        )

    return {'success': True, 'bookingId': booking['bookingId'], 'results': results}
