import os
import sys

def verify(workspace):
    app_file = os.path.join(workspace, "app.js")
    if not os.path.exists(app_file):
        return False
        
    with open(app_file, "r") as f:
        content = f.read()
        
    # Check for Lerp logic
    has_lerp = ".lerp(" in content and "endPos" in content
    has_alpha = "alpha" in content
    
    if has_lerp and has_alpha:
        print("Réussite : Animation Lerp implémentée")
        return True
    else:
        print("Échec : Méthode .lerp() ou variable alpha manquante")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
