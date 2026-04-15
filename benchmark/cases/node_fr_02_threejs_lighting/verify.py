import os
import sys

def verify(workspace):
    app_file = os.path.join(workspace, "app.js")
    if not os.path.exists(app_file):
        return False
        
    with open(app_file, "r") as f:
        content = f.read()
        
    # Check for lighting and shadow logic
    checks = {
        "DirectionalLight": "DirectionalLight" in content,
        "renderer shadowMap": "shadowMap.enabled" in content,
        "light castShadow": ".castShadow = true" in content or ".castShadow=true" in content,
        "cube castShadow": "cube.castShadow" in content,
        "plane receiveShadow": "plane.receiveShadow" in content
    }
    
    all_ok = all(checks.values())
    
    if all_ok:
        print("Réussite : Éclairage et ombres configurés correctement")
        return True
    else:
        missing = [k for k, v in checks.items() if not v]
        print(f"Échec : Éléments manquants : {', '.join(missing)}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
