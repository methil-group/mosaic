# Task: C# LINQ Refactoring

In `Program.cs`, refactor the `GetFilteredData` function to use LINQ instead of a `foreach` loop.

## Requirements:
1. **Filtering**: The result should only contain numbers greater than 10.
2. **Condition**: The result should only contain even numbers.
3. **Transformation**: Each remaining number should be multiplied by 2.
4. **Syntax**: Use Method Syntax (`.Where().Select()`) or Query Syntax (`from ... where ... select`).
5. **Return**: The final result must be a `List<int>`.
