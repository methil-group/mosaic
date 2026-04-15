import os
import sys

def verify(workspace):
    dungeon_file = os.path.join(workspace, "dungeon.js")
    if not os.path.exists(dungeon_file):
        return False
        
    with open(dungeon_file, "r") as f:
        content = f.read()
        
    # Check for core generation logic (French version)
    has_math = "Math.random" in content
    has_loop = "for" in content or "while" in content
    has_grid_update = "." in content or "#" in content
    
    if all([has_math, has_loop, has_grid_update]):
        print("Réussite de la vérification de la logique de donjon procédural")
        return True
    else:
        print("Échec : Logique de hasard ou de génération de grille manquante")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
