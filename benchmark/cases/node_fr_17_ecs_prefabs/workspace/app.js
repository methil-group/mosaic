const GestionnairePrefabs = require('./GestionnairePrefabs');
const donneesOrc = require('./prefabs/orc.json');

const gestionnaire = new GestionnairePrefabs();
gestionnaire.enregistrerPrefab("Orc", donneesOrc);

console.log("Instanciation de l'Orc...");
// TÂCHE : Instancier un Orc avec des surcharges spécifiques (ex: force = 50)
// const orc = gestionnaire.instancier("Orc", { Stats: { force: 50 } });

// if (orc && orc.obtenirComposant("Stats").force === 50) {
//     console.log("Succès : Orc instancié avec les bonnes surcharges.");
// } else {
//     console.log("Échec : Les surcharges n'ont pas été appliquées.");
// }
