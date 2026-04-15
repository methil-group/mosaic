# Tâche : Hooks de Cycle de Vie des Entités en Python

Dans ce projet Python multi-fichiers, votre objectif est d'implémenter des hooks (crochets) de registre internes qui se déclenchent lorsque des composants sont ajoutés ou retirés.

## Exigences :
1. **`registre.py`** :
   - Implémentez `_sur_composant_ajoute(entite, composant)` : Il doit itérer à travers tous les rappels (callbacks) dans `self.hooks["sur_ajout"]` et les appeler avec `(entite, composant)`.
   - Implémentez `_sur_composant_retire(entite, composant)` : Il doit itérer à travers tous les rappels dans `self.hooks["sur_retrait"]` et les appeler avec `(entite, composant)`.
2. **Système de Hooks** : Les hooks sont déjà appelés depuis `entite.py`, vous devez seulement implémenter la logique de dispatch dans le `Registre`.
3. **Découplage** : Le registre doit être capable de supporter plusieurs observateurs (comme le `SystemeNettoyage`) sans connaître leurs types spécifiques.

## Fichiers :
- `entite.py` : Classe Entite qui notifie le registre des changements.
- `registre.py` : Registre ECS à compléter avec la logique de dispatch des hooks.
- `systeme_nettoyage.py` : Un système qui enregistre un hook pour nettoyer les ressources lorsque les composants sont retirés.
- `app.py` : Point d'entrée pour la simulation.
