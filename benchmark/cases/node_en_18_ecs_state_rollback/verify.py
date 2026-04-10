import os
import sys
import subprocess

def verify(workspace):
    snapshot_file = os.path.join(workspace, "SnapshotManager.js")
    app_file = os.path.join(workspace, "app.js")
    
    if not all([os.path.exists(snapshot_file), os.path.exists(app_file)]):
        return False
        
    with open(snapshot_file, "r") as f:
        snapshot_content = f.read()
        
    # Check for snapshot/rollback logic
    has_snapshot = "this.snapshots.push" in snapshot_content or "this.snapshots[" in snapshot_content
    has_clone = "clone" in snapshot_content
    has_rollback = "rollback" in snapshot_content and "store" in snapshot_content
    
    if not all([has_snapshot, has_rollback]):
        print("Failure: Missing snapshot or rollback logic")
        return False

    # Run app.js to verify execution
    try:
        result = subprocess.run(
            ["node", os.path.join(workspace, "app.js")],
            capture_output=True,
            text=True
        )
        if "Success: Rollback successful." in result.stdout:
            print("Successfully verified ECS Global State Snapshot & Rollback logic")
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
