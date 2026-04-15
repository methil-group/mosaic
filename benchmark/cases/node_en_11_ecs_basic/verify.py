import os
import sys

def verify(workspace):
    ecs_file = os.path.join(workspace, "ecs.js")
    if not os.path.exists(ecs_file):
        return False
        
    with open(ecs_file, "r") as f:
        content = f.read()
        
    # Check for core ECS methods and logic
    has_world = "World" in content and "entities" in content
    has_create = "createEntity" in content
    has_component_add = "addComponent" in content
    has_system_add = "addSystem" in content
    has_update = "update" in content
    has_logic = "+=" in content and "dt" in content and ("vx" in content or "velocity" in content)
    
    if all([has_world, has_create, has_component_add, has_system_add, has_update, has_logic]):
        print("Successfully implemented core ECS logic with movement system")
        return True
    else:
        print("Failure: Missing core ECS components or movement system logic")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
