const THREE = require('three');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

/**
 * Mise à jour de la scène à chaque frame.
 * Le cube se déplace sur un cercle (x = cos(t), z = sin(t)).
 * La caméra doit TOUJOURS regarder le cube, peu importe sa position.
 * 
 * @param {number} time - Temps écoulé
 */
function animate(time) {
    cube.position.x = Math.cos(time);
    cube.position.z = Math.sin(time);
    
    // TÂCHE : Faire en sorte que la caméra regarde le cube.
}
