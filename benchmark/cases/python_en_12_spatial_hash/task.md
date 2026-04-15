# Task: Implement a Spatial Hash Grid in Python

In `spatial_hash.py`, implement the methods for a basic spatial hashing system used for efficient collision detection.

## Requirements:
1. **`insert(entity_id, position)`**:
   - Calculate the cell key for the given `(x, y)` position.
   - Add the `entity_id` to the list of entities in that cell.
2. **`query(position)`**:
   - Calculate the cell key for the given `(x, y)` position.
   - Return all `entity_id`s present in that cell AND the 8 surrounding neighbor cells.
3. **`remove(entity_id, position)`**:
   - Remove the `entity_id` from the specific cell associated with the `position`.
4. **Efficiency**: Use a dictionary to store the grid cells efficiently.
