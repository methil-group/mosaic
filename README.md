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
methil-vibe --dir /chemin/vers/projet
methil-vibe --model LiquidAI/LFM2.5-1.2B-Instruct-MLX-4bit
```

## Commandes

| Commande | Description |
|----------|-------------|
| `/quit` | Quitter |
| `/clear` | Effacer l'historique du contexte |
| `/help` | Afficher l'aide |

## Tests

```bash
pip install pytest
pytest tests/
```
