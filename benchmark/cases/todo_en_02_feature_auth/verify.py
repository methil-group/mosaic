import os
import sys

def verify(workspace):
    todo_file = os.path.join(workspace, "todo.md")
    if not os.path.exists(todo_file):
        print("Failure: todo.md not found")
        return False
        
    with open(todo_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["oauth", "client", "token", "callback", "redirect", "session"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 4:
        print("Successfully generated an OAuth2 implementation plan")
        return True
    else:
        print(f"Failure: Plan lacks OAuth2 concepts (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
