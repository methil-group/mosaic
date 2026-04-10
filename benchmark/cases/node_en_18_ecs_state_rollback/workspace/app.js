const World = require('./World');
const SnapshotManager = require('./SnapshotManager');

const world = new World();
const snapshots = new SnapshotManager(world);

// Initial state
world.addComponent(1, "Position", { x: 0, y: 0 });
snapshots.takeSnapshot("initial");

// Move entity
console.log("Moving entity to (10, 10)...");
world.addComponent(1, "Position", { x: 10, y: 10 });

// Rollback
console.log("Rolling back to 'initial' state...");
snapshots.rollback("initial");

const pos = world.store.get(1, "Position");
if (pos && pos.x === 0 && pos.y === 0) {
    console.log("Success: Rollback successful.");
} else {
    console.log(`Failure: Position is (${pos?.x}, ${pos?.y}), expected (0, 0).`);
}
