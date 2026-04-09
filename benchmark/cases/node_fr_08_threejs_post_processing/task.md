# Tâche : Configuration du Post-Processing

Dans `app.js`, mettez en place la chaîne de rendu de base pour le post-traitement en utilisant `EffectComposer`.

Exigences :
- Instanciez `EffectComposer(renderer)`.
- Instanciez `RenderPass(scene, camera)`.
- Ajoutez le pass au composer.
- Utilisez `composer.render()` au lieu de `renderer.render()`.
