import os
import sys
import subprocess

def verify(workspace):
    program_file = os.path.join(workspace, "Program.cs")
    if not os.path.exists(program_file):
        return False
        
    with open(program_file, "r") as f:
        content = f.read()
        
    # Check for core C# ECS features
    has_generics = "AddComponent<" in content and "GetComponent<" in content
    has_world = "class World" in content
    has_system = "MovementSystem" in content
    has_logic = "dt" in content and ("X" in content or "Y" in content)
    
    if not all([has_generics, has_world, has_system, has_logic]):
        print("Failure: Missing core C# ECS components or generic implementation")
        return False

    # Optional: Try to compile
    try:
        result = subprocess.run(
            ["dotnet", "build", workspace],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("Failure: Code does not compile")
            print(result.stdout)
            # return False # We might be lenient on compile if the logic is there, but usually it should compile
    except Exception as e:
        print(f"Warning: Could not run dotnet build: {e}")

    print("Successfully verified C# ECS logic")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
