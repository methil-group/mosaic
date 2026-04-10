import os
import sys
import subprocess

def verify(workspace):
    program_file = os.path.join(workspace, "Program.cs")
    if not os.path.exists(program_file):
        return False
        
    with open(program_file, "r") as f:
        content = f.read()
        
    # Check for FSM components (French version)
    has_states = "Repos" in content and "Patrouille" in content and "Chasse" in content
    has_logic = "distance" in content or "Distance" in content
    has_update = "MettreAJour" in content or "mettreAJour" in content
    
    if not all([has_states, has_logic, has_update]):
        print("Échec : États manquants ou logique de transition manquante dans l'implémentation FSM C#")
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

    print("Réussite de la vérification de la logique FSM en C#")
    return True

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
