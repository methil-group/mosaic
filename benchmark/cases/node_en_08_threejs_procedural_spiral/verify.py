import os
import sys
import re

def verify(workspace):
    geom_file = os.path.join(workspace, "geometry.js")
    if not os.path.exists(geom_file):
        print("Error: geometry.js not found")
        return False
        
    with open(geom_file, "r") as f:
        content = f.read()
        
    # Check for math logic
    has_math_cos = "Math.cos" in content or "Math.sin" in content
    has_angle = "0.1 * i" in content or "i * 0.1" in content
    has_radius = "0.05 * i" in content or "i * 0.05" in content
    has_z = "0.1 * i" in content or "i * 0.1" in content
    
    # Check for BufferGeometry usage
    has_float32 = "Float32Array" in content
    has_buffer_attribute = "BufferAttribute" in content or "setAttribute" in content
    has_position = "'position'" in content or "\"position\"" in content
    
    if all([has_math_cos, has_angle, has_radius, has_z, has_float32, has_buffer_attribute, has_position]):
        print("Successfully implemented procedural spiral geometry")
        return True
    else:
        missing = []
        if not has_math_cos: missing.append("trigonometry")
        if not has_angle: missing.append("angle calculation")
        if not has_radius: missing.append("radius calculation")
        if not has_z: missing.append("z axis calculation")
        if not has_float32: missing.append("Float32Array")
        if not (has_buffer_attribute and has_position): missing.append("position attribute setup")
        print(f"Missing logic: {', '.join(missing)}")
        return False

if __name__ == "__main__":
    workspace = sys.argv[1]
    if verify(workspace):
        sys.exit(0)
    else:
        sys.exit(1)
