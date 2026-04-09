import os
import sys

def verify(workspace):
    opt_file = os.path.join(workspace, "optimization.md")
    if not os.path.exists(opt_file):
        print("Failure: optimization.md not found")
        return False
        
    with open(opt_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["index", "query", "optimize", "cache", "redis", "explain", "analyze", "sql"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 4:
        print("Successfully generated a database optimization plan")
        return True
    else:
        print(f"Failure: Plan lacks optimization concepts (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
