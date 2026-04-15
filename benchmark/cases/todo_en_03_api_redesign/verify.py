import os
import sys

def verify(workspace):
    mig_file = os.path.join(workspace, "migration.md")
    if not os.path.exists(mig_file):
        print("Failure: migration.md not found")
        return False
        
    with open(mig_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["graphql", "schema", "type", "query", "mutation", "resolver"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 4:
        print("Successfully generated a GraphQL migration plan")
        return True
    else:
        print(f"Failure: Plan lacks GraphQL concepts (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
