import os
import sys

def verify(workspace):
    src_file = os.path.join(workspace, "script.js")
    with open(src_file, "r") as f:
        content = f.read()
        
    has_async = "async function readFileAsync" in content
    has_await = "await" in content
    has_promises = "fs.promises" in content or "require('fs/promises')" in content or "require('fs').promises" in content
    
    if has_async and (has_await or has_promises):
        print("Successfully refactored to async/await")
        return True
    else:
        print("Failed to use async/await properly")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
