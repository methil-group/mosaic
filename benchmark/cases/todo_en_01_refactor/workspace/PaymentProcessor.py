import sqlite3
import json
import smtplib
from email.mime.text import MIMEText
import requests

class PaymentProcessor:
    def __init__(self, db_path, smtp_server, stripe_api_key):
        self.db_path = db_path
        self.smtp_server = smtp_server
        self.stripe_api_key = stripe_api_key

    def process_transaction(self, user_id, amount, currency, card_details):
        # 1. Database connection logic
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 2. Check user balance / history
        cursor.execute("SELECT balance FROM users WHERE id=?", (user_id,))
        balance = cursor.fetchone()[0]
        
        if balance < amount:
            conn.close()
            return {"status": "error", "message": "Insufficient funds"}

        # 3. Credit Card Validation (complex logic here)
        if not self.validate_card(card_details):
            conn.close()
            return {"status": "error", "message": "Invalid card"}

        # 4. Stripe API call
        try:
            response = requests.post(
                "https://api.stripe.com/v1/charges",
                headers={"Authorization": f"Bearer {self.stripe_api_key}"},
                data={"amount": amount, "currency": currency, "source": card_details['token']}
            )
            if response.status_code != 200:
                conn.close()
                return {"status": "error", "message": "Stripe payment failed"}
        except Exception as e:
            conn.close()
            return {"status": "error", "message": str(e)}

        # 5. Update Database entries
        cursor.execute("UPDATE users SET balance = balance - ? WHERE id=?", (amount, user_id))
        cursor.execute("INSERT INTO transactions (user_id, amount, date) VALUES (?, ?, '2024-01-01')", (user_id, amount))
        conn.commit()
        conn.close()

        # 6. Generate Receipt & Send Email
        receipt_text = f"Receipt for user {user_id}: {amount} {currency} paid."
        msg = MIMEText(receipt_text)
        msg['Subject'] = 'Payment Confirmation'
        msg['To'] = 'user@example.com'
        msg['From'] = 'billing@company.com'

        s = smtplib.SMTP(self.smtp_server)
        s.send_message(msg)
        s.quit()

        return {"status": "success", "transaction_id": "TRANS-123"}

    def validate_card(self, details):
        # Giant messy logic for Luhn algorithm, expiry checks, etc.
        # ... 100 lines of mess ...
        return True

    def generate_detailed_report(self, start_date, end_date):
        # Yet another responsibility: Analytics
        conn = sqlite3.connect(self.db_path)
        # ... logic to fetch and sum transactions ...
        conn.close()
        return "Report CSV data..."
