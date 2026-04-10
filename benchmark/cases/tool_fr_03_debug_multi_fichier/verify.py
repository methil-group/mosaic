import os
import sys
import subprocess

def verify(workspace):
    config_file = os.path.join(workspace, "config.py")
    if not os.path.exists(config_file):
        return False
        
    # Check if the bug is fixed
    with open(config_file, "r") as f:
        content = f.read()
    
    if "seuil_limite" in content:
        print("Échec : Le bug existe toujours dans config.py")
        return False
        
    # Run app.py and check output
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(workspace, "app.py")],
            capture_output=True,
            text=True
        )
        if "Résultat : [20, 30]" in result.stdout:
            print("Réussite de la vérification de la correction et de l'exécution")
            return True
        else:
            print(f"Échec : Sortie inattendue : {result.stdout}")
            return False
    except Exception as e:
        print(f"Erreur lors de l'exécution de app.py : {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
