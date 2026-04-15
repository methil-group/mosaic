# Task: Separation Axis Theorem (SAT) Collision

Implement the `is_colliding_sat` function in `collision.py` to detect collisions between two 2D convex polygons using the Separation Axis Theorem.

Requirements:
- For each edge of both polygons, calculate the normal (perpendicular) vector to use as a projection axis.
- Project all vertices of both polygons onto each axis.
- A projection is the dot product of the vertex and the normalized axis.
- Find the `min` and `max` projection for both polygons.
- If there is no overlap between the `[min1, max1]` and `[min2, max2]` intervals on *any* axis, return `False`.
- If all axes show overlaps, return `True`.
