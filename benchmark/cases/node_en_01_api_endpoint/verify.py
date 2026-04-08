import os
import sys
import re

def verify(workspace):
    src_file = os.path.join(workspace, "app.js")
    if not os.path.exists(src_file):
        print("Error: app.js not found")
        return False
        
    with open(src_file, "r") as f:
        content = f.read()
        
    has_health = "/health" in content and "\"status\": \"ok\"" in content.replace("'", "\"")
    
    if has_health:
        print("Successfully added /health endpoint with correct JSON response")
        return True
    else:
        print("Missing /health endpoint or incorrect JSON response")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
