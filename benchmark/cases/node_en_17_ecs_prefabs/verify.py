import os
import sys

def verify(workspace):
    manager_file = os.path.join(workspace, "PrefabManager.js")
    app_file = os.path.join(workspace, "app.js")
    
    if not all([os.path.exists(manager_file), os.path.exists(app_file)]):
        return False
        
    with open(manager_file, "r") as f:
        manager_content = f.read()
    with open(app_file, "r") as f:
        app_content = f.read()
        
    # Check for core prefab instantiation logic
    has_merge = "..." in manager_content or "Object.assign" in manager_content or "merge" in manager_content
    has_instantiate = "instantiate" in manager_content and "new Entity" in manager_content
    has_override_call = "instantiate" in app_content and "strength" in app_content
    
    if all([has_merge, has_instantiate, has_override_call]):
        print("Successfully verified ECS Prefab System logic with overrides")
        return True
    else:
        print("Failure: Missing prefab merge logic or override application")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
