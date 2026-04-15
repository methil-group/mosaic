# Tâche : Synchronisation ECS & Three.js

Dans `app.js`, implémentez un `SystemeRendu` qui synchronise l'état ECS avec les maillages Three.js.

## Exigences :
- La fonction `SystemeRendu(monde)` doit :
    - Itérer sur les entités possédant à la fois les composants `Transformation` et `Maillage`.
    - Copier les coordonnées de `Transformation.position` (x, y, z) vers la propriété `threeMesh.position` du composant `Maillage`.
- Assurez-vous que la synchronisation est efficace et gère les axes X, Y et Z.

## Note :
- Vous n'avez pas besoin d'implémenter toute la logique du `Monde`, seulement le `SystemeRendu` tel qu'éfini.
