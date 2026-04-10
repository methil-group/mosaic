# Tâche : Implémenter un Quadtree en JavaScript

Dans `quadtree.js`, implémentez un système de partitionnement spatial Quadtree récursif.

## Exigences :
1. **`subdiviser()`** : Créez 4 Quadtrees enfants (Nord-Ouest, Nord-Est, Sud-Ouest, Sud-Est) couvrant la limite divisée.
2. **`inserer(point)`** :
   - Ajoutez le point seulement s'il est dans la limite.
   - Si la capacité est atteinte et n'est pas divisée, appelez `subdiviser()`.
   - Si divisé, insérez récursivement dans les enfants appropriés.
3. **`requete(zone, trouves)`** :
   - Vérifiez si la limite intersecte la zone de recherche.
   - Ajoutez tous les points dans la zone au tableau `trouves`.
   - Si divisé, demandez récursivement aux enfants.
4. **Logique** : La vérification de limite doit utiliser les coordonnées `x, y, w, h`.
