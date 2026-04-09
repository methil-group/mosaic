# Tâche : Configuration des Lumières et Ombres

Dans `app.js`, configurez le système d'éclairage pour que le cube projette une ombre portée sur le sol (le plan).

Exigences :
- Instanciez une `DirectionalLight` et placez-la à `(5, 10, 5)`.
- Activez `shadowMap.enabled` sur le `renderer`.
- Réglez `castShadow` à `true` pour la lumière directionnelle et le cube.
- Réglez `receiveShadow` à `true` pour le plan.
