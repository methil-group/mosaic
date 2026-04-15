class Position {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

class Sprite {
    constructor(texture = "rien") {
        this.texture = texture;
    }
}

class Sante {
    constructor(max = 100) {
        this.actuelle = max;
        this.max = max;
    }
}

module.exports = { Position, Sprite, Sante };
