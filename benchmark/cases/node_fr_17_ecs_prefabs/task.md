# Tâche : Système de Prefabs ECS avec Surcharges

Dans ce projet Node.js multi-fichiers, votre objectif est d'implémenter un `GestionnairePrefabs` capable d'instancier des entités à partir de modèles tout en permettant la surcharge de propriétés.

## Exigences :
1. **`GestionnairePrefabs.js`** :
   - Implémentez `instancier(nom, surcharges)`.
   - Il doit trouver les données du prefab par son `nom` dans `this.prefabs`.
   - Il doit créer une nouvelle instance d' `Entite`.
   - Pour chaque composant du prefab, il doit l'ajouter à l'entité.
   - **IMPORTANT** : Si un objet `surcharges` contient des données pour un composant, celles-ci doivent être fusionnées avec (ou remplacer) les données par défaut du prefab.
2. **`app.js`** :
   - Instanciez un "Orc" en utilisant le prefab "Orc".
   - Fournissez une surcharge pour le composant `Stats` afin de régler la `force` à `50`.
3. **Immuabilité** : Assurez-vous que l'instanciation d'un prefab avec des surcharges ne modifie pas le prefab original stocké dans le gestionnaire.

## Fichiers :
- `Entite.js` : Classe d'entité de base.
- `GestionnairePrefabs.js` : À compléter.
- `prefabs/orc.json` : Définition du prefab.
- `app.js` : Point d'entrée à compléter.
