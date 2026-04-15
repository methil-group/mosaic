import os
import sys
import subprocess

def verify(workspace):
    parser_file = os.path.join(workspace, "parser.ex")
    if not os.path.exists(parser_file):
        return False
        
    test_code = """
    Code.require_file("parser.ex")
    data = %{"type" => "point", "payload" => %{"coords" => [10, 20], "meta" => %{"label" => "star"}}}
    case CoordinateParser.parse(data) do
      {:ok, {10, 20, "star"}} -> 
        case CoordinateParser.parse(%{"wrong" => "data"}) do
          {:error, "invalid_structure"} -> IO.puts("SUCCESS")
          _ -> IO.puts("FAILURE: missing error handling")
        end
      _ -> IO.puts("FAILURE: basic parsing failed")
    end
    """
    
    test_file = os.path.join(workspace, "test_verify.exs")
    with open(test_file, "w") as f:
        f.write(test_code)
        
    try:
        result = subprocess.run(["elixir", test_file], capture_output=True, text=True, cwd=workspace)
        if "SUCCESS" in result.stdout:
            print("Successfully verified Elixir pattern matching")
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
