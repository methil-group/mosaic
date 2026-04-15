# Task: ECS Prefab System with Overrides

In this multi-file Node.js project, your goal is to implement a `PrefabManager` that can instantiate entities from templates while allowing property overrides.

## Requirements:
1. **`PrefabManager.js`**:
   - Implement `instantiate(name, overrides)`.
   - It should find the prefab data by `name` in `this.prefabs`.
   - It should create a new `Entity` instance.
   - For every component in the prefab, it should add it to the entity.
   - **IMPORTANT**: If an `overrides` object contains data for a component, it should be merged with (or replace) the prefab's default data.
2. **`app.js`**:
   - Instantiate an "Orc" using the "Orc" prefab.
   - Provide an override for the `Stats` component to set `strength` to `50`.
3. **Immutability**: Ensure that instantiating a prefab with overrides doesn't modify the original prefab stored in the manager.

## Files:
- `Entity.js`: Basic entity class.
- `PrefabManager.js`: To be completed.
- `prefabs/orc.json`: Prefab definition.
- `app.js`: Entry point to be completed.
