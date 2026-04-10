import os
import sys

def verify(workspace):
    dungeon_file = os.path.join(workspace, "dungeon.js")
    if not os.path.exists(dungeon_file):
        return False
        
    with open(dungeon_file, "r") as f:
        content = f.read()
        
    # Check for core generation logic
    has_math = "Math.random" in content
    has_loop = "for" in content or "while" in content
    has_grid_update = "." in content or "#" in content
    
    if all([has_math, has_loop, has_grid_update]):
        print("Successfully verified Procedural Dungeon logic")
        return True
    else:
        print("Failure: Missing randomness or grid generation logic")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
