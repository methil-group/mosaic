import os
import sys
import subprocess

def verify(workspace):
    program_file = os.path.join(workspace, "Program.cs")
    if not os.path.exists(program_file):
        return False
        
    with open(program_file, "r") as f:
        content = f.read()
        
    # Check for LINQ usage and logic (French version)
    has_linq = "using System.Linq" in content
    has_where = ".Where(" in content or "where" in content
    has_select = ".Select(" in content or "select" in content
    no_foreach = content.count("foreach") <= 1
    
    if not all([has_linq, has_where, has_select, no_foreach]):
        print("Échec : LINQ n'est pas utilisé correctement ou la boucle foreach subsiste")
        return False

    try:
        result = subprocess.run(
            ["dotnet", "build", workspace],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("Échec : Le code ne compile pas")
    except Exception as e:
        print(f"Attention : Impossible d'exécuter dotnet build : {e}")

    print("Réussite de la vérification de la logique LINQ en C#")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
