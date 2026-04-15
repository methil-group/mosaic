const Monde = require('./Monde');
const GestionnaireSnapshots = require('./GestionnaireSnapshots');

const monde = new Monde();
const snapshots = new GestionnaireSnapshots(monde);

// État initial
monde.ajouterComposant(1, "Position", { x: 0, y: 0 });
snapshots.prendreSnapshot("initial");

// Déplacement de l'entité
console.log("Déplacement de l'entité vers (10, 10)...");
monde.ajouterComposant(1, "Position", { x: 10, y: 10 });

// Restauration
console.log("Restauration de l'état 'initial'...");
snapshots.restaurer("initial");

const pos = monde.stockage.obtenir(1, "Position");
if (pos && pos.x === 0 && pos.y === 0) {
    console.log("Succès : Restauration réussie.");
} else {
    console.log(`Échec : La position est (${pos?.x}, ${pos?.y}), attendu (0, 0).`);
}
