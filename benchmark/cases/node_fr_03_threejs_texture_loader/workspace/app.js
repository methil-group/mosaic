const THREE = require('three');

const scene = new THREE.Scene();

// Créer une sphère qui doit porter une texture
const geometry = new THREE.SphereGeometry(2, 32, 32);
const material = new THREE.MeshStandardMaterial();
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

/**
 * TÂCHE :
 * 1. Créer une instance de TextureLoader.
 * 2. Charger la texture située à 'assets/earth.jpg' (ce fichier est fictif pour le test).
 * 3. Assigner cette texture à la propriété 'map' du matériau de la sphère.
 * 4. Faire en sorte que la texture se répète 2 fois sur l'axe X (wrapS et repeat.x).
 */
