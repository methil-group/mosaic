import os
import sys

def verify(workspace):
    gestionnaire_file = os.path.join(workspace, "GestionnairePrefabs.js")
    app_file = os.path.join(workspace, "app.js")
    
    if not all([os.path.exists(gestionnaire_file), os.path.exists(app_file)]):
        return False
        
    with open(gestionnaire_file, "r") as f:
        gestionnaire_content = f.read()
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
        if "Succès : Orc instancié avec les bonnes surcharges." in result.stdout:
            print("Réussite : Logique de système de Prefabs ECS avec surcharges vérifiée")
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
