/**
 * Physique 2D de base - Détection et résolution de collision AABB
 */

class Rectangle {
    constructor(x, y, largeur, hauteur) {
        this.position = { x, y };
        this.taille = { largeur, hauteur };
        this.velocite = { x: 0, y: 0 };
    }

    obtenirLimites() {
        return {
            gauche: this.position.x,
            droite: this.position.x + this.taille.largeur,
            haut: this.position.y,
            bas: this.position.y + this.taille.hauteur
        };
    }
}

function verifierCollision(rectA, rectB) {
    // TÂCHE : Implémenter la vérification de collision AABB
    return false;
}

function resoudreCollision(rectA, rectB) {
    // TÂCHE : Implémenter une résolution simple de position
}

module.exports = { Rectangle, verifierCollision, resoudreCollision };
