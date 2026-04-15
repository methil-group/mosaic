class SystemeUI:
    def __init__(self, bus_evenements):
        self.bus_evenements = bus_evenements
        self.journaux = []
        # TÂCHE : S'abonner à l'événement "DegatsSubis"
        # Utiliser sur_degats_subis comme auditeur.

    def sur_degats_subis(self, donnees):
        msg = f"Alerte UI : Entité {donnees['id_entite']} blessée de {donnees['degats']}"
        self.journaux.append(msg)
        print(msg)
