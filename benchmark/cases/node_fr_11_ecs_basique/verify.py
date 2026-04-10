import os
import sys

def verify(workspace):
    ecs_file = os.path.join(workspace, "ecs.js")
    if not os.path.exists(ecs_file):
        return False
        
    with open(ecs_file, "r") as f:
        content = f.read()
        
    # Check for core ECS methods and logic (French version)
    has_world = "Monde" in content and "entites" in content
    has_create = "creerEntite" in content
    has_component_add = "ajouterComposant" in content
    has_system_add = "ajouterSysteme" in content
    has_update = "mettreAJour" in content
    has_logic = "+=" in content and "dt" in content and ("vx" in content or "velocite" in content)
    
    if all([has_world, has_create, has_component_add, has_system_add, has_update, has_logic]):
        print("Réussite : Logique ECS de base avec système de mouvement implémentée")
        return True
    else:
        print("Échec : Composants ECS de base ou logique de mouvement manquants")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
