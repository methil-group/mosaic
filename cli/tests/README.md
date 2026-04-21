# Mosaic Test Suite 🧪

> [!IMPORTANT]
> **Toutes les épreuves dans ce répertoire sont ABSOLUMENT NÉCESSAIRES.** 
> Aucun changement ne doit être fusionné sans que la suite de tests complète soit au vert (100% de réussite).

## Structure des tests

### 1. Tests Unitaires (`test_*.py`)
Vérifient la logique métier isolée : calculs, parsage des appels d'outils, gestion de la mémoire, etc.
- **Commande** : `pytest tests/test_parser.py tests/test_memory.py`

### 2. Tests End-to-End (E2E) (`test_e2e_*.py`)
Simulent un utilisateur réel interagissant avec l'interface terminal (TUI). Ils utilisent le "Pilot" de Textual pour cliquer sur des boutons et taper du texte.
- **Commande** : `pytest tests/test_e2e_advanced.py`

### 3. Tests de Snapshots Visuels (`test_snapshots.py`)
Garantissent que l'interface reste visuellement parfaite. Ils comparent l'état actuel de l'UI avec des snapshots SVG de référence. Si vous changez une couleur ou une bordure, ces tests échoueront pour vous alerter.
- **Commande** : `pytest tests/test_snapshots.py`
- **Mise à jour** : Si le changement visuel est voulu, lancez `pytest tests/test_snapshots.py --snapshot-update`.

---

## Pourquoi est-ce vital ?
Mosaic est une application complexe avec beaucoup d'interactions asynchrones. Une petite modification dans le système de streaming peut casser l'affichage des outils ou la sauvegarde de l'historique sans que cela ne soit visible immédiatement. 

**Maintenez la suite au vert pour garantir une expérience utilisateur Premium.** 
 ✨
