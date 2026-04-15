const THREE = require('three');

/**
 * Créer un carré (deux triangles) en utilisant BufferGeometry avec indexation.
 * 
 * Les sommets du carré :
 * (-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)
 * 
 * TÂCHE :
 * 1. Créer un BufferGeometry.
 * 2. Définir les sommets dans un Float32Array (4 sommets).
 * 3. Ajouter l'attribut 'position'.
 * 4. Définir les indices dans un Uint16Array pour former deux triangles (0-1-2 et 0-2-3).
 * 5. Utiliser geometry.setIndex().
 */
function createIndexedSquare() {
    const geometry = new THREE.BufferGeometry();
    
    // Implementation ici
    
    return geometry;
}

module.exports = { createIndexedSquare };
