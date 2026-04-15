import os
import sys
import math

def verify(workspace):
    shapes_file = os.path.join(workspace, "shapes.py")
    if not os.path.exists(shapes_file):
        return False
        
    try:
        sys.path.append(workspace)
        import shapes
        
        # Check for classes
        c = shapes.Circle(radius=5)
        r = shapes.Rectangle(width=4, height=3)
        
        # Check area calculation
        if not math.isclose(c.area(), math.pi * 25):
            print("Failure: Circle area is incorrect")
            return False
            
        if r.area() != 12:
            print("Failure: Rectangle area is incorrect")
            return False
            
        # Check inheritance
        if not isinstance(c, shapes.Shape) or not isinstance(r, shapes.Shape):
            print("Failure: Missing inheritance from Shape")
            return False
            
        print("Successfully verified OOP inheritance")
        return True
    except Exception as e:
        print(f"Error during verification: {e}")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
