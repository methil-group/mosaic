# Tâche : Implémenter une grille de hachage spatial en Python

Dans `spatial_hash.py`, implémentez les méthodes pour un système de hachage spatial de base utilisé pour une détection de collision efficace.

## Exigences :
1. **`inserer(id_entite, position)`** :
   - Calculez la clé de cellule pour la position `(x, y)` donnée.
   - Ajoutez l' `id_entite` à la liste des entités dans cette cellule.
2. **`requete(position)`** :
   - Calculez la clé de cellule pour la position `(x, y)` donnée.
   - Retournez tous les `id_entite`s présents dans cette cellule ET les 8 cellules voisines environnantes.
3. **`retirer(id_entite, position)`** :
   - Supprimez l' `id_entite` de la cellule spécifique associée à la `position`.
4. **Efficacité** : Utilisez un dictionnaire pour stocker les cellules de la grille efficacement.
