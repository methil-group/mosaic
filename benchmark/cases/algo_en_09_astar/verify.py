import os
import sys

def verify(workspace):
    astar_file = os.path.join(workspace, "astar.js")
    if not os.path.exists(astar_file):
        return False
        
    with open(astar_file, "r") as f:
        content = f.read()
        
    # Check for A* components
    has_heuristic = "abs" in content or "Math.abs" in content
    has_g_score = "gScore" in content or "g_score" in content or "dist" in content
    has_f_score = "fScore" in content or "f_score" in content
    has_priority_queue = "push" in content and ("sort" in content or "min" in content or "shift" in content)
    
    if all([has_heuristic, has_g_score, has_f_score, has_priority_queue]):
        print("Successfully implemented A* pathfinding logic")
        return True
    else:
        print("Failure: Missing core A* components (heuristic, scoring, or priority handling)")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
