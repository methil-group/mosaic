import os
import sys
import subprocess

def verify(workspace):
    program_file = os.path.join(workspace, "Program.cs")
    if not os.path.exists(program_file):
        return False
        
    with open(program_file, "r") as f:
        content = f.read()
        
    # Check for FSM components
    has_states = "Idle" in content and "Patrolling" in content and "Chasing" in content
    has_logic = "distance" in content or "Distance" in content
    has_update = "Update" in content or "update" in content
    
    if not all([has_states, has_logic, has_update]):
        print("Failure: Missing states or transition logic in C# FSM implementation")
        return False

    try:
        result = subprocess.run(
            ["dotnet", "build", workspace],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("Failure: Code does not compile")
    except Exception as e:
        print(f"Warning: Could not run dotnet build: {e}")

    print("Successfully verified C# FSM logic")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
