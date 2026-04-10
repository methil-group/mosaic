_donnees_config = {
    "limite": 15
}

def obtenir_seuil():
    # BUG : Faute de frappe dans la clé. Devrait être "limite"
    return _donnees_config["seuil_limite"]
