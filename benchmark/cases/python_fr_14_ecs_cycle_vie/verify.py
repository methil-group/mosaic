import os
import sys
import subprocess

def verify(workspace):
    registre_file = os.path.join(workspace, "registre.py")
    if not os.path.exists(registre_file):
        return False
        
    with open(registre_file, "r") as f:
        content = f.read()
        
    # Check for hook dispatch logic (French version)
    has_dispatch_add = "_sur_composant_ajoute" in content and ("rappel(entite" in content or "rappel(" in content)
    has_dispatch_retire = "_sur_composant_retire" in content and ("rappel(entite" in content or "rappel(" in content)
    has_loop = "for" in content
    
    if not (has_dispatch_add and has_dispatch_retire and has_loop):
        print("Échec : Logique de dispatch des hooks manquante dans registre.py")
        return False

    # Run app.py to verify execution
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(workspace, "app.py")],
            capture_output=True,
            text=True
        )
        if "Succès : Les hooks du registre ont été déclenchés correctement." in result.stdout:
            print("Réussite : Logique de Hooks de Cycle de Vie ECS vérifiée")
            return True
        else:
            print(f"Échec : La sortie n'indique pas un succès : {result.stdout}")
            return False
    except Exception as e:
        print(f"Erreur lors de l'exécution : {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
