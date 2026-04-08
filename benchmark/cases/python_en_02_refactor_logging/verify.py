import os
import sys

def verify(workspace_path):
    print(f"Verifying Case 02: {workspace_path}")
    app_path = os.path.join(workspace_path, "app.py")
    
    if not os.path.exists(app_path):
        print("Error: app.py not found")
        return False
        
    with open(app_path, 'r') as f:
        content = f.read()
        
    # Check if logging is imported
    if "import logging" not in content:
        print("Verification failed: 'import logging' not found in app.py")
        return False
        
    # Check if print() statements are gone
    # We look for 'print(' but being careful about comments might be hard with just strings, 
    # but for a simple benchmark this usually suffices unless they write print in comments.
    if "print(" in content:
        print("Verification failed: print() calls still present in app.py")
        return False
        
    # Check for basic logging usage
    if "logging.info(" not in content and "logging.error(" not in content:
        print("Verification failed: No logging calls found")
        return False
        
    print("Verification successful!")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    success = verify(sys.argv[1])
    sys.exit(0 if success else 1)
