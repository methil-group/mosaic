import os
import sys

def verify(workspace):
    inv_file = os.path.join(workspace, "inventaire.txt")
    if not os.path.exists(inv_file):
        print("Échec : inventaire.txt introuvable")
        return False
        
    with open(inv_file, "r") as f:
        content = f.read()
        
    # Check if it contains some recursive listing output
    # Usually contains "." or "./" or multiple lines
    if len(content.splitlines()) > 1 and ("." in content or "task.md" in content):
        print("Réussite : Inventaire généré via commande")
        return True
    else:
        print("Échec : Le fichier inventaire est vide ou mal formaté")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
