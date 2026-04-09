defmodule ListStats do
  @doc """
  Calculates the sum of a list of numbers using recursion.
  Do NOT use Enum.sum/1 or any Enum functions.
  """
  def sum(list), do: do_sum(list, 0)
  
  defp do_sum([], acc), do: acc
  defp do_sum([head | tail], acc), do: do_sum(tail, acc + head)

  @doc """
  Finds the maximum value in a list of numbers using recursion.
  Do NOT use Enum.max/1.
  
  Returns {:ok, max} or {:error, :empty_list}.
  """
  def find_max(list) do
    # TASK: Implement the recursive logic to find the maximum value.
    {:error, :not_implemented}
  end
end
