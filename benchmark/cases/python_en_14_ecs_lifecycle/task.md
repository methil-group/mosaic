# Task: Entity Lifecycle Hooks in Python

In this multi-file Python project, your goal is to implement internal registry hooks that trigger when components are added or removed.

## Requirements:
1. **`registry.py`**:
   - Implement `_on_component_added(entity, component)`: It should iterate through all callbacks in `self.hooks["on_add"]` and call them with `(entity, component)`.
   - Implement `_on_component_removed(entity, component)`: It should iterate through all callbacks in `self.hooks["on_remove"]` and call them with `(entity, component)`.
2. **Hook System**: The hooks are already being called from `entity.py`, you just need to implement the dispatch logic in the `Registry`.
3. **Decoupling**: The registry should be able to support multiple observers (like the `CleaningSystem`) without knowing their specific types.

## Files:
- `entity.py`: Entity class that notifies the registry on changes.
- `registry.py`: ECS Registry to be completed with hook dispatch logic.
- `cleaning_system.py`: A system that registers a hook to clean up resources when components are removed.
- `app.py`: Entry point for simulation.
