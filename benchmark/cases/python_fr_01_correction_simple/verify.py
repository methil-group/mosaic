import subprocess
import os
import sys

def verify(workspace):
    script_path = os.path.join(workspace, "main.py")
    result = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
    
    # 5 + 10 should be 15
    if "15" in result.stdout:
        print("Success: 5 + 10 = 15")
        return True
    else:
        print(f"Failure: Expected 15 but got output: {result.stdout.strip()}")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
