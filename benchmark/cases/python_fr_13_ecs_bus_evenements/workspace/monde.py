class Monde:
    def __init__(self, bus_evenements):
        self.entites = {}
        self.bus_evenements = bus_evenements
        self.prochain_id = 1

    def creer_entite(self):
        eid = self.prochain_id
        self.prochain_id += 1
        self.entites[eid] = {}
        return eid

    def ajouter_composant(self, eid, composant):
        type_comp = type(composant).__name__
        self.entites[eid][type_comp] = composant
