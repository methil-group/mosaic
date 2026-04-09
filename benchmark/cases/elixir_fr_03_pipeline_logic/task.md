# Tâche : Pipeline de Données Elixir

Dans `formateur.ex`, implémentez la fonction `traiter_utilisateurs/1` en utilisant l'opérateur pipe `|>`.

Exigences :
- Filtrer les utilisateurs (maps) qui n'ont pas la clé `"email"`.
- Transformer le nom (`"nom"`) en majuscules via `String.upcase/1`.
- Produire une liste de chaînes au format `"NOM <email>"`.
- Utilisez les fonctions du module `Enum`.
