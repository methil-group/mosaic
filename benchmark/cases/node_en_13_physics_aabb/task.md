# Task: Implement AABB Collision in JavaScript

In `physics.js`, implement the logic for Axis-Aligned Bounding Box (AABB) collision detection and simple resolution.

## Requirements:
1. **`checkCollision(rectA, rectB)`**:
   - Return `true` if the two rectangles overlap, `false` otherwise.
   - Use the `getBounds()` method to get the coordinates.
2. **`resolveCollision(rectA, rectB)`**:
   - If a collision is detected, adjust `rectA`'s position so it no longer overlaps with `rectB`.
   - Use a simple "push-back" resolution along the axis of least penetration.
3. **Logic**: Support X and Y axis overlap checks.
