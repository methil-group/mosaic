class CompteBancaire:
    def __init__(self, titulaire, solde_initial):
        self.titulaire = titulaire
        self._solde = solde_initial
        self.transactions = []

    # TÂCHE :
    # 1. Empêcher l'accès direct à _solde (utilisez une property).
    # 2. Implémenter une méthode deposer(montant) qui vérifie que le montant est positif.
    # 3. Implémenter une méthode retirer(montant) qui vérifie que le solde est suffisant.
    # 4. Ajouter chaque opération à la liste self.transactions.
