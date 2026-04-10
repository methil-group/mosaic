# Task: Parallel System Execution in C#

In this multi-file C# project, your goal is to optimize the `SystemManager` to run independent systems in parallel.

## Requirements:
1. **`SystemManager.cs`**:
   - Modify the `Update(float dt)` method.
   - Instead of a simple `foreach` loop, use `Task.WhenAll` or `Parallel.ForEach` to execute systems concurrently.
   - Since the provided systems (`PositionSystem`, `PhysicsSystem`) have no shared dependencies, they can be run at the same time to save time.
2. **Concurrency**: Use modern C# asynchronous or parallel programming patterns.
3. **Multi-file**: Ensure you respect the project's namespace (`ParallelEcs`).

## Files:
- `ISystem.cs`: Interface defining systems.
- `SystemManager.cs`: To be refactored for parallelism.
- `PositionSystem.cs` / `PhysicsSystem.cs`: Example systems with simulated workloads.
- `Program.cs`: The entry point that registers systems and measures execution time.
