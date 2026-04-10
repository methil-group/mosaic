# Tâche : Implémenter la collision AABB en JavaScript

Dans `physics.js`, implémentez la logique pour la détection de collision Axis-Aligned Bounding Box (AABB) et une résolution simple.

## Exigences :
1. **`verifierCollision(rectA, rectB)`** :
   - Retourne `true` si les deux rectangles se chevauchent, `false` sinon.
   - Utilisez la méthode `obtenirLimites()` pour obtenir les coordonnées.
2. **`resoudreCollision(rectA, rectB)`** :
   - Si une collision est détectée, ajustez la position de `rectA` pour qu'il ne chevauche plus `rectB`.
   - Utilisez une résolution simple de "poussée" le long de l'axe de moindre pénétration.
3. **Logique** : Supportez les vérifications de chevauchement sur les axes X et Y.
