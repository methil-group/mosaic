# Task: Optimized A* in C#

Implement the A* algorithm in `Program.cs` to find the shortest path in a 2D integer grid.

## Requirements:
1. **Grid**: `0` is walkable, `1` is an obstacle.
2. **Shortest Path**: Return a list of `(int row, int col)` representing the path.
3. **Optimized Priority Queue**: You **MUST** use the built-in `PriorityQueue<TElement, TPriority>` class available in .NET 6+.
4. **Heuristic**: Use the Manhattan distance.
5. **Movement**: Support 4-directional movement (Up, Down, Left, Right).
