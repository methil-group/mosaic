import os
import sys
import subprocess

def verify(workspace):
    bus_file = os.path.join(workspace, "bus_evenements.py")
    combat_file = os.path.join(workspace, "systeme_combat.py")
    ui_file = os.path.join(workspace, "systeme_ui.py")
    
    if not all([os.path.exists(bus_file), os.path.exists(combat_file), os.path.exists(ui_file)]):
        return False
        
    with open(bus_file, "r") as f: bus_content = f.read()
    with open(combat_file, "r") as f: combat_content = f.read()
    with open(ui_file, "r") as f: ui_content = f.read()
    
    # Check for correct logic specifically in code (no comments)
    import re
    has_publier = re.search(r"(?<!#)\s*for .* in .*auditeurs\[type_evenement\]", bus_content) or re.search(r"(?<!#)\s*auditeur\(donnees\)", bus_content)
    has_evenement = re.search(r"(?<!#)\s*publier\(.DegatsSubis.", combat_content)
    has_abonner = re.search(r"(?<!#)\s*s_abonner\(.DegatsSubis.", ui_content)
    
    if not (has_publier and has_evenement and has_abonner):
        print("Échec : Logique de bus d'événements ou intégration système manquante dans le code")
        return False

    # Run app.py to verify execution
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(workspace, "app.py")],
            capture_output=True,
            text=True
        )
        if "Réussite : Le système UI a reçu tous les événements de combat." in result.stdout:
            print("Réussite : Découplage du bus d'événements et logique de communication vérifiés")
            return True
        else:
            print(f"Échec : La sortie n'indique pas un succès : {result.stdout}")
            return False
    except Exception as e:
        print(f"Erreur lors de l'exécution : {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
