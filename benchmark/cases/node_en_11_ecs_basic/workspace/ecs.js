/**
 * Entity Component System (ECS) - Basic Implementation
 */

class World {
    constructor() {
        this.nextEntityId = 0;
        this.entities = new Set();
        this.components = new Map(); // Map<ComponentType, Map<EntityId, ComponentInstance>>
        this.systems = [];
    }

    createEntity() {
        // TODO: Implement
    }

    addComponent(entityId, component) {
        // TODO: Implement
    }

    addSystem(system) {
        // TODO: Implement
    }

    update(dt) {
        // TODO: Implement
    }
}

class Position {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

class Velocity {
    constructor(vx = 0, vy = 0) {
        this.vx = vx;
        this.vy = vy;
    }
}

module.exports = { World, Position, Velocity };
