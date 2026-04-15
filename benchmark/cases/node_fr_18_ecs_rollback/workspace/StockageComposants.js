class StockageComposants {
    constructor() {
        this.stockages = new Map(); // NomComposant -> Map(EntiteID -> Donnees)
    }

    definir(entiteId, nomComposant, donnees) {
        if (!this.stockages.has(nomComposant)) {
            this.stockages.set(nomComposant, new Map());
        }
        this.stockages.get(nomComposant).set(entiteId, { ...donnees });
    }

    obtenir(entiteId, nomComposant) {
        return this.stockages.get(nomComposant)?.get(entiteId);
    }
    
    cloner() {
        const nouveauStockage = new StockageComposants();
        for (const [nom, map] of this.stockages) {
            nouveauStockage.stockages.set(nom, new Map(JSON.parse(JSON.stringify(Array.from(map)))));
        }
        return nouveauStockage;
    }
}

module.exports = StockageComposants;
