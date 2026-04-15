import os
import sys

def verify(workspace):
    app_file = os.path.join(workspace, "app.js")
    if not os.path.exists(app_file):
        return False
        
    with open(app_file, "r") as f:
        content = f.read()
        
    # Check for lookAt call
    has_lookat = "camera.lookAt" in content and "cube.position" in content
    
    if has_lookat:
        print("Réussite : La caméra suit le cube avec lookAt")
        return True
    else:
        print("Échec : camera.lookAt(cube.position) manquant dans animate")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
