const Entite = require('./Entite');

class GestionnairePrefabs {
    constructor() {
        this.prefabs = new Map();
        this.prochainID = 1;
    }

    enregistrerPrefab(nom, donnees) {
        this.prefabs.set(nom, donnees);
    }

    instancier(nom, surcharges = {}) {
        // TÂCHE : Implémenter la logique d'instanciation
        // 1. Récupérer les données du prefab par son nom
        // 2. Créer une nouvelle Entite
        // 3. Pour chaque composant dans le prefab, l'ajouter à l'entité
        // 4. Si les surcharges contiennent des données de composant, les fusionner avec les données du prefab
        return null;
    }
}

module.exports = GestionnairePrefabs;
