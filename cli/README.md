# Mosaic (TUI)

A premium Terminal User Interface for Mosaic, built with [Textual](https://www.textualize.io/).

## Features

- **Multi-Provider Support**: OpenRouter, OpenAI, and LM Studio.
- **Dynamic Configuration**: Context-aware settings pane that only shows relevant API fields.
- **Persistent Chat History**: All conversations are saved in `.mosaic/chats/` and can be reloaded.
- **Automated Planning**: Sidebar dedicated to tracking tasks and TODOs.
- **Premium Design System**: A "dark dull pastel brown" aesthetic designed for focus and visual comfort.

## Installation

1. Navigate to the `cli` directory:
   ```bash
   cd cli
   ```

2. Install the package in editable mode:
   ```bash
   pip install -e .
   ```

3. (Optional) Install development dependencies for testing:
   ```bash
   pip install -e ".[dev]"
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

- `Ctrl+S`: **Settings** (Provider selection, API keys, Model)
- **`Ctrl+H`**: **History** (Toggle past conversations sidebar)
- `Ctrl+C`: **Copy Last** assistant message to clipboard
- `Ctrl+L`: **Clear** the current UI chat log (archived file remains safe)
- `Ctrl+Q`: **Quit**

## Configuration

Settings are saved globally to `~/.mosaic.env`. Local project history and logs are stored in the `.mosaic/` folder within your workspace.

## Running Tests

To ensure everything is working correctly, run the test suite:
```bash
pytest
```

Supported models are configured via the settings pane (`Ctrl+S`).
