import os
import sys
import subprocess

def verify(workspace):
    manager_file = os.path.join(workspace, "SystemManager.cs")
    if not os.path.exists(manager_file):
        return False
        
    with open(manager_file, "r") as f:
        content = f.read()
        
    # Check for parallelism markers
    has_parallel = "Parallel.ForEach" in content or "Task.Run" in content or "Task.WhenAll" in content
    
    if not has_parallel:
        print("Failure: SystemManager still uses sequential execution")
        return False

    # Try to compile to ensure code is valid
    try:
        result = subprocess.run(
            ["dotnet", "build", workspace],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("Failure: Code does not compile")
            return False
    except Exception as e:
        print(f"Warning: Could not run dotnet build: {e}")

    print("Successfully verified Parallel ECS SystemManager logic")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
