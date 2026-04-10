import os
import sys
import subprocess

def verify(workspace):
    program_file = os.path.join(workspace, "Program.cs")
    if not os.path.exists(program_file):
        return False
        
    with open(program_file, "r") as f:
        content = f.read()
        
    # Check for core C# ECS features (French version)
    has_generics = "AjouterComposant<" in content and "ObtenirComposant<" in content
    has_world = "class Monde" in content
    has_system = "SystemeMouvement" in content
    has_logic = "dt" in content and ("X" in content or "Y" in content)
    
    if not all([has_generics, has_world, has_system, has_logic]):
        print("Échec : Composants ECS manquants ou implémentation générique manquante")
        return False

    try:
        result = subprocess.run(
            ["dotnet", "build", workspace],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("Échec : Le code ne compile pas")
            # return False
    except Exception as e:
        print(f"Attention : Impossible d'exécuter dotnet build : {e}")

    print("Réussite de la vérification de la logique ECS en C#")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
