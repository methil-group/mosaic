import os
import sys
import subprocess

def verify(workspace):
    registry_file = os.path.join(workspace, "registry.py")
    if not os.path.exists(registry_file):
        return False
        
    with open(registry_file, "r") as f:
        content = f.read()
        
    # Check for hook dispatch logic specifically in code (no comments)
    import re
    has_dispatch_add = re.search(r"(?<!#)\s*callback\(", content) or re.search(r"(?<!#)\s*for .* in .*hooks\[.on_add.\]", content)
    has_dispatch_remove = re.search(r"(?<!#)\s*callback\(", content) or re.search(r"(?<!#)\s*for .* in .*hooks\[.on_remove.\]", content)
    
    if not (has_dispatch_add and has_dispatch_remove):
        print("Failure: Missing hook dispatch logic in registry.py (not found in code)")
        return False

    # Run app.py to verify execution
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(workspace, "app.py")],
            capture_output=True,
            text=True
        )
        if "Success: Registry hooks triggered correctly." in result.stdout:
            print("Successfully verified ECS Entity Lifecycle Hooks logic")
            return True
        else:
            print(f"Failure: Output did not indicate success: {result.stdout}")
            return False
    except Exception as e:
        print(f"Error during execution: {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
