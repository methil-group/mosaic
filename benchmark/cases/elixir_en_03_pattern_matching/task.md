# Task: Elixir Pattern Matching

In `parser.ex`, implement the `parse/1` function using pattern matching in the function head or a `case` statement to extract the nested data.

Requirements:
- Match the map structure: `%{ "type" => "point", "payload" => %{ "coords" => [x, y], "meta" => %{"label" => label} } }`.
- Return `{:ok, {x, y, label}}`.
- Handle all other cases by returning `{:error, "invalid_structure"}`.
