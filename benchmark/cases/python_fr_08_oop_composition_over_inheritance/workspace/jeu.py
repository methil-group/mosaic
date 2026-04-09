class Personnage:
    """
    Une classe géante qui fait trop de choses.
    Refactorisez-la pour utiliser la COMPOSITION plutôt que tout mettre dans une seule classe.
    """
    def __init__(self, nom):
        self.nom = nom
        self.points_de_vie = 100
        self.position_x = 0
        self.position_y = 0

    def deplacer(self, dx, dy):
        self.position_x += dx
        self.position_y += dy

    def attaquer(self, cible):
        print(f"{self.nom} attaque {cible}")

# TÂCHE : Séparez les comportements dans des classes distinctes (ex: Mouvement, Combat)
# et composez la classe Personnage avec ces instances.
