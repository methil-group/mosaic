# Task: ECS & Three.js Synchronization

In `app.js`, implement a `RenderSystem` that synchronizes the ECS state with Three.js meshes.

## Requirements:
- The `RenderSystem(world)` function must:
    - Iterate over entities possessing both `Transform` and `Mesh` components.
    - Copy the coordinates from `Transform.position` (x, y, z) to the `threeMesh.position` property of the `Mesh` component.
- Ensure the synchronization is efficient and handles X, Y, and Z axes.

## Note:
- You don't need to implement the full `World` logic, only the `RenderSystem` as defined.
