import os
import sys

def verify(workspace):
    phys_file = os.path.join(workspace, "physics.js")
    if not os.path.exists(phys_file):
        return False
        
    with open(phys_file, "r") as f:
        content = f.read()
        
    # Check for AABB components
    has_check = "checkCollision" in content and "right" in content and "left" in content
    has_resolve = "resolveCollision" in content and ("x" in content or "y" in content)
    has_logic = "<" in content and ">" in content
    
    if all([has_check, has_resolve, has_logic]):
        print("Successfully verified AABB Physics logic")
        return True
    else:
        print("Failure: Missing collision check or resolution logic")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
