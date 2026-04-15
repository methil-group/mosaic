const THREE = require('three');

const startPos = new THREE.Vector3(0, 0, 0);
const endPos = new THREE.Vector3(10, 5, -5);
const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

let alpha = 0; // Progression de 0 à 1

/**
 * TÂCHE :
 * Dans la boucle d'animation :
 * 1. Incrémenter 'alpha' par une petite valeur (ex: 0.01) à chaque frame.
 * 2. Utiliser la méthode '.lerp()' de Vector3 pour mettre à jour la position du cube.
 * 3. La position du cube doit glisser de 'startPos' vers 'endPos' en fonction de 'alpha'.
 * 4. Réinitialiser 'alpha' à 0 quand il atteint 1.
 */
function animate() {
    // Implementation ici
}
