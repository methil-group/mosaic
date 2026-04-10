import os
import sys

def verify(workspace):
    qt_file = os.path.join(workspace, "quadtree.js")
    if not os.path.exists(qt_file):
        return False
        
    with open(qt_file, "r") as f:
        content = f.read()
        
    # Check for core Quadtree logic (French version)
    has_subdivide = "subdiviser" in content and "new Quadtree" in content
    has_insert = "inserer" in content and "push" in content
    has_query = "requete" in content and ("zone" in content or "trouves" in content)
    
    if all([has_subdivide, has_insert, has_query]):
        print("Réussite de la vérification de la logique Quadtree")
        return True
    else:
        print("Échec : Subdivision ou logique de requête récursive manquante")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
