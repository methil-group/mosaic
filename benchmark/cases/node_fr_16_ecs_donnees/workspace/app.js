const Monde = require('./Monde');
const FabriqueEntite = require('./FabriqueEntite');
const donneesNiveau = require('./niveau.json');

const monde = new Monde();

console.log("Chargement des données du niveau...");
// TÂCHE : Charger les entités à partir de donneesNiveau.entites en utilisant la FabriqueEntite
// ...

console.log(`Entités dans le monde : ${monde.entites.size}`);
const sprites = monde.obtenirEntitesAvec(['Sprite']);
console.log(`Trouvé ${sprites.length} sprites.`);
