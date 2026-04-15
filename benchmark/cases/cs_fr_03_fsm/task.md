# Tâche : Machine à états finis pour une IA en C#

Implémentez une machine à états finis (FSM) dans `Program.cs` pour contrôler le comportement d'un ennemi.

## Exigences :
1. **États** : implémentez la logique pour `Repos`, `Patrouille` et `Chasse`.
2. **Transitions** :
   - `Repos` -> `Patrouille` après un délai de temps simulé.
   - `Patrouille` -> `Chasse` si la distance par rapport au joueur est inférieure à `5.0f`.
   - `Chasse` -> `Patrouille` si la distance est supérieure à `10.0f`.
3. **Comportement** :
   - Chaque état doit avoir une méthode `MettreAJour()`.
   - Utilisez une propriété `EtatActuel` pour gérer l'état actif.
   - Utilisez le Polymorphisme (Pattern State) OU une approche propre basée sur un Switch.
