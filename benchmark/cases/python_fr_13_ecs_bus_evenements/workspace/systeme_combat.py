class SystemeCombat:
    def __init__(self, monde, bus_evenements):
        self.monde = monde
        self.bus_evenements = bus_evenements

    def infliger_degats(self, id_entite, degats):
        print(f"L'entité {id_entite} a subi {degats} dégâts.")
        # TÂCHE : Publier un événement "DegatsSubis" sur le bus d'événements
        # Inclure id_entite et degats dans les données.
