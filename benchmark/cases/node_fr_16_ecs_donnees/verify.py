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
        
    # Check for correct dynamic instantiation logic
    has_fabrique_logic = "monde.ajouterComposant" in fabrique_content and "new Composants" in fabrique_content or "Composants[" in fabrique_content
    has_loop = "forEach" in app_content or "for" in app_content
    
    # Check for require usage
    has_require = "require('./FabriqueEntite')" in app_content
    
    if all([has_fabrique_logic, has_loop, has_require]):
        print("Réussite : Logique de chargement ECS Data-Driven vérifiée")
        return True
    else:
        print("Échec : Logique d'instanciation de fabrique ou intégration multi-fichiers manquante")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
