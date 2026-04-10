# Tâche : Snapshot d'État Global ECS & Rollback

Dans ce projet Node.js multi-fichiers, votre objectif est d'implémenter un `GestionnaireSnapshots` capable de sauvegarder et restaurer l'état du `Monde` ECS.

## Exigences :
1. **`GestionnaireSnapshots.js`** :
   - Implémentez `prendreSnapshot(etiquette)` : Cela doit créer une copie profonde du `monde.stockage` et la sauvegarder associée à l' `etiquette` donnée.
   - Implémentez `restaurer(etiquette)` : Cela doit restaurer le `monde.stockage` à l'état exact où il se trouvait lors de la prise du snapshot avec l' `etiquette` donnée.
2. **Copie Profonde** : Assurez-vous que la modification du monde après la prise d'un snapshot n'affecte pas les données du snapshot sauvegardé.
3. **Modularité** : Utilisez `require` et `module.exports` correctement.

## Fichiers :
- `StockageComposants.js` : Classe spécialisée pour le stockage et le clonage des données de composants.
- `Monde.js` : Conteneur de base pour le stockage de composants.
- `GestionnaireSnapshots.js` : À compléter avec la logique de snapshot/restauration.
- `app.js` : Point d'entrée pour tester la fonctionnalité de restauration.
