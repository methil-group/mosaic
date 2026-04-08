import os
import sys

def verify(workspace):
    src_file = os.path.join(workspace, "index.js")
    with open(src_file, "r") as f:
        content = f.read()
        
    has_logger_info = "logger.info" in content
    no_raw_console = "console.log" not in content
    
    if has_logger_info and no_raw_console:
        print("Successfully refactored logging to use logger.info")
        return True
    else:
        print("Failed to refactor logging properly")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
