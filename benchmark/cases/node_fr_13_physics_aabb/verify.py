import os
import sys

def verify(workspace):
    phys_file = os.path.join(workspace, "physics.js")
    if not os.path.exists(phys_file):
        return False
        
    with open(phys_file, "r") as f:
        content = f.read()
        
    # Check for AABB components (French version)
    has_check = "verifierCollision" in content and "droite" in content and "gauche" in content
    has_resolve = "resoudreCollision" in content and ("x" in content or "y" in content)
    has_logic = "<" in content and ">" in content
    
    if all([has_check, has_resolve, has_logic]):
        print("Réussite de la vérification de la logique physique AABB")
        return True
    else:
        print("Échec : Vérification de collision ou logique de résolution manquante")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
