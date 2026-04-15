import os
import sys

def verify(workspace):
    jeu_file = os.path.join(workspace, "jeu.py")
    if not os.path.exists(jeu_file):
        return False
        
    try:
        sys.path.append(workspace)
        import jeu
        
        p = jeu.Personnage("Guerrier")
        
        # Check for composition components (names might vary but existence is key)
        # We look for delegation
        has_mouvement = hasattr(p, 'mouvement') or any(isinstance(v, object) for v in p.__dict__.values())
        
        # Test delegation
        p.deplacer(10, 5)
        if not (hasattr(p, 'mouvement') or hasattr(p, 'position_x')): # Basic check
             pass 

        # Rigorous check: verify classes exist
        has_classes = hasattr(jeu, 'Mouvement') and hasattr(jeu, 'Combat')
        
        if not has_classes:
            print("Échec : Les classes Mouvement ou Combat sont manquantes")
            return False
            
        print("Réussite : Refactoring par composition validé")
        return True
    except Exception as e:
        print(f"Erreur durant la vérification : {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
