import unittest
from validator import is_valid_email

class TestValidator(unittest.TestCase):
    def test_basic_emails(self):
        self.assertTrue(is_valid_email("test@example.com"))
        self.assertTrue(is_valid_email("user.name@domain.org"))
        self.assertTrue(is_valid_email("user+tag@sub.domain.io"))
    
    def test_invalid_emails(self):
        self.assertFalse(is_valid_email("plainaddress"))
        self.assertFalse(is_valid_email("@no-user.com"))
        self.assertFalse(is_valid_email("user@no-tld"))
        self.assertFalse(is_valid_email("user@domain..com"))

if __name__ == "__main__":
    unittest.main()
