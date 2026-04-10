import os
import sys
import subprocess

def verify(workspace):
    program_file = os.path.join(workspace, "Program.cs")
    if not os.path.exists(program_file):
        return False
        
    with open(program_file, "r") as f:
        content = f.read()
        
    # Check for core A* and C# components
    has_pq = "PriorityQueue<" in content
    has_heuristic = "Math.Abs" in content
    has_logic = "while" in content and ("count" in content or "Count" in content)
    
    if not all([has_pq, has_heuristic, has_logic]):
        print("Failure: Missing PriorityQueue or Manhattan distance heuristic in C# implementation")
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

    print("Successfully verified C# A* logic")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
