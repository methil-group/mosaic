import os
import sys
import subprocess

def verify(workspace):
    system_file = os.path.join(workspace, "TargetingSystem.cs")
    if not os.path.exists(system_file):
        return False
        
    with open(system_file, "r") as f:
        content = f.read()
        
    # Check for tag filtering logic
    has_pos_checks = "HasComponent<IsEnemy>" in content and "HasComponent<InView>" in content
    has_neg_check = "HasComponent<IsActive>" in content and "!" in content
    
    if not (has_pos_checks and has_neg_check):
        print("Failure: Missing positive or negative tag filtering logic")
        return False

    # Run Program.cs to verify execution
    try:
        result = subprocess.run(
            ["dotnet", "run", "--project", workspace],
            capture_output=True,
            text=True
        )
        if "Found 1 valid targets" in result.stdout:
            print("Successfully verified ECS Tagging and Filtering logic")
            return True
        else:
            print(f"Failure: Unexpected output: {result.stdout}")
            return False
    except Exception as e:
        print(f"Error during execution: {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
