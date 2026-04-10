import os
import sys
import subprocess

def verify(workspace):
    loop_file = os.path.join(workspace, "UpdateLoop.cs")
    if not os.path.exists(loop_file):
        return False
        
    with open(loop_file, "r") as f:
        content = f.read()
        
    # Check for script execution logic
    has_loop = "foreach" in content or "for" in content
    has_invoke = "Invoke" in content or "OnUpdate(" in content
    has_filter = "OfType<ScriptComponent>" in content or "as ScriptComponent" in content
    
    if not (has_loop and has_invoke):
        print("Failure: Missing update loop or script invocation logic")
        return False

    # Run Program.cs to verify execution
    try:
        result = subprocess.run(
            ["dotnet", "run", "--project", workspace],
            capture_output=True,
            text=True
        )
        if "Success: Script was executed." in result.stdout:
            print("Successfully verified ECS Script Component logic")
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
