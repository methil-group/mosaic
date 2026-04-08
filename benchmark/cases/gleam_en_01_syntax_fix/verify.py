import subprocess
import os
import sys

def verify(workspace):
    # Try to run gleam check
    result = subprocess.run(
        ["gleam", "check"],
        cwd=workspace,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"Compilation failed:\n{result.stderr}")
        return False
        
    # Check if x = 10 is present in the file
    src_file = os.path.join(workspace, "src", "syntax_fix.gleam")
    with open(src_file, "r") as f:
        content = f.read()
        if "let x = 10" in content:
            print("Successfully fixed syntax and set x = 10")
            return True
        else:
            print("Syntax fixed but x is not set to 10")
            return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
