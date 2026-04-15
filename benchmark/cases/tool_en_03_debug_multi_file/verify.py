import os
import sys
import subprocess

def verify(workspace):
    config_file = os.path.join(workspace, "config.py")
    if not os.path.exists(config_file):
        return False
        
    # Check if the bug is fixed
    with open(config_file, "r") as f:
        content = f.read()
    
    if "threshold_limit" in content:
        print("Failure: Bug still exists in config.py")
        return False
        
    # Run app.py and check output
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(workspace, "app.py")],
            capture_output=True,
            text=True
        )
        if "Result: [20, 30]" in result.stdout:
            print("Successfully verified bug fix and application execution")
            return True
        else:
            print(f"Failure: Unexpected output: {result.stdout}")
            return False
    except Exception as e:
        print(f"Error running app.py: {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
