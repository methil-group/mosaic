import os
import sys
import subprocess

def verify(workspace):
    snapshot_file = os.path.join(workspace, "GestionnaireSnapshots.js")
    app_file = os.path.join(workspace, "app.js")
    
    if not all([os.path.exists(snapshot_file), os.path.exists(app_file)]):
        return False
        
    with open(snapshot_file, "r") as f:
        snapshot_content = f.read()
        
    # Check for snapshot/rollback logic (French version)
    has_snapshot = "this.snapshots.push" in snapshot_content or "this.snapshots[" in snapshot_content
    has_clone = "cloner" in snapshot_content
    has_rollback = "restaurer" in snapshot_content and "stockage" in snapshot_content
    
    if not all([has_snapshot, has_rollback]):
        print("Échec : Logique de snapshot ou de restauration manquante")
        return False

    # Run app.js to verify execution
    try:
        result = subprocess.run(
            ["node", os.path.join(workspace, "app.js")],
            capture_output=True,
            text=True
        )
        if "Succès : Restauration réussie." in result.stdout:
            print("Réussite : Logique de Snapshot Global ECS & Rollback vérifiée")
            return True
        else:
            print(f"Échec : Sortie inattendue : {result.stdout}")
            return False
    except Exception as e:
        print(f"Erreur lors de l'exécution : {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
