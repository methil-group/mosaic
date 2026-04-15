import os
import sys

def verify(workspace):
    app_file = os.path.join(workspace, "app.js")
    if not os.path.exists(app_file):
        return False
        
    with open(app_file, "r") as f:
        content = f.read()
        
    # Check for Group usage
    has_group = "new THREE.Group()" in content or "THREE.Group" in content
    has_add = ".add(terre)" in content and ".add(lune)" in content
    has_rot = "rotation.y +=" in content or "rotation.y =" in content
    
    if has_group and has_add and has_rot:
        print("Réussite : Hiérarchie de groupe implémentée")
        return True
    else:
        print("Échec : Utilisation incorrecte de THREE.Group ou rotation manquante")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
