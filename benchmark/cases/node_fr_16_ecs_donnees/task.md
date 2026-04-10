# Tâche : Chargement ECS Data-Driven

Dans ce projet multi-fichiers, votre objectif est d'implémenter une fabrique qui instancie des entités à partir d'un descripteur JSON.

## Exigences :
1. **`FabriqueEntite.js`** :
   - Implémentez `creerDepuisDonnees(monde, donnees)`.
   - Elle doit créer une nouvelle entité dans le `monde`.
   - Elle doit itérer sur l'objet `donnees.composants`.
   - Pour chaque type de composant (ex: "Position", "Sprite", "Sante"), elle doit instancier la classe correspondante de `Composants.js` avec les données fournies et l'ajouter à l'entité dans le monde.
2. **`app.js`** :
   - Utilisez la `FabriqueEntite` pour charger toutes les entités définies dans `niveau.json`.
3. **Modularité** : Assurez-vous d'utiliser `require` correctement pour accéder aux classes nécessaires à travers les fichiers.

## Fichiers :
- `Monde.js` : Logique de base du monde ECS.
- `Composants.js` : Définition de Position, Sprite et Sante.
- `FabriqueEntite.js` : À compléter.
- `niveau.json` : Source de données.
- `app.js` : Point d'entrée à compléter.
