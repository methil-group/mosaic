import os
import sys

def verify(workspace):
    mig_file = os.path.join(workspace, "migration.md")
    if not os.path.exists(mig_file):
        print("Échec : migration.md introuvable")
        return False
        
    with open(mig_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["service", "migration", "api", "deploie", "canary", "monitoring"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 3:
        print("Réussite : Plan de migration vers microservices généré")
        return True
    else:
        print(f"Échec : Le plan manque de détails sur la migration (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
