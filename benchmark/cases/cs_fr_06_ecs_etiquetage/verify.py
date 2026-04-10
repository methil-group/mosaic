import os
import sys
import subprocess

def verify(workspace):
    system_file = os.path.join(workspace, "SystemeCiblage.cs")
    if not os.path.exists(system_file):
        return False
        
    with open(system_file, "r") as f:
        content = f.read()
        
    # Check for tag filtering logic (French version)
    has_pos_checks = "PossedeComposant<EstEnnemi>" in content and "PossedeComposant<DansVue>" in content
    has_neg_check = "PossedeComposant<EstActif>" in content and "!" in content
    
    if not (has_pos_checks and has_neg_check):
        print("Échec : Logique de filtrage d'étiquettes positive ou négative manquante")
        return False

    # Run Program.cs to verify execution
    try:
        result = subprocess.run(
            ["dotnet", "run", "--project", workspace],
            capture_output=True,
            text=True
        )
        if "Trouvé 1 cibles valides" in result.stdout:
            print("Réussite : Logique d'étiquetage et de filtrage ECS vérifiée")
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
