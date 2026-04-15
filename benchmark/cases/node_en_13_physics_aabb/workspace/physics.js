/**
 * Basic 2D Physics - AABB Collision Detection and Resolution
 */

class Rectangle {
    constructor(x, y, width, height) {
        this.position = { x, y };
        this.size = { width, height };
        this.velocity = { x: 0, y: 0 };
    }

    getBounds() {
        return {
            left: this.position.x,
            right: this.position.x + this.size.width,
            top: this.position.y,
            bottom: this.position.y + this.size.height
        };
    }
}

function checkCollision(rectA, rectB) {
    // TODO: Implement AABB collision check
    return false;
}

function resolveCollision(rectA, rectB) {
    // TODO: Implement simple position resolution
}

module.exports = { Rectangle, checkCollision, resolveCollision };
