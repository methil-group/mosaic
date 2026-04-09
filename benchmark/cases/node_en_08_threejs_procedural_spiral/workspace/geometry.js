const THREE = require('three');

/**
 * Generate a procedural spiral geometry using BufferGeometry.
 * The spiral should have 1000 points.
 * 
 * Each point (i) should be calculated as:
 * angle = 0.1 * i
 * radius = 0.05 * i
 * x = radius * cos(angle)
 * y = radius * sin(angle)
 * z = 0.1 * i
 * 
 * @returns {THREE.BufferGeometry} The generated geometry
 */
function createSpiralGeometry() {
    const geometry = new THREE.BufferGeometry();
    const count = 1000;
    
    // TASK: Create a Float32Array for positions and add it to the geometry as an attribute 'position'.
    
    return geometry;
}

module.exports = { createSpiralGeometry };
