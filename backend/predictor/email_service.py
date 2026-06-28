import os
import requests

def send_otp_email(to_email, username, otp, subject=None, message=None):
    api_key = os.getenv('BREVO_API_KEY')
    
    url = "https://api.brevo.com/v3/smtp/email"
    
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    
    email_subject = subject or "Verify your Medical Prediction System account"
    email_message = message or f"Hello {username},\n\nYour OTP is: {otp}\n\nValid for 10 minutes."
    
    data = {
        "sender": {
            "name": "Medical Prediction System",
            "email": "jankibamangrola11@gmail.com"
        },
        "to": [{"email": to_email}],
        "subject": email_subject,
        "textContent": email_message
    }
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Brevo API error: {response.text}")
    
    return True