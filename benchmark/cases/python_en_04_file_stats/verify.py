import subprocess
import os
import sys

def verify(workspace_path):
    print(f"Verifying Case 04: {workspace_path}")
    
    # Run the tests
    try:
        result = subprocess.run(
            [sys.executable, "test_stats.py"],
            cwd=workspace_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("Tests passed!")
            return True
        else:
            print("Tests failed.")
            print(result.stdout)
            print(result.stderr)
            return False
    except Exception as e:
        print(f"Verification error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    success = verify(sys.argv[1])
    sys.exit(0 if success else 1)
