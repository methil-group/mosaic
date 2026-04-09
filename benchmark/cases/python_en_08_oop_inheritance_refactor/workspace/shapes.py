import math

def calculate_area(shape_type, params):
    if shape_type == "circle":
        return math.pi * params["radius"]**2
    elif shape_type == "rectangle":
        return params["width"] * params["height"]
    return 0

# TASK: Refactor the code above into a proper OOP hierarchy.
# Create a base class 'Shape' with an abstract 'area()' method.
# Create subclasses 'Circle' and 'Rectangle'.

class Shape:
    def area(self):
        raise NotImplementedError()

# Implement subclasses here
