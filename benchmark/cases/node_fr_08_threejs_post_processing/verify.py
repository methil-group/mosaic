import os
import sys

def verify(workspace):
    app_file = os.path.join(workspace, "app.js")
    if not os.path.exists(app_file):
        return False
        
    with open(app_file, "r") as f:
        content = f.read()
        
    # Check for Composer setup
    has_composer = "EffectComposer" in content
    has_render_pass = "RenderPass" in content
    has_add_pass = "addPass" in content
    has_comp_render = "composer.render()" in content
    
    if has_composer and has_render_pass and has_add_pass and has_comp_render:
        print("Réussite : Chaîne de Post-Processing configurée")
        return True
    else:
        print("Échec : EffectComposer ou RenderPass mal configuré")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
