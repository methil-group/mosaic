# Tâche : Exécution Parallèle de Systèmes en C#

Dans ce projet C# multi-fichiers, votre objectif est d'optimiser le `GestionnaireSystemes` pour exécuter les systèmes indépendants en parallèle.

## Exigences :
1. **`GestionnaireSystemes.cs`** :
   - Modifiez la méthode `MettreAJour(float dt)`.
   - Au lieu d'une simple boucle `foreach`, utilisez `Task.WhenAll` ou `Parallel.ForEach` pour exécuter les systèmes simultanément.
   - Comme les systèmes fournis (`SystemePosition`, `SystemePhysique`) n'ont pas de dépendances partagées, ils peuvent être exécutés en même temps pour gagner du temps.
2. **Concurrence** : Utilisez les patterns de programmation asynchrone ou parallèle modernes de C#.
3. **Multi-fichiers** : Assurez-vous de respecter l'espace de noms du projet (`EcsParallele`).

## Fichiers :
- `ISysteme.cs` : Interface définissant les systèmes.
- `GestionnaireSystemes.cs` : À refactoriser pour le parallélisme.
- `SystemePosition.cs` / `SystemePhysique.cs` : Exemples de systèmes avec des charges de travail simulées.
- `Program.cs` : Le point d'entrée qui enregistre les systèmes et mesure le temps d'exécution.
