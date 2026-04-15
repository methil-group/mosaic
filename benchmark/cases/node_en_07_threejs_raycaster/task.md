# Task: Three.js Spatial Interaction (Raycaster)

In `app.js`, implement the logic inside the `onMouseClick` function to detect which sphere in the `spheres` array was clicked and change its color to red (`0xff0000`).

Requirements:
- Calculate normalized device coordinates (NDC) from the click event.
- Update the `mouse` Vector2 with these coordinates.
- Set the `raycaster` from the camera and mouse coordinates.
- Find intersections with the `spheres` array.
- If there's an intersection, change the material color of the first intersected object to `0xff0000`.
