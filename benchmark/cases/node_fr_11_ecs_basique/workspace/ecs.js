/**
 * Entity Component System (ECS) - Implémentation de base
 */

class Monde {
    constructor() {
        this.prochainID = 0;
        this.entites = new Set();
        this.composants = new Map(); // Map<TypeComposant, Map<IDEntite, InstanceComposant>>
        this.systemes = [];
    }

    creerEntite() {
        // TÂCHE : Implémenter
    }

    ajouterComposant(entiteID, composant) {
        // TÂCHE : Implémenter
    }

    ajouterSysteme(systeme) {
        // TÂCHE : Implémenter
    }

    mettreAJour(dt) {
        // TÂCHE : Implémenter
    }
}

class Position {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

class Velocite {
    constructor(vx = 0, vy = 0) {
        this.vx = vx;
        this.vy = vy;
    }
}

module.exports = { Monde, Position, Velocite };
