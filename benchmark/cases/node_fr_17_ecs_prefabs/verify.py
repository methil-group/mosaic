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
        
    # Check for core prefab instantiation logic (French version)
    has_fusion = "..." in gestionnaire_content or "Object.assign" in gestionnaire_content or "merge" in gestionnaire_content
    has_instancier = "instancier" in gestionnaire_content and "new Entite" in gestionnaire_content
    has_surcharge_call = "instancier" in app_content and "force" in app_content
    
    if all([has_fusion, has_instancier, has_surcharge_call]):
        print("Réussite : Logique de système de Prefabs ECS avec surcharges vérifiée")
        return True
    else:
        print("Échec : Logique de fusion de prefab ou application des surcharges manquante")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
