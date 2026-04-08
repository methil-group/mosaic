import unittest
from calc import divide

class TestCalc(unittest.TestCase):
    def test_divide(self):
        self.assertEqual(divide(10, 2), 5)
        self.assertEqual(divide(10, 5), 2)
    
    def test_divide_by_zero(self):
        # The agent should handle this case, e.g. return None or Raise an error handled gracefully
        # For this test, let's say it should return None
        self.assertIsNone(divide(10, 0))

if __name__ == "__main__":
    unittest.main()
