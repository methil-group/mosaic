import os
import sys

def verify(workspace):
    main_file = os.path.join(workspace, "main.py")
    if not os.path.exists(main_file):
        return False
        
    with open(main_file, "r") as f:
        content = f.read()
        
    # The key from the hidden file is "SUPER_SECRET_KEY_12345"
    if "SUPER_SECRET_KEY_12345" in content and "DEFAULT_KEY" not in content:
        print("Successfully found and updated the secret API key")
        return True
    else:
        print("Failure: API key not updated correctly")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
