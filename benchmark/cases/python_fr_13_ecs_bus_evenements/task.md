# Tâche : Communication entre systèmes via un bus d'événements

Dans ce projet Python multi-fichiers, votre objectif est de permettre la communication entre le `SystemeCombat` et le `SystemeUI` en utilisant un `BusEvenements`.

## Exigences :
1. **`bus_evenements.py`** :
   - Implémentez la méthode `publier(type_evenement, donnees)`.
   - Elle doit notifier tous les auditeurs abonnés au `type_evenement` spécifique.
2. **`systeme_combat.py`** :
   - Dans `infliger_degats`, publiez un événement "DegatsSubis" en utilisant le `bus_evenements`.
   - Les données de l'événement doivent être un dictionnaire : `{"id_entite": id_entite, "degats": degats}`.
3. **`systeme_ui.py`** :
   - Dans la méthode `__init__`, utilisez `self.bus_evenements.s_abonner` pour écouter l'événement "DegatsSubis".
4. **Découplage** : Le `SystemeCombat` ne doit avoir aucune référence au `SystemeUI`.

## Fichiers :
- `monde.py` : Registre ECS de base.
- `bus_evenements.py` : À compléter.
- `systeme_combat.py` : À compléter.
- `systeme_ui.py` : À compléter.
- `app.py` : Point d'entrée pour la simulation.
