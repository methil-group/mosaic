class Entite {
    constructor(id) {
        this.id = id;
        this.composants = new Map();
    }

    ajouterComposant(nom, donnees) {
        this.composants.set(nom, { ...donnees });
    }

    obtenirComposant(nom) {
        return this.composants.get(nom);
    }
}

module.exports = Entite;
