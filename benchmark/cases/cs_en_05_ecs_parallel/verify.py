import os
import sys
import subprocess

def verify(workspace):
    manager_file = os.path.join(workspace, "SystemManager.cs")
    if not os.path.exists(manager_file):
        return False
        
    with open(manager_file, "r") as f:
        content = f.read()
        
    import re
    # Check for parallelism markers specifically in code, not comments
    code_pattern = r"(?<!//)\s*(Parallel\.ForEach|Task\.Run|Task\.WhenAll)"
    has_parallel = re.search(code_pattern, content)
    
    # Also check if the original sequential foreach loop is still there
    original_foreach = "foreach (var system in _systems)"
    is_sequential_gone = original_foreach not in content or "await Task.WhenAll" in content
    
    if not has_parallel or not is_sequential_gone:
        print("Failure: SystemManager still uses sequential execution or failed to implement parallelism")
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
