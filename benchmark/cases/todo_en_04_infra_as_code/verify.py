import os
import sys

def verify(workspace):
    infra_file = os.path.join(workspace, "infra.md")
    if not os.path.exists(infra_file):
        print("Failure: infra.md not found")
        return False
        
    with open(infra_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["terraform", "aws", "rds", "vpc", "subnet", "load balancer", "backend"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 4:
        print("Successfully generated a Terraform infrastructure plan")
        return True
    else:
        print(f"Failure: Plan lacks infrastructure concepts (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
