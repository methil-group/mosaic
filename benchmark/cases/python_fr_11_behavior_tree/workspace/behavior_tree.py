import enum

class StatutNoeud(enum.Enum):
    SUCCES = 1
    ECHEC = 2
    EN_COURS = 3

class Noeud:
    def tick(self):
        raise NotImplementedError()

class Sequence(Noeud):
    def __init__(self, enfants):
        self.enfants = enfants
    
    def tick(self):
        # TÂCHE : Implémenter la logique de séquence (ET)
        return StatutNoeud.ECHEC

class Selecteur(Noeud):
    def __init__(self, enfants):
        self.enfants = enfants
    
    def tick(self):
        # TÂCHE : Implémenter la logique de sélecteur (OU)
        return StatutNoeud.ECHEC

class Action(Noeud):
    def __init__(self, nom, fonction):
        self.nom = nom
        self.fonction = fonction
    
    def tick(self):
        return self.fonction()
