# Fix Email Regex Validation

The email validation regex in `validator.py` is too restrictive or simply incorrect. 
It fails on many valid email formats.

Your task:
1. Examine `validator.py` and the test suite `test_validator.py`.
2. Run the tests to see which patterns fail.
3. Update the regex in `validator.py` to correctly identify valid email addresses according to common standards (must have user, @, domain, and TLD).
4. Ensure all tests pass.
