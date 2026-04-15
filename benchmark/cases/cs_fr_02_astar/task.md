# Tâche : A* optimisé en C#

Implémentez l'algorithme A* dans `Program.cs` pour trouver le chemin le plus court dans une grille d'entiers 2D.

## Exigences :
1. **Grille** : `0` est marchable, `1` est un obstacle.
2. **Plus court chemin** : Retournez une liste de `(int ligne, int col)` représentant le chemin.
3. **File de priorité optimisée** : Vous **DEVEZ** utiliser la classe intégrée `PriorityQueue<TElement, TPriority>` disponible dans .NET 6+.
4. **Heuristique** : Utilisez la distance de Manhattan.
5. **Mouvement** : Supportez le déplacement dans 4 directions (Haut, Bas, Gauche, Droite).
