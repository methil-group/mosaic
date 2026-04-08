import os
import sys

def verify(workspace):
    script_path = os.path.join(workspace, "app.py")
    with open(script_path, "r") as f:
        content = f.read()
    
    # Check if logging is imported and used, and print is gone
    has_logging = "import logging" in content
    uses_logging = "logging.info" in content or "logging.debug" in content
    no_raw_print = "print(" not in content
    
    if has_logging and uses_logging and no_raw_print:
        print("Success: Refactored prints to logging")
        return True
    else:
        print(f"Failure: Logging check failed. has_logging={has_logging}, uses_logging={uses_logging}, no_raw_print={no_raw_print}")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
