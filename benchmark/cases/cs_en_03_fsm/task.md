# Task: Finite State Machine for Enemy AI in C#

Implement a Finite State Machine (FSM) in `Program.cs` to control an enemy's behavior.

## Requirements:
1. **States**: implement logic for `Idle`, `Patrolling`, and `Chasing`.
2. **Transitions**:
   - `Idle` -> `Patrolling` after a simulated time delay.
   - `Patrolling` -> `Chasing` if a distance check to the player is less than `5.0f`.
   - `Chasing` -> `Patrolling` if the distance is greater than `10.0f`.
3. **Behavior**:
   - Each state should have an `Update()` method.
   - Use a `CurrentState` property to manage the active state.
   - Use Polymorphism (State Pattern) OR a clean Switch-based approach.
