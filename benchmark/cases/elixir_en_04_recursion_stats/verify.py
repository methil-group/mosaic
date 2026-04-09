import os
import sys
import subprocess

def verify(workspace):
    stats_file = os.path.join(workspace, "stats.exs")
    if not os.path.exists(stats_file):
        return False
        
    test_code = """
    Code.require_file("stats.exs")
    case ListStats.find_max([1, 5, 3, 9, 2]) do
      {:ok, 9} -> 
        case ListStats.find_max([]) do
          {:error, :empty_list} -> IO.puts("SUCCESS")
          _ -> IO.puts("FAILURE: empty list handling failed")
        end
      res -> IO.puts("FAILURE: expected {:ok, 9}, got #{inspect res}")
    end
    """
    
    test_file = os.path.join(workspace, "test_verify.exs")
    with open(test_file, "w") as f:
        f.write(test_code)
        
    try:
        result = subprocess.run(["elixir", test_file], capture_output=True, text=True, cwd=workspace)
        if "SUCCESS" in result.stdout:
            print("Successfully verified Elixir recursion")
            return True
        else:
            print(f"Verification failed: {result.stdout}")
            return False
    except Exception as e:
        print(f"Error during verification: {e}")
        return False
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
