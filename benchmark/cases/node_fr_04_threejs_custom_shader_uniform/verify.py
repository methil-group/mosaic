import os
import sys

def verify(workspace):
    app_file = os.path.join(workspace, "app.js")
    if not os.path.exists(app_file):
        return False
        
    with open(app_file, "r") as f:
        content = f.read()
        
    # Check for ShaderMaterial setup
    has_shader_mat = "ShaderMaterial" in content
    has_uniforms = "uniforms" in content and "uTime" in content
    has_update = ".value +=" in content or ".value =" in content
    
    if has_shader_mat and has_uniforms and has_update:
        print("Réussite : Shader personnalisé avec uTime configuré")
        return True
    else:
        print("Échec : Logique de ShaderMaterial ou d'Uniform incomplète")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
