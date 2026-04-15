import os
import sys

def verify(workspace):
    banque_file = os.path.join(workspace, "banque.py")
    if not os.path.exists(banque_file):
        return False
        
    try:
        sys.path.append(workspace)
        import banque
        
        c = banque.CompteBancaire("Alice", 100)
        
        # Test property
        if c.solde != 100:
            print("Échec : La propriété solde est incorrecte")
            return False
            
        # Test deposit
        c.deposer(50)
        if c.solde != 150 or "Depot" not in c.transactions[0]:
            print("Échec : Le dépôt ne fonctionne pas correctement")
            return False
            
        # Test withdrawal error
        try:
            c.retirer(200)
            print("Échec : Devrait lever ValueError pour solde insuffisant")
            return False
        except ValueError:
            pass
            
        # Test negative deposit error
        try:
            c.deposer(-10)
            print("Échec : Devrait lever ValueError pour montant négatif")
            return False
        except ValueError:
            pass
            
        print("Réussite : Encapsulation et invariants validés")
        return True
    except Exception as e:
        print(f"Erreur durant la vérification : {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
