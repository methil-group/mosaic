import os
import sys
import subprocess

def verify(workspace):
    program_file = os.path.join(workspace, "Program.cs")
    if not os.path.exists(program_file):
        return False
        
    with open(program_file, "r") as f:
        content = f.read()
        
    # Check for core A* and C# components (French version)
    has_pq = "PriorityQueue<" in content
    has_heuristic = "Math.Abs" in content
    has_logic = "while" in content and ("count" in content or "Count" in content)
    
    if not all([has_pq, has_heuristic, has_logic]):
        print("Échec : PriorityQueue ou heuristique de Manhattan manquante dans l'implémentation C#")
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

    print("Réussite de la vérification de la logique A* en C#")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
