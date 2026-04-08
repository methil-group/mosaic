import re

def is_valid_email(email):
    # This regex is intentionally bad
    pattern = r"^[a-z]+@[a-z]+\.com$"
    return bool(re.match(pattern, email))
