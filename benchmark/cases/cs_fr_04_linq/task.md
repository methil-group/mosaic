# Tâche : Refactorisation LINQ en C#

Dans `Program.cs`, refactorisez la fonction `FiltrerDonnees` pour utiliser LINQ au lieu d'une boucle `foreach`.

## Exigences :
1. **Filtrage** : Le résultat ne doit contenir que des nombres supérieurs à 10.
2. **Condition** : Le résultat ne doit contenir que des nombres pairs.
3. **Transformation** : Chaque nombre restant doit être multiplié par 2.
4. **Syntaxe** : Utilisez la syntaxe de méthode (`.Where().Select()`) ou la syntaxe de requête (`from ... where ... select`).
5. **Retour** : Le résultat final doit être une `List<int>`.
