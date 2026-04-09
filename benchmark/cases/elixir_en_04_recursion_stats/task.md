# Task: Elixir Recursion

In `stats.exs`, implement the `find_max/1` function using manual recursion.

Requirements:
- Do NOT use any functions from the `Enum` or `List` modules.
- Use pattern matching with head and tail `[h | t]`.
- Handle the empty list case by returning `{:error, :empty_list}`.
- Return `{:ok, max_value}` for non-empty lists.
