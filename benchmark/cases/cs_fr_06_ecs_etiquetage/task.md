# Tâche : Étiquetage de composants et système de ciblage en C#

Dans ce projet C# multi-fichiers, votre objectif est d'implémenter un `SystemeCiblage` qui utilise des composants "Étiquette" vides pour un filtrage efficace des entités.

## Exigences :
1. **`SystemeCiblage.cs`** :
   - Implémentez la méthode `TrouverCiblesValides(Registre registre)`.
   - Elle doit parcourir toutes les entités du `registre`.
   - Une cible est considérée comme **VALIDE** uniquement si :
     - Elle possède l'étiquette `EstEnnemi`.
     - Elle possède l'étiquette `DansVue`.
     - Elle **NE POSSÈDE PAS** l'étiquette `EstActif`.
2. **Efficacité du filtrage** : Utilisez `registre.PossedeComposant<T>()` pour vérifier les étiquettes.

## Fichiers :
- `Registre.cs` : Registre ECS gérant le stockage des entités et composants.
- `Etiquettes.cs` : Structs vides utilisées comme étiquettes (`EstEnnemi`, `EstActif`, `DansVue`).
- `Composants.cs` : Composants de données (`Position`, `Nom`).
- `SystemeCiblage.cs` : À compléter avec la logique de filtrage.
- `Program.cs` : Point d'entrée créant des entités avec diverses combinaisons d'étiquettes.
