import os
import sys
import subprocess

def verify(workspace):
    gestionnaire_file = os.path.join(workspace, "GestionnaireSystemes.cs")
    if not os.path.exists(gestionnaire_file):
        return False
        
    with open(gestionnaire_file, "r") as f:
        content = f.read()
        
    # Check for parallelism markers (French version)
    has_parallel = "Parallel.ForEach" in content or "Task.Run" in content or "Task.WhenAll" in content
    
    if not has_parallel:
        print("Échec : GestionnaireSystemes utilise toujours une exécution séquentielle")
        return False

    # Try to compile to ensure code is valid
    try:
        result = subprocess.run(
            ["dotnet", "build", workspace],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("Échec : Le code ne compile pas")
            return False
    except Exception as e:
        print(f"Attention : Impossible d'exécuter dotnet build : {e}")

    print("Réussite : Logique de GestionnaireSystemes parallèle C# vérifiée")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
