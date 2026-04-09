defmodule CoordinateParser do
  @doc """
  Parses a data map and returns {:ok, {x, y, label}} if valid, or {:error, reason} otherwise.
  
  Expected structure:
  %{
    "type" => "point",
    "payload" => %{
      "coords" => [x, y],
      "meta" => %{"label" => label}
    }
  }
  """
  def parse(data) do
    # TASK: Use pattern matching to extract x, y, and label.
    # Return {:ok, {x, y, label}} on success.
    # Return {:error, "invalid_structure"} for any other map structure.
    {:error, "not_implemented"}
  end
end
