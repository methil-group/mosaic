import os
import sys
import re

def verify(workspace):
    coll_file = os.path.join(workspace, "collision.py")
    if not os.path.exists(coll_file):
        print("Error: collision.py not found")
        return False
        
    with open(coll_file, "r") as f:
        content = f.read()
        
    # Check for SAT components
    has_loop = "for" in content
    has_proj = "dot" in content or "*" in content # Dot product approximation in search
    has_min_max = "min" in content and "max" in content
    has_return_false = "return False" in content
    
    # Check for normal calculation
    has_normal = "(-" in content or "-y" in content or "y2 - y1" in content
    
    if all([has_loop, has_min_max, has_return_false, has_normal]):
        print("Successfully implemented SAT collision logic")
        return True
    else:
        missing = []
        if not has_loop: missing.append("iteration through axes")
        if not has_min_max: missing.append("projection min/max")
        if not has_return_false: missing.append("early exit (False) logic")
        if not has_normal: missing.append("normal calculation")
        print(f"Missing logic: {', '.join(missing)}")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
