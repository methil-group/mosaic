const ComponentStore = require('./ComponentStore');

class World {
    constructor() {
        this.store = new ComponentStore();
    }

    addComponent(entityId, name, data) {
        this.store.set(entityId, name, data);
    }
}

module.exports = World;
