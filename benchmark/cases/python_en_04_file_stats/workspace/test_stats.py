import unittest
import subprocess
import os
import sys

class TestStats(unittest.TestCase):
    def test_basic_stats(self):
        # Result for data.txt should be Lines: 3, Words: 12
        # (Hello, world, This, is, a, test, file, With, three, lines, and, some, words.)
        # wait: "Hello world" (2), "This is a test file" (5), "With three lines and some words." (6) -> 13 words
        # Let's count again: 
        # 1. Hello (1) 2. world (2)
        # 3. This (3) 4. is (4) 5. a (5) 6. test (6) 7. file (7)
        # 8. With (8) 9. three (9) 10. lines (10) 11. and (11) 12. some (12) 13. words. (13)
        # Total: 13 words.
        
        result = subprocess.run(
            [sys.executable, "stats.py", "data.txt"],
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("Lines: 3", result.stdout)
        self.assertIn("Words: 13", result.stdout)

    def test_not_found(self):
        result = subprocess.run(
            [sys.executable, "stats.py", "nonexistent.txt"],
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("Error: File not found", result.stdout)

if __name__ == "__main__":
    unittest.main()
