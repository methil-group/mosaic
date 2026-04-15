# Tâche : Composition plutôt que Héritage

Refactorisez la classe `Personnage` dans `jeu.py` pour qu'elle utilise la composition.

Exigences :
- Créez une classe `Mouvement` pour gérer `position_x`, `position_y` et `deplacer()`.
- Créez une classe `Combat` pour gérer `attaquer()`.
- La classe `Personnage` doit maintenant déléguer ces actions à des instances de `Mouvement` et `Combat`.
- Le constructeur de `Personnage` doit initialiser ces composants.
