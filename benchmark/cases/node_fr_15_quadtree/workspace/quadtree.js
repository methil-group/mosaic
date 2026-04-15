/**
 * Quadtree - Partitionnement spatial pour des points 2D
 */

class Quadtree {
    constructor(limite, capacite) {
        this.limite = limite; // { x, y, w, h }
        this.capacite = capacite;
        this.points = [];
        this.divise = false;
    }

    subdiviser() {
        // TÂCHE : Implémenter la subdivision en 4 quadrants
    }

    inserer(point) {
        // TÂCHE : Implémenter l'insertion récursive
        return false;
    }

    requete(zone, trouves) {
        // TÂCHE : Implémenter la requête récursive
        return trouves;
    }
}

module.exports = { Quadtree };
