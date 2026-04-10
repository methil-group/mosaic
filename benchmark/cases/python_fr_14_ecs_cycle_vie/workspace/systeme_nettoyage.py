class SystemeNettoyage:
    def __init__(self, registre):
        self.registre = registre
        self.compteur_nettoye = 0
        # Enregistrer les hooks
        self.registre.ajouter_hook("sur_retrait", self.sur_composant_retire)

    def sur_composant_retire(self, entite, composant):
        print(f"Système Nettoyage : Composant {type(composant).__name__} retiré de l'entité {entite.id}")
        self.compteur_nettoye += 1
