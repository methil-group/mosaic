# Tâche : Débogage d'application multi-fichiers

L'application échoue lors de l'exécution de `app.py`. Un fichier journal `logs/erreur.log` a été généré avec une trace d'erreur (traceback).

Votre tâche :
1. Examinez le fichier journal pour comprendre l'erreur.
2. Suivez le code à travers `app.py`, `processeur.py` et `config.py`.
3. Trouvez la cause racine et corrigez-la pour que `app.py` s'exécute avec succès.
4. Vérifiez la correction en exécutant `app.py`.

Exigences :
- Ne modifiez pas `app.py` ou `processeur.py` sauf si c'est absolument nécessaire (le bug est probablement dans `config.py`).
- La correction doit permettre à `processeur.traiter()` de retourner une liste de valeurs supérieures au seuil.
