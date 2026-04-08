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
        
    src_file = os.path.join(workspace, "src", "logic_update.gleam")
    with open(src_file, "r") as f:
        content = f.read()
        if "Archived" in content and "archived" in content:
            print("Successfully updated logic with Archived variant")
            return True
        else:
            print("Missing Archived variant or string conversion")
            return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
