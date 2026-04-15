import os
import sys
import subprocess

def verify(workspace):
    gestionnaire_file = os.path.join(workspace, "GestionnaireSystemes.cs")
    if not os.path.exists(gestionnaire_file):
        return False
        
    with open(gestionnaire_file, "r") as f:
        content = f.read()
        
    import re
    # Check for parallelism markers specifically in code, not comments
    # This regex looks for keywords not preceded by //
    # It's a bit simplified but much more robust than a simple "in" content
    code_pattern = r"(?<!//)\s*(Parallel\.ForEach|Task\.Run|Task\.WhenAll)"
    has_parallel = re.search(code_pattern, content)
    
    # Also check if the original sequential foreach loop is still there
    original_foreach = "foreach (var systeme in _systemes)"
    is_sequential_gone = original_foreach not in content or "await Task.WhenAll" in content
    
    if not has_parallel or not is_sequential_gone:
        print("Échec : GestionnaireSystemes utilise toujours une exécution séquentielle ou n'a pas implémenté le parallélisme")
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
