# Task: Component Tagging & Targeting System in C#

In this multi-file C# project, your goal is to implement a `TargetingSystem` that uses empty "Tag" components for efficient entity filtering.

## Requirements:
1. **`TargetingSystem.cs`**:
   - Implement the `FindValidTargets(Registry registry)` method.
   - It must iterate through all entities in the `registry`.
   - A target is considered **VALID** only if:
     - It has the `IsEnemy` tag.
     - It has the `InView` tag.
     - It **DOES NOT** have the `IsActive` tag.
2. **Filtering Efficiency**: Use `registry.HasComponent<T>()` to check for tags.

## Files:
- `Registry.cs`: ECS Registry handling entity and component storage.
- `Tags.cs`: Empty structs used as tags (`IsEnemy`, `IsActive`, `InView`).
- `Components.cs`: Data components (`Position`, `Name`).
- `TargetingSystem.cs`: To be completed with the filtering logic.
- `Program.cs`: Entry point creating entities with various tag combinations.
