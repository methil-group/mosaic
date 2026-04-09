const THREE = require('three');

const scene = new THREE.Scene();

// La Terre
const geometryTerre = new THREE.SphereGeometry(1, 32, 32);
const materialTerre = new THREE.MeshStandardMaterial({ color: 0x2233ff });
const terre = new THREE.Mesh(geometryTerre, materialTerre);

// La Lune
const geometryLune = new THREE.SphereGeometry(0.3, 32, 32);
const materialLune = new THREE.MeshStandardMaterial({ color: 0x888888 });
const lune = new THREE.Mesh(geometryLune, materialLune);
lune.position.x = 3;

/**
 * TÂCHE :
 * 1. Créer un Groupe Three.js nommé 'systemeTerreLune'.
 * 2. Ajouter la Terre et la Lune à ce groupe.
 * 3. Ajouter le groupe à la scène.
 * 4. Faire en sorte que dans la boucle d'animation, seule une rotation du GROUPE
 *    soit appliquée pour simuler la révolution de la lune autour de la terre.
 */
function setupHierarchy() {
    // Implementation ici
}

function animate() {
    // Rotation du groupe ici
}
