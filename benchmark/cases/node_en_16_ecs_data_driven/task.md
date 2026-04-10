# Task: Data-Driven ECS Loading

In this multi-file project, your goal is to implement a factory that instantiates entities from a JSON descriptor.

## Requirements:
1. **`EntityFactory.js`**:
   - Implement `createFromData(world, data)`.
   - It should create a new entity in the `world`.
   - It should iterate through the `data.components` object.
   - For each component type (e.g., "Position", "Sprite", "Health"), it should instantiate the corresponding class from `Components.js` with the provided data and add it to the entity in the world.
2. **`app.js`**:
   - Use the `EntityFactory` to load all entities defined in `level.json`.
3. **Modularity**: Ensure you use `require` correctly to access the necessary classes across files.

## Files:
- `World.js`: Core ECS world logic.
- `Components.js`: Defininiton of Position, Sprite, and Health.
- `EntityFactory.js`: To be completed.
- `level.json`: Data source.
- `app.js`: Entry point to be completed.
