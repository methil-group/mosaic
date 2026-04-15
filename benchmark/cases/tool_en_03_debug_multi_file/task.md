# Task: Debug Multi-file Application

The application is failing when running `app.py`. A log file `logs/error.log` has been generated with a traceback.

Your task:
1. Examine the log file to understand the error.
2. Trace the code through `app.py`, `processor.py`, and `config.py`.
3. Find the root cause and fix it so that `app.py` runs successfully.
4. Verify the fix by running `app.py`.

Requirements:
- Do not change `app.py` or `processor.py` unless absolutely necessary (the bug is likely in `config.py`).
- The fix should allow `processor.process()` to return a list of values greater than the threshold.
