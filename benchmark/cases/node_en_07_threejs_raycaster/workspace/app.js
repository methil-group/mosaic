const THREE = require('three');

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Add some objects
const spheres = [];
for (let i = 0; i < 5; i++) {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(i * 3 - 6, 0, 0);
    scene.add(sphere);
    spheres.push(sphere);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * Handle mouse click for object selection.
 * Implement the logic to detect which sphere was clicked and change its color to red (0xff0000).
 * 
 * @param {Object} event - The click event containing clientX and clientY
 */
function onMouseClick(event) {
    // TASK: Implementation goes here
}

window.addEventListener('click', onMouseClick);
