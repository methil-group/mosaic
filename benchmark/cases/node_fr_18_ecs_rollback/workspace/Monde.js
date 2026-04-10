const StockageComposants = require('./StockageComposants');

class Monde {
    constructor() {
        this.stockage = new StockageComposants();
    }

    ajouterComposant(entiteId, nom, donnees) {
        this.stockage.definir(entiteId, nom, donnees);
    }
}

module.exports = Monde;
