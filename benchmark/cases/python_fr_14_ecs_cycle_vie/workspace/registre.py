from entite import Entite

class Registre:
    def __init__(self):
        self.entites = {}
        self.prochain_id = 1
        self.hooks = {"sur_ajout": [], "sur_retrait": []}

    def creer_entite(self):
        eid = self.prochain_id
        self.prochain_id += 1
        e = Entite(eid, self)
        self.entites[eid] = e
        return e

    def ajouter_hook(self, declencheur, rappel):
        if declencheur in self.hooks:
            self.hooks[declencheur].append(rappel)

    def _sur_composant_ajoute(self, entite, composant):
        # TÂCHE : Déclencher tous les hooks "sur_ajout"
        pass

    def _sur_composant_retire(self, entite, composant):
        # TÂCHE : Déclencher tous les hooks "sur_retrait"
        pass
