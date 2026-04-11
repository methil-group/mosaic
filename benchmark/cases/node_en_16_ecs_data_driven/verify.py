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
        
    import subprocess
    # Run app.js to verify logical execution
    try:
        result = subprocess.run(
            ["node", app_file],
            capture_output=True,
            text=True,
            timeout=5
        )
        if "Success: Level loaded with 2 entities." in result.stdout:
            print("Successfully verified Data-Driven ECS loading logic")
            return True
        else:
            print(f"Failure: Logic verification failed. Output: {result.stdout}")
            return False
    except Exception as e:
        print(f"Error executing app.js: {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
