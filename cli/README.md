# 🧩 Mosaic

An open-source agentic TUI for autonomous coding. Built with Python & [Textual](https://www.textualize.io/).

---

## Install

```bash
curl -sSL https://raw.githubusercontent.com/methil-mods/mosaic/main/cli/install.sh | bash
```

Or manually:
```bash
cd cli && pip install -e .
```

## Usage

```bash
mosaic                        # Current directory
mosaic /path/to/project       # Specific workspace
mosaic --version              # Show version
```

## Shortcuts

| Key | Action |
| :--- | :--- |
| `Ctrl+S` | Settings (API keys, providers, models) |
| `Ctrl+H` | Chat history |
| `Ctrl+M` | Memory (RAG brain) |
| `Ctrl+T` | Tools explorer |
| `Ctrl+F` | File tree |
| `Ctrl+C` | Copy last response |
| `Ctrl+L` | Clear log |
| `Ctrl+Q` | Quit |

## Features

- **Semantic Memory** — Local RAG with cosine similarity, stored in `.mosaic/memories.json`
- **Tool System** — File read/write/edit, command execution, todo management, semantic recall
- **Session History** — Auto-persisted chats in `.mosaic/chats/`, reloadable from sidebar
- **Multi-Provider** — OpenRouter, OpenAI, LM Studio
- **Review Mode** — Approve/reject tool calls before execution (`Ctrl+S` → Agent Mode)

## Architecture

| Component | Stack |
| :--- | :--- |
| TUI | Textual (async, CSS) |
| Agent | Custom orchestrator with tool loop |
| Memory | JSON vector store + cosine similarity |
| Providers | HTTPX → OpenRouter / OpenAI / LM Studio |

## Testing

All tests live in `tests/`. Install dev dependencies first:

```bash
pip install -e ".[dev]"
```

### Run all tests

```bash
PYTHONPATH=. pytest tests/
```

### Run by category

```bash
# Unit tests
PYTHONPATH=. pytest tests/test_parser.py tests/test_prompt.py tests/test_tools_utils.py tests/test_safety.py

# Agent & memory
PYTHONPATH=. pytest tests/test_agent.py tests/test_memory.py tests/test_todo_tools.py

# UI components
PYTHONPATH=. pytest tests/test_features.py tests/test_file_tree.py tests/test_sidebar_layout.py tests/test_history_rendering.py tests/test_ux_features.py

# Provider tests
PYTHONPATH=. pytest tests/test_providers.py tests/test_lmstudio_refresh.py

# E2E tests
PYTHONPATH=. pytest tests/test_e2e.py tests/test_e2e_advanced.py tests/test_e2e_mosaic.py

# E2E with live LLM (requires API key)
PYTHONPATH=. pytest tests/test_e2e_live.py

# Snapshot tests
PYTHONPATH=. pytest tests/test_snapshots.py --update-snaps  # update snapshots
PYTHONPATH=. pytest tests/test_snapshots.py                 # verify snapshots

# Integration validation
PYTHONPATH=. python tests/validate_integration.py
```

### Run a single test

```bash
PYTHONPATH=. pytest tests/test_parser.py::test_name -v
```

---

> [!NOTE]
> Config is saved in `~/.mosaic.env`. Workspace data stays in `./.mosaic/`.

*Built with ❤️ by Methil.*
