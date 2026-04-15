import os
import sys

def verify(workspace):
    sh_file = os.path.join(workspace, "spatial_hash.py")
    if not os.path.exists(sh_file):
        return False
        
    with open(sh_file, "r") as f:
        content = f.read()
        
    # Check for core Spatial Hash logic (French version)
    has_grid = "self.grille = {}" in content
    has_insert = "append" in content or "add" in content or "set" in content
    has_query = "range" in content or "voisines" in content or "for dx" in content
    
    if all([has_grid, has_insert, has_query]):
        print("Réussite de la vérification de la logique de Hachage Spatial")
        return True
    else:
        print("Échec : Stockage en grille ou logique de requête de voisinage manquants")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
