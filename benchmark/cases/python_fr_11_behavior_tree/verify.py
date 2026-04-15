import os
import sys

def verify(workspace):
    bt_file = os.path.join(workspace, "behavior_tree.py")
    if not os.path.exists(bt_file):
        return False
        
    with open(bt_file, "r") as f:
        content = f.read()
        
    # Check for core BT logic (French version)
    has_sequence = "class Sequence" in content and "ECHEC" in content and "SUCCES" in content
    has_selector = "class Selecteur" in content or "class Selector" in content or "Selecteur" in content
    has_logic = "for enfant in self.enfants" in content or "for" in content
    
    if all([has_sequence, has_selector, has_logic]):
        print("Réussite de la vérification de la logique de l'Arbre de Comportement")
        return True
    else:
        print("Échec : Noeuds d'Arbre de Comportement ou logique d'itération manquants")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
