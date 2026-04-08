# Refactor Prints to Logging

The file `app.py` uses many `print()` statements for information and error tracking.
This is not ideal for a production application.

Your task:
1. Refactor `app.py` to use the standard Python `logging` module.
2. Initialize logging with basic configuration.
3. Replace all `print()` calls with appropriate `logging.info()`, `logging.warning()`, or `logging.error()` calls.
4. Ensure the program still functions as expected.
