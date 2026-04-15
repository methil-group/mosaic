class HachageSpatial:
    def __init__(self, taille_cellule):
        self.taille_cellule = taille_cellule
        self.grille = {}

    def _obtenir_cle(self, position):
        x, y = position
        return (int(x // self.taille_cellule), int(y // self.taille_cellule))

    def inserer(self, id_entite, position):
        # TÂCHE : Implémenter l'insertion
        pass

    def requete(self, position):
        # TÂCHE : Implémenter la requête pour les entités proches
        return []

    def retirer(self, id_entite, position):
        # TÂCHE : Implémenter la suppression
        pass
