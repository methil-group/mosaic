class Entite:
    def __init__(self, id, registre):
        self.id = id
        self.registre = registre
        self.composants = {}

    def ajouter_composant(self, composant):
        type_comp = type(composant).__name__
        self.composants[type_comp] = composant
        # Notifier le registre de l'ajout
        self.registre._sur_composant_ajoute(self, composant)

    def retirer_composant(self, nom_type_comp):
        if nom_type_comp in self.composants:
            composant = self.composants.pop(nom_type_comp)
            # Notifier le registre du retrait
            self.registre._sur_composant_retire(self, composant)
