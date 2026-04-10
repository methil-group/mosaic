# Task: ECS Global State Snapshot & Rollback

In this multi-file Node.js project, your goal is to implement a `SnapshotManager` that can save and restore the state of the ECS `World`.

## Requirements:
1. **`SnapshotManager.js`**:
   - Implement `takeSnapshot(tag)`: This should create a deep copy of the `world.store` and save it associated with the given `tag`.
   - Implement `rollback(tag)`: This should restore the `world.store` to the exact state it was in when the snapshot with the given `tag` was taken.
2. **Deep Copy**: Ensure that modifying the world after taking a snapshot does not affect the saved snapshot data.
3. **Modularity**: Use `require` and `module.exports` correctly.

## Files:
- `ComponentStore.js`: A specialized class for storing and cloning component data.
- `World.js`: Core container for the component store.
- `SnapshotManager.js`: To be completed with the snapshot/rollback logic.
- `app.js`: Entry point to test the rollback functionality.
