import os
import sys

def verify(workspace):
    app_file = os.path.join(workspace, "app.js")
    if not os.path.exists(app_file):
        return False
        
    with open(app_file, "r") as f:
        content = f.read()
        
    # Check for RenderSystem logic
    has_system = "RenderSystem" in content
    has_sync = "threeMesh.position" in content and "position.x" in content and "position.y" in content
    has_loop = "forEach" in content or "for" in content or "of" in content
    
    if all([has_system, has_sync, has_loop]):
        print("Successfully implemented RenderSystem for Three.js synchronization")
        return True
    else:
        print("Failure: RenderSystem logic is missing or incomplete")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
