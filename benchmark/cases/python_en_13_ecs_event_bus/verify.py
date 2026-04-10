import os
import sys
import subprocess

def verify(workspace):
    bus_file = os.path.join(workspace, "event_bus.py")
    combat_file = os.path.join(workspace, "combat_system.py")
    ui_file = os.path.join(workspace, "ui_system.py")
    
    if not all([os.path.exists(bus_file), os.path.exists(combat_file), os.path.exists(ui_file)]):
        return False
        
    with open(bus_file, "r") as f: bus_content = f.read()
    with open(combat_file, "r") as f: combat_content = f.read()
    with open(ui_file, "r") as f: ui_content = f.read()
    
    # Check for correct logic
    has_publish = "publish" in bus_content and "listener(data)" in bus_content or "listener(" in bus_content
    has_event = "DamageTaken" in combat_content and "publish" in combat_content
    has_subscribe = "subscribe" in ui_content and "DamageTaken" in ui_content
    
    if not all([has_publish, has_event, has_subscribe]):
        print("Failure: Missing event bus logic or system integration")
        return False

    # Run app.py to verify execution
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(workspace, "app.py")],
            capture_output=True,
            text=True
        )
        if "Success: UI System received all combat events." in result.stdout:
            print("Successfully verified Event Bus decoupling and communication logic")
            return True
        else:
            print(f"Failure: Output did not indicate success: {result.stdout}")
            return False
    except Exception as e:
        print(f"Error during execution: {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
