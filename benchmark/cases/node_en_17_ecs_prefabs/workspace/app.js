const PrefabManager = require('./PrefabManager');
const orcData = require('./prefabs/orc.json');

const manager = new PrefabManager();
manager.registerPrefab("Orc", orcData);

console.log("Instantiating Orc...");
// TASK: Instantiate an Orc with specific overrides (e.g., strength = 50)
// const orc = manager.instantiate("Orc", { Stats: { strength: 50 } });

// if (orc && orc.getComponent("Stats").strength === 50) {
//     console.log("Success: Orc instantiated with correct overrides.");
// } else {
//     console.log("Failure: Overrides were not applied.");
// }
