# Tâche : Implémenter des Noeuds d'Arbre de Comportement en Python

Dans `behavior_tree.py`, complétez l'implémentation des noeuds `Sequence` et `Selecteur`.

## Exigences :
1. **Noeud Sequence (Logique ET)** :
   - Parcourt ses enfants dans l'ordre.
   - Si un enfant retourne `ECHEC`, la séquence retourne immédiatement `ECHEC`.
   - Si un enfant retourne `EN_COURS`, la séquence retourne `EN_COURS`.
   - Si tous les enfants retournent `SUCCES`, la séquence retourne `SUCCES`.
2. **Noeud Selecteur (Logique OU)** :
   - Parcourt ses enfants dans l'ordre.
   - Si un enfant retourne `SUCCES`, le sélecteur retourne immédiatement `SUCCES`.
   - Si un enfant retourne `EN_COURS`, le sélecteur retourne `EN_COURS`.
   - Si tous les enfants retournent `ECHEC`, le sélecteur retourne `ECHEC`.
3. **Logique** : Assurez-vous que l'état est correctement propagé.
