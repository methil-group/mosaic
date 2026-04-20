class Mouvement:
    """
    Gère les déplacements et la position d'un personnage.
    Utilise la composition pour séparer le comportement de mouvement.
    """

    def __init__(self, position_x=0, position_y=0):
        self.position_x = position_x
        self.position_y = position_y

    def deplacer(self, dx, dy):
        self.position_x += dx
        self.position_y += dy
        return self.position_x, self.position_y


class Combat:
    """
    Gère les actions de combat d'un personnage.
    Utilise la composition pour séparer le comportement de combat.
    """

    def attaquer(self, cible):
        print(f"{cible} attaque {cible}")


class Personnage:
    """
    Une classe qui utilise la COMPOSITION plutôt que l'héritage.
    Elle compose des instances de Mouvement et Combat pour gérer ses comportements.
    """

    def __init__(self, nom):
        self.nom = nom
        # Utilisation de la composition : on crée des instances et on les stocke
        self.mouvement = Mouvement()
        self.combat = Combat()
        self.points_de_vie = 100

    def deplacer(self, dx, dy):
        """
        Délégué à l'instance Mouvement.
        """
        return self.mouvement.deplacer(dx, dy)

    def attaquer(self, cible):
        """
        Délégué à l'instance Combat.
        Note : Le comportement a été mis à jour pour être plus logique
        (le personnage attaque SA cible).
        """
        self.combat.attaquer(cible)
