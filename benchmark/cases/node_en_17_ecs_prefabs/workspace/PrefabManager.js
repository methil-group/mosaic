const Entity = require('./Entity');

class PrefabManager {
    constructor() {
        this.prefabs = new Map();
        this.nextId = 1;
    }

    registerPrefab(name, data) {
        this.prefabs.set(name, data);
    }

    instantiate(name, overrides = {}) {
        // TODO: Implement instantiation logic
        // 1. Get the prefab data by name
        // 2. Create a new Entity
        // 3. For each component in prefab, add it to entity
        // 4. If overrides contain component data, merge it with the prefab data
        return null;
    }
}

module.exports = PrefabManager;
