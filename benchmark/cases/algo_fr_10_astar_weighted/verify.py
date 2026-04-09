import os
import sys

def verify(workspace):
    astar_file = os.path.join(workspace, "astar.py")
    if not os.path.exists(astar_file):
        return False
        
    with open(astar_file, "r") as f:
        content = f.read()
        
    # Check for Weighted A* components (same as EN)
    has_cost = "grille[" in content and ("+" in content or "+=" in content)
    has_heuristic = "abs" in content
    has_priority = "heapq" in content or "priority" in content or "sort" in content
    
    if all([has_cost, has_heuristic, has_priority]):
        print("Réussite : Algorithme A* pondéré implémenté correctement")
        return True
    else:
        print("Échec : Gestion des coûts, heuristique ou file de priorité manquante")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
