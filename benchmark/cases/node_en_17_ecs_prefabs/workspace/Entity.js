class Entity {
    constructor(id) {
        this.id = id;
        this.components = new Map();
    }

    addComponent(name, data) {
        this.components.set(name, { ...data });
    }

    getComponent(name) {
        return this.components.get(name);
    }
}

module.exports = Entity;
