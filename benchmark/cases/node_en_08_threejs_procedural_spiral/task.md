# Task: Procedural 3D Spiral

In `geometry.js`, implement the `createSpiralGeometry` function to generate a 3D spiral using Three.js `BufferGeometry`.

Requirements:
- Create a `Float32Array` of size `3000` (1000 points * 3 coordinates).
- Loop from `i = 0` to `999`.
- For each `i`, calculate:
    - `angle = 0.1 * i`
    - `radius = 0.05 * i`
    - `x = radius * Math.cos(angle)`
    - `y = radius * Math.sin(angle)`
    - `z = 0.1 * i`
- Fill the `Float32Array` with these `x, y, z` values.
- Add the array as a `BufferAttribute` named `'position'` to the geometry.
