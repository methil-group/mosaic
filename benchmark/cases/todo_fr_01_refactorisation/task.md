# Tâche : Planifier la Refactorisation d'un Système d'Emails

Notre module d'envoi d'emails `Mailer.py` mélange la logique de construction HTML, la connexion au serveur SMTP et la gestion des désabonnements.

Votre tâche :
Créez un plan détaillé pour refactoriser ce système dans un fichier nommé `plan.md`.

Exigences :
1. Identifiez au moins 3 responsabilités à extraire dans des classes distinctes.
2. Décrivez les étapes pour garantir qu'aucun email n'est perdu durant la migration.
3. Mentionnez des Design Patterns utiles (ex: Template, Observer).
4. Esquissez l'arborescence finale des fichiers.
