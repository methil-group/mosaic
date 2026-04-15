import os
import sys

def verify(workspace):
    fabrique_file = os.path.join(workspace, "FabriqueEntite.js")
    app_file = os.path.join(workspace, "app.js")
    
    if not all([os.path.exists(fabrique_file), os.path.exists(app_file)]):
        return False
        
    with open(fabrique_file, "r") as f:
        fabrique_content = f.read()
    with open(app_file, "r") as f:
        app_content = f.read()
        
    import subprocess
    # Run app.js to verify logical execution (French version)
    try:
        result = subprocess.run(
            ["node", app_file],
            capture_output=True,
            text=True,
            timeout=5
        )
        if "Succès : Niveau chargé avec 2 entités." in result.stdout:
            print("Réussite : Logique de chargement ECS pilotée par les données vérifiée")
            return True
        else:
            print(f"Échec : La vérification logique a échoué. Sortie : {result.stdout}")
            return False
    except Exception as e:
        print(f"Erreur lors de l'exécution de app.js : {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
