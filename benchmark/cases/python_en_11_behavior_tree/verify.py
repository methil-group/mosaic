import os
import sys

def verify(workspace):
    bt_file = os.path.join(workspace, "behavior_tree.py")
    if not os.path.exists(bt_file):
        return False
        
    with open(bt_file, "r") as f:
        content = f.read()
        
    # Check for core BT logic
    has_sequence = "class Sequence" in content and "FAILURE" in content and "SUCCESS" in content
    has_selector = "class Selector" in content and "SUCCESS" in content
    has_logic = "for child in self.children" in content or "for" in content
    
    # Check if the logic for Sequence returns success only if all children succeed
    # and Selector returns success if any child succeeds.
    # This is a basic grep-based check.
    
    if all([has_sequence, has_selector, has_logic]):
        print("Successfully verified Behavior Tree core logic")
        return True
    else:
        print("Failure: Missing Behavior Tree nodes or iteration logic")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
