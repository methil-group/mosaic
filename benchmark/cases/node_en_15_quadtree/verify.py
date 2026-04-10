import os
import sys

def verify(workspace):
    qt_file = os.path.join(workspace, "quadtree.js")
    if not os.path.exists(qt_file):
        return False
        
    with open(qt_file, "r") as f:
        content = f.read()
        
    # Check for core Quadtree logic
    has_subdivide = "subdivide" in content and "new Quadtree" in content
    has_insert = "insert" in content and "points.push" in content
    has_query = "query" in content and "intersects" in content or "range" in content
    
    if all([has_subdivide, has_insert, has_query]):
        print("Successfully verified Quadtree logic")
        return True
    else:
        print("Failure: Missing subdivision or recursive query logic")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
