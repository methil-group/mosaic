# Methil Vibe

opla owned

## Installation

```bash
./install.sh
```

Ou manuellement:
```bash
conda create -n methil-vibe python=3.11 -y
conda activate methil-vibe
pip install -e .
```

## Lancement

```bash
conda activate methil-vibe
methil-vibe
```

### Options

```bash
methil-vibe --help
methil-vibe --working-dir /chemin/vers/projet
methil-vibe --no-confirm
```

## Commandes

| Commande | Description |
|----------|-------------|
| `/quit` | Quitter |
| `/clear` | Effacer l'historique |
| `/help` | Afficher l'aide |
| `/confirm` | Confirmer une écriture |
| `/reject` | Rejeter une écriture |

## Tests

```bash
pip install pytest
pytest tests/
```
