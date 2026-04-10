import processeur

def executer():
    print("Démarrage de l'application...")
    try:
        donnees = [10, 20, 30]
        resultat = processeur.traiter(donnees)
        print(f"Résultat : {resultat}")
    except Exception as e:
        print(f"Erreur Application : {e}")
        # Log généré
        with open("logs/erreur.log", "w") as f:
            f.write(f"Traceback: processeur.py:12 in traiter -> config.py:5 in obtenir_seuil\n")
            f.write(f"KeyError: 'seuil_limite' introuvable dans les données de configuration.\n")

if __name__ == "__main__":
    executer()
