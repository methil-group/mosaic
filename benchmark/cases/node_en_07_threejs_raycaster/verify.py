import os
import sys
import re

def verify(workspace):
    app_file = os.path.join(workspace, "app.js")
    if not os.path.exists(app_file):
        print("Error: app.js not found")
        return False
        
    with open(app_file, "r") as f:
        content = f.read()
        
    # Check for NDC calculation logic
    has_ndc_x = "event.clientX" in content and "/ window.innerWidth" in content and "* 2 - 1" in content
    has_ndc_y = "event.clientY" in content and "/ window.innerHeight" in content and "* 2 + 1" in content or "- * 2 + 1" in content or "* -2 + 1" in content
    
    # Check for raycaster usage
    has_set_from_camera = "raycaster.setFromCamera" in content
    has_intersect = "raycaster.intersectObjects" in content and "spheres" in content
    
    # Check for color change
    has_color_change = "0xff0000" in content or "red" in content.lower()
    
    if all([has_ndc_x, has_ndc_y, has_set_from_camera, has_intersect, has_color_change]):
        print("Successfully implemented raycasting selection logic")
        return True
    else:
        missing = []
        if not has_ndc_x: missing.append("NDC X calculation")
        if not has_ndc_y: missing.append("NDC Y calculation")
        if not has_set_from_camera: missing.append("raycaster.setFromCamera")
        if not has_intersect: missing.append("raycaster.intersectObjects")
        if not has_color_change: missing.append("color update logic")
        print(f"Missing logic: {', '.join(missing)}")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
