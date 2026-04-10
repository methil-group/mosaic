# Task: Implement a Generic ECS in C#

Implement a basic Entity Component System (ECS) in `Program.cs`.

## Requirements:
1. **World Class**:
   - `CreateEntity()`: Returns a unique integer ID.
   - `AddComponent<T>(int entityId, T component)`: Attaches a component of type `T` to the entity.
   - `GetComponent<T>(int entityId)`: Retrieves the component of type `T`.
2. **Systems**:
   - Implement a `MovementSystem(World world, float dt)` that updates entities with `Position` and `Velocity` components.
   - `Position` should have `X`, `Y`.
   - `Velocity` should have `VX`, `VY`.
3. **Generics**: Use C# Generics for the component management to ensure type safety.
