/**
 * Générateur de Donjon Procédural - Random Walk ou BSP
 */

class Donjon {
    constructor(largeur, hauteur) {
        this.largeur = largeur;
        this.hauteur = hauteur;
        this.grille = Array(hauteur).fill(null).map(() => Array(largeur).fill('#')); // '#' mur, '.' sol
    }

    generer() {
        // TÂCHE : Implémenter la logique de génération procédurale
    }

    obtenirGrille() {
        return this.grille;
    }
}

module.exports = { Donjon };
