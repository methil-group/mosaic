import config

def traiter(donnees):
    seuil = config.obtenir_seuil()
    return [x for x in donnees if x > seuil]
