import math

def is_colliding_sat(poly1, poly2):
    """
    Check if two 2D convex polygons are colliding using the Separation Axis Theorem (SAT).
    
    Each polygon is a list of tuples [(x1, y1), (x2, y2), ...].
    
    :param poly1: First polygon
    :param poly2: Second polygon
    :return: True if colliding, False otherwise
    """
    # TASK: Implement the SAT algorithm here.
    # 1. Get all unique axes (normals to the edges)
    # 2. For each axis, project both polygons
    # 3. Check for overlap. If any axis shows no overlap, they are not colliding.
    return True
