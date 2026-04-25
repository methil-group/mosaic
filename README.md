# Mosaic 🧩

Mosaic is a modular, multi-interface ecosystem for **autonomous coding and workspace management**. It provides a standardized framework for AI agents to interact with filesystems, shells, and developer tools across different environments.

---

## 🏛 Ecosystem Overview

Mosaic is composed of several specialized modules designed to fit into any developer workflow:

### 🖥 [Mosaic CLI](cli/)
A premium **Agentic TUI (Terminal User Interface)** built with Python and Textual.
- **Key Features**: Semantic memory (RAG), real-time tool execution approval, and persistent session history.
- **Best For**: Terminal power users who want a localized, high-performance agentic experience.

### 🔌 [Mosaic VSCode](vscode/)
A seamless integration of the Mosaic agent directly into your IDE.
- **Key Features**: Native VSCode terminal integration, high-precision surgical code edits, and workspace-aware context.
- **Best For**: Direct code modification and integrated debugging within the editor.

### 📈 [Mosaic Benchmark](benchmark/)
A battery of coding tasks designed to evaluate and compare the performance of different LLMs.
- **Key Features**: GGUF/Local model support, automated verification scripts, and detailed performance logging.
- **Best For**: Evaluating which model performs best for specific coding tasks.

### 📦 [Mosaic Electron](electron/) (Preview)
A standalone desktop application bringing the Mosaic experience to a dedicated window.
- **Key Features**: Built with Nuxt and Electron for a cross-platform GUI experience.

---

## ✨ Core Features

- **Agentic Workflows**: Multi-turn tool execution using the standardized `<tool_call>` protocol.
- **Semantic Memory**: Local RAG (Retrieval-Augmented Generation) using vector-based memory for codebase awareness.
- **Surgical Edits**: Precise code modifications that preserve formatting and minimize tokens.
- **Multi-Provider Support**: Seamlessly switch between OpenRouter, OpenAI, and local backends like LM Studio.
- **Security First**: Review and approve every tool call (Shell commands, File writes) before they execute.

---

## 🚀 Quick Start

### Mosaic CLI (Recommended)
The fastest way to get started is via the TUI installer:

```bash
curl -sSL https://raw.githubusercontent.com/methil-mods/mosaic/main/cli/install.sh | bash
```

### Mosaic VSCode
1. Install the extension from the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=methil-mods.mosaic) (or build from source in `vscode/`).
2. Configure your API keys in the extension settings.

---

## 🛠 How it Works: The Tool Protocol

Mosaic uses a standardized XML-wrapped JSON protocol for model-to-tool communication. This ensures consistency across all interfaces.

```xml
<tool_call>
{
  "name": "write_file",
  "arguments": {
    "path": "src/app.py",
    "content": "print('Hello, Mosaic!')"
  }
}
</tool_call>
```

See [TOOL_PROTOCOL.md](TOOL_PROTOCOL.md) for the full specification.

---

## 🤝 Contributing

We welcome contributions across all modules! 
- For CLI changes, see [cli/README.md](cli/README.md).
- For VSCode changes, see [vscode/README.md](vscode/README.md).
- For benchmarking, see [benchmark/README.md](benchmark/README.md).

*Mosaic: Modular, autonomous, and built for the modern developer.*

