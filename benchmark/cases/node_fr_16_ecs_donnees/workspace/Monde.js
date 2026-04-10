class Monde {
    constructor() {
        this.entites = new Map(); // ID -> Set de composants
        this.prochainID = 1;
    }

    creerEntite() {
        const id = this.prochainID++;
        this.entites.set(id, new Map());
        return id;
    }

    ajouterComposant(entiteID, composant) {
        const entite = this.entites.get(entiteID);
        if (entite) {
            entite.set(composant.constructor.name, composant);
        }
    }

    obtenirEntitesAvec(nomsComposants) {
        const resultats = [];
        for (const [id, composants] of this.entites) {
            if (nomsComposants.every(nom => composants.has(nom))) {
                resultats.push({ id, composants });
            }
        }
        return resultats;
    }
}

module.exports = Monde;
