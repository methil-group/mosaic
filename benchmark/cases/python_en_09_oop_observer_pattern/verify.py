import os
import sys
from io import StringIO

def verify(workspace):
    news_file = os.path.join(workspace, "news.py")
    if not os.path.exists(news_file):
        return False
        
    try:
        sys.path.append(workspace)
        import news
        
        agency = news.NewsAgency()
        
        # Capture stdout to check for notifications
        old_stdout = sys.stdout
        sys.stdout = mystdout = StringIO()
        
        email = news.EmailNotifier()
        sms = news.SmsNotifier()
        
        agency.attach(email)
        agency.attach(sms)
        agency.notify("TEST")
        
        sys.stdout = old_stdout
        output = mystdout.getvalue()
        
        # Check if both types of notifications were printed
        has_email = "Email" in output
        has_sms = "Sms" in output or "SMS" in output
        
        if has_email and has_sms:
            print("Successfully verified Observer pattern")
            return True
        else:
            print(f"Failure: Missing notifications in output: {output}")
            return False
    except Exception as e:
        sys.stdout = old_stdout
        print(f"Error during verification: {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
