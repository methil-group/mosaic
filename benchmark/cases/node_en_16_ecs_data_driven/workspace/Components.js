class Position {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

class Sprite {
    constructor(texture = "none") {
        this.texture = texture;
    }
}

class Health {
    constructor(max = 100) {
        this.current = max;
        this.max = max;
    }
}

module.exports = { Position, Sprite, Health };
