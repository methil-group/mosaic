import os
import sys

def verify(workspace):
    factory_file = os.path.join(workspace, "EntityFactory.js")
    app_file = os.path.join(workspace, "app.js")
    
    if not all([os.path.exists(factory_file), os.path.exists(app_file)]):
        return False
        
    with open(factory_file, "r") as f:
        factory_content = f.read()
    with open(app_file, "r") as f:
        app_content = f.read()
        
    # Check for correct dynamic instantiation logic
    has_factory_logic = "world.addComponent" in factory_content and "new Components" in factory_content or "Components[" in factory_content
    has_loop = "forEach" in app_content or "for" in app_content
    
    # Check for require usage
    has_require = "require('./EntityFactory')" in app_content
    
    if all([has_factory_logic, has_loop, has_require]):
        print("Successfully verified Data-Driven ECS loading logic")
        return True
    else:
        print("Failure: Missing factory instantiation logic or multi-file integration")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
