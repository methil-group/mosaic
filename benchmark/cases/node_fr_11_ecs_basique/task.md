# Tâche : Implémenter un système ECS basique

Dans `ecs.js`, complétez la classe `Monde` et implémentez un `SystemeMouvement`.

## Exigences :
- `creerEntite()` : Doit retourner un ID unique et l'ajouter à `this.entites`.
- `ajouterComposant(entiteID, composant)` : Doit stocker le composant dans `this.composants` groupé par le nom de son constructeur.
- `ajouterSysteme(systeme)` : Ajouter une fonction système à `this.systemes`.
- `mettreAJour(dt)` : Exécuter tous les systèmes.
- Créer une fonction `SystemeMouvement(monde, dt)` :
    - Elle doit itérer sur toutes les entités possédant à la fois les composants `Position` et `Velocite`.
    - Elle doit mettre à jour `position.x += velocite.vx * dt` et `position.y += velocite.vy * dt`.

## Notes :
- Assurez-vous que le système est correctement ajouté au monde pour être exécuté lors de `mettreAJour`.
