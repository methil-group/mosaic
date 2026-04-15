from registre import Registre
from systeme_nettoyage import SystemeNettoyage

class Sante: pass
class Position: pass

registre = Registre()
nettoyeur = SystemeNettoyage(registre)

e = registre.creer_entite()
print("Ajout du composant Sante...")
e.ajouter_composant(Sante())

print("Retrait du composant Sante...")
e.retirer_composant("Sante")

print(f"Composants nettoyés : {nettoyeur.compteur_nettoye}")
if nettoyeur.compteur_nettoye == 1:
    print("Succès : Les hooks du registre ont été déclenchés correctement.")
else:
    print("Échec : Les hooks du registre n'ont pas été déclenchés.")
