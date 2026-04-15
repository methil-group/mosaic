class World {
    constructor() {
        this.entities = new Map(); // ID -> Set of components
        this.nextId = 1;
    }

    createEntity() {
        const id = this.nextId++;
        this.entities.set(id, new Map());
        return id;
    }

    addComponent(entityId, component) {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.set(component.constructor.name, component);
        }
    }

    getEntitiesWith(componentNames) {
        const results = [];
        for (const [id, components] of this.entities) {
            if (componentNames.every(name => components.has(name))) {
                results.push({ id, components });
            }
        }
        return results;
    }
}

module.exports = World;
