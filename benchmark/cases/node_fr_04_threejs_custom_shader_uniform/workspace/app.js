const THREE = require('three');

const geometry = new THREE.PlaneGeometry(5, 5);

const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    uniform float uTime;
    void main() {
        // TÂCHE : Créer une couleur animée basée sur uTime
        gl_FragColor = vec4(vUv.x, vUv.y, abs(sin(uTime)), 1.0);
    }
`;

/**
 * TÂCHE :
 * 1. Créer un ShaderMaterial utilisant les shaders ci-dessus.
 * 2. Définir un uniform 'uTime' initialisé à 0.
 * 3. Créer un mesh avec ce matériau et l'ajouter à la scène (fictivement).
 * 4. Implémenter une fonction 'update' qui incrémente 'uTime' avec le temps écoulé (dt).
 */
function createCustomShaderMesh() {
    // Implementation ici
}

module.exports = { createCustomShaderMesh };
