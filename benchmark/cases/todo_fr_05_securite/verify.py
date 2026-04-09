import os
import sys

def verify(workspace):
    sec_file = os.path.join(workspace, "securite.md")
    if not os.path.exists(sec_file):
        print("Échec : securite.md introuvable")
        return False
        
    with open(sec_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["securite", "owasp", "sql", "xss", "audit", "mfa", "secret", "vault"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 4:
        print("Réussite : Plan d'audit de sécurité généré")
        return True
    else:
        print(f"Échec : Le plan manque de détails sur la cybersécurité (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
