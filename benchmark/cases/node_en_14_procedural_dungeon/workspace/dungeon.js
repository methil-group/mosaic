/**
 * Procedural Dungeon Generator - Random Walk or BSP
 */

class Dungeon {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = Array(height).fill(null).map(() => Array(width).fill('#')); // '#' is wall, '.' is floor
    }

    generate() {
        // TODO: Implement procedural generation logic
    }

    getGrid() {
        return this.grid;
    }
}

module.exports = { Dungeon };
