import os
import sys

def verify(workspace):
    plan_file = os.path.join(workspace, "plan.md")
    if not os.path.exists(plan_file):
        print("Failure: plan.md not found")
        return False
        
    with open(plan_file, "r") as f:
        content = f.read().lower()
        
    # Check for keywords indicating a real plan
    keywords = ["test", "refactor", "class", "module", "step", "pattern"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 3:
        print("Successfully generated a detailed refactoring plan")
        return True
    else:
        print(f"Failure: Plan is too brief or lacks key concepts (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
