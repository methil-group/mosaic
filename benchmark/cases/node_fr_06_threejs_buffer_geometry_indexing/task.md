# Tâche : BufferGeometry Indexée

Dans `app.js`, implémentez la fonction `createIndexedSquare` pour construire un carré optimisé avec des indices.

Exigences :
- Définissez 4 sommets seulement dans le `Float32Array`.
- Utilisez `Uint16Array` pour les indices.
- Appelez `geometry.setIndex()`.
- Les deux triangles doivent partager les sommets 0 et 2.
