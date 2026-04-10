# Task: Implement a Quadtree in JavaScript

In `quadtree.js`, implement a recursive Quadtree spatial partitioning system.

## Requirements:
1. **`subdivide()`**: Create 4 children Quadtrees (North-West, North-East, South-West, South-East) covering the divided boundary.
2. **`insert(point)`**:
   - Only add point if it's within boundary.
   - If capacity is reached and not divided, `subdivide()`.
   - If divided, recursively insert into the correct children.
3. **`query(range, found)`**:
   - Check if the boundary intersects the search range.
   - Add all points within range to the `found` array.
   - If divided, recursively query children.
4. **Logic**: Boundary check must use `x, y, w, h` coordinates.
