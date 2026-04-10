# Tâche : Implémenter un système ECS générique en C#

Implémentez un système Entity Component System (ECS) de base dans `Program.cs`.

## Exigences :
1. **Classe Monde** :
   - `CreerEntite()` : Retourne un ID unique (entier).
   - `AjouterComposant<T>(int entiteId, T composant)` : Attache un composant de type `T` à l'entité.
   - `ObtenirComposant<T>(int entiteId)` : Récupère le composant de type `T`.
2. **Systèmes** :
   - Implémentez un `SystemeMouvement(Monde monde, float dt)` qui met à jour les entités possédant les composants `Position` et `Velocite`.
   - `Position` doit avoir `X`, `Y`.
   - `Velocite` doit avoir `VX`, `VY`.
3. **Génériques** : Utilisez les génériques C# pour la gestion des composants afin de garantir la sécurité du typage.
