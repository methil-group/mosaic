# Tâche : Encapsulation et Invariants

Dans `banque.py`, sécurisez la classe `CompteBancaire` pour garantir l'intégrité des données.

Exigences :
- Utilisez le décorateur `@property` pour `solde`.
- La méthode `deposer(montant)` doit lever une `ValueError` si le montant est <= 0.
- La méthode `retirer(montant)` doit lever une `ValueError` si le solde est insuffisant ou si le montant est <= 0.
- Chaque transaction réussie doit être ajoutée à `self.transactions` sous forme de chaîne (ex: "Depot: 100").
