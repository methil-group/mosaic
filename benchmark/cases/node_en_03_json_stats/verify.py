import os
import sys

def verify(workspace):
    src_file = os.path.join(workspace, "stats.js")
    with open(src_file, "r") as f:
        content = f.read()
        
    has_version = "version" in content
    has_features = "features" in content
    has_fs = "fs" in content or "require('fs')" in content
    
    if has_version and has_features and has_fs:
        print("Successfully implemented JSON extraction in stats.js")
        return True
    else:
        print("Missing logic for JSON extraction")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
