const THREE = require('three');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Un plan pour recevoir les ombres
const planeGeometry = new THREE.PlaneGeometry(20, 20);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Un cube pour projeter une ombre
const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.y = 2;
scene.add(cube);

// Lumière ambiante simple
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

/**
 * TÂCHE :
 * 1. Ajouter une DirectionalLight à la scène (positionnée en 5, 10, 5).
 * 2. Activer les ombres dans le renderer.
 * 3. Faire en sorte que la DirectionalLight projette des ombres (castShadow).
 * 4. Faire en sorte que le cube projette des ombres.
 * 5. Faire en sorte que le plan reçoive des ombres (receiveShadow).
 */
