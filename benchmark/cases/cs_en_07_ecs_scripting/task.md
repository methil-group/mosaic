# Task: Script Component Integration in C#

In this multi-file C# project, your goal is to implement an `UpdateLoop` that executes behaviors defined in `ScriptComponent`s.

## Requirements:
1. **`UpdateLoop.cs`**:
   - Implement the `Run(List<Entity> entities)` method.
   - It should iterate through all provided `entities`.
   - For each entity, find any `ScriptComponent` in its `Components` list. (Hint: Use `OfType<ScriptComponent>()`).
   - For every `ScriptComponent` found, invoke its `OnUpdate` action, passing the current `Entity` as the argument.
2. **Safety**: Ensure you check if `OnUpdate` is not null before invoking it.
3. **Modularity**: Respect the `ScriptingEcs` namespace.

## Files:
- `Entity.cs`: Basic entity class with a list of components.
- `ScriptComponent.cs`: Component holding a delegate behavior.
- `UpdateLoop.cs`: To be completed with the execution logic.
- `Program.cs`: Entry point that creates a scripted entity and runs the loop.
