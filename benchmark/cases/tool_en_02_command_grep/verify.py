import os
import sys

def verify(workspace):
    todo_file = os.path.join(workspace, "todo_list.md")
    if not os.path.exists(todo_file):
        print("Failure: todo_list.md not found")
        return False
        
    with open(todo_file, "r") as f:
        content = f.read()
        
    # Check for expected TODO items
    expected = [
        "Implement database connection",
        "Add logging middleware",
        "Add metrics collection"
    ]
    
    all_found = all(item in content for item in expected)
    has_format = "app.py:" in content
    
    if all_found and has_format:
        print("Successfully extracted TODO list using grep")
        return True
    else:
        print("Failure: Missing items or incorrect format in todo_list.md")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
