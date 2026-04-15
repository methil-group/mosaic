const World = require('./World');
const EntityFactory = require('./EntityFactory');
const levelData = require('./level.json');

const world = new World();

console.log("Loading level data...");
// TASK: Load entities from levelData.entities using the EntityFactory
// ...

console.log(`Entities in world: ${world.entities.size}`);
const sprites = world.getEntitiesWith(['Sprite']);
console.log(`Found ${sprites.length} sprites.`);
