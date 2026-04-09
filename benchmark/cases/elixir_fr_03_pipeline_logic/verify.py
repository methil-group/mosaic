import os
import sys
import subprocess

def verify(workspace):
    form_file = os.path.join(workspace, "formateur.ex")
    if not os.path.exists(form_file):
        return False
        
    test_code = """
    Code.require_file("formateur.ex")
    users = [
      %{"nom" => "alice", "email" => "alice@ex.com"},
      %{"nom" => "bob"},
      %{"nom" => "charlie", "email" => "charlie@ex.com"}
    ]
    result = FormateurUtilisateur.traiter_utilisateurs(users)
    expected = ["ALICE <alice@ex.com>", "CHARLIE <charlie@ex.com>"]
    if result == expected do
      IO.puts("SUCCESS")
    else
      IO.puts("FAILURE: got #{inspect result}")
    end
    """
    
    test_file = os.path.join(workspace, "test_verify.exs")
    with open(test_file, "w") as f:
        f.write(test_code)
        
    try:
        result = subprocess.run(["elixir", test_file], capture_output=True, text=True, cwd=workspace)
        if "SUCCESS" in result.stdout:
            print("Successfully verified Elixir pipeline")
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
