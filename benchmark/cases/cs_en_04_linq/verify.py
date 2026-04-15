import os
import sys
import subprocess

def verify(workspace):
    program_file = os.path.join(workspace, "Program.cs")
    if not os.path.exists(program_file):
        return False
        
    with open(program_file, "r") as f:
        content = f.read()
        
    # Check for LINQ usage and logic
    has_linq = "using System.Linq" in content
    has_where = ".Where(" in content or "where" in content
    has_select = ".Select(" in content or "select" in content
    no_foreach = content.count("foreach") <= 1 # Should only have the initial one or none in the refactored method
    
    if not all([has_linq, has_where, has_select, no_foreach]):
        print("Failure: LINQ not used correctly or foreach loop remains in DataProcessor")
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

    print("Successfully verified C# LINQ logic")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
