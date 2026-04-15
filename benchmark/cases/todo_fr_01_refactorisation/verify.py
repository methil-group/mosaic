import os
import sys

def verify(workspace):
    plan_file = os.path.join(workspace, "plan.md")
    if not os.path.exists(plan_file):
        print("Échec : plan.md introuvable")
        return False
        
    with open(plan_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["test", "refactor", "classe", "module", "etape", "pattern", "email", "smtp"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 3:
        print("Réussite : Plan de refactorisation détaillé généré")
        return True
    else:
        print(f"Échec : Le plan est trop succinct ou manque de concepts clés (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
