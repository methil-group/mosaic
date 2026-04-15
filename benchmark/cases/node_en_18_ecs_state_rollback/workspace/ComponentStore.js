class ComponentStore {
    constructor() {
        this.stores = new Map(); // ComponentName -> Map(EntityID -> Data)
    }

    set(entityId, componentName, data) {
        if (!this.stores.has(componentName)) {
            this.stores.set(componentName, new Map());
        }
        this.stores.get(componentName).set(entityId, { ...data });
    }

    get(entityId, componentName) {
        return this.stores.get(componentName)?.get(entityId);
    }
    
    clone() {
        const NewStore = new ComponentStore();
        for (const [name, map] of this.stores) {
            NewStore.stores.set(name, new Map(JSON.parse(JSON.stringify(Array.from(map)))));
        }
        return NewStore;
    }
}

module.exports = ComponentStore;
