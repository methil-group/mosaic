# Mosaic (TUI)

A Terminal User Interface for Mosaic, built with [Textual](https://www.textualize.io/).

## Installation

1. Navigate to the `cli` directory:
   ```bash
   cd cli
   ```

2. Install the package in editable mode:
   ```bash
   pip install -e .
   ```

## Usage

Run the tool from anywhere:
```bash
mosaic
```

Or open a specific workspace:
```bash
mosaic /path/to/project
```

### Shortcuts
- `Ctrl+S`: **Settings** (Enter your OpenRouter API Key and select a model here)
- `Ctrl+C`: Clear chat log
- `Ctrl+Q`: Quit

## Configuration
Upon first run, press `Ctrl+S` to enter your OpenRouter API key. Settings are saved globally to `~/.mosaic.env`, making them persistent across different workspaces.

Supported models:
- `deepseek/deepseek-v3.2`
- `qwen/qwen3-coder-next`
