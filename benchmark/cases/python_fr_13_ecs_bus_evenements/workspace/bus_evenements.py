class BusEvenements:
    def __init__(self):
        self._auditeurs = {}

    def s_abonner(self, type_evenement, auditeur):
        if type_evenement not in self._auditeurs:
            self._auditeurs[type_evenement] = []
        self._auditeurs[type_evenement].append(auditeur)

    def publier(self, type_evenement, donnees):
        # TÂCHE : Implémenter la logique de publication pour notifier tous les abonnés
        pass
