import os
import sys

def verify(workspace):
    sh_file = os.path.join(workspace, "spatial_hash.py")
    if not os.path.exists(sh_file):
        return False
        
    with open(sh_file, "r") as f:
        content = f.read()
        
    # Check for core Spatial Hash logic
    has_grid = "self.grid = {}" in content
    has_insert = "append" in content or "add" in content or "set" in content
    has_query = "range" in content or "neighbor" in content or "for dx" in content or ("+ 1" in content and "- 1" in content)
    
    if all([has_grid, has_insert, has_query]):
        print("Successfully verified Spatial Hash logic")
        return True
    else:
        print("Failure: Missing grid storage or neighbor query logic")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
