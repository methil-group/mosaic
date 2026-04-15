# Tâche : Recherche de chemin A* pondérée

Implémentez un algorithme A* pondéré dans `astar.py`.

Exigences :
- La `grille` contient le coût de déplacement pour chaque cellule.
- Une valeur de `1.0` est une cellule normale, tandis que des valeurs plus élevées représentent un terrain difficile.
- Une valeur de `inf` est un obstacle.
- Le chemin doit minimiser le coût cumulé total des cellules visitées.
- Utilisez la distance de Manhattan comme heuristique.
- Supportez le déplacement dans 4 directions.
