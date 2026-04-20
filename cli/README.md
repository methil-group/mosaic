# 🧩 Mosaic CLI

[![OS: Windows](https://img.shields.io/badge/OS-Windows-blue.svg)](https://www.microsoft.com/windows)
[![OS: MacOS](https://img.shields.io/badge/OS-MacOS-lightgrey.svg)](https://www.apple.com/macos)
[![OS: Linux](https://img.shields.io/badge/OS-Linux-orange.svg)](https://www.linux.org/)

**Mosaic** is a premium, open-source Agentic Terminal User Interface (TUI) designed for autonomous coding and complex logic orchestration. Built with Python and the Textual framework, it provides a high-performance environment for interacting with LLMs while maintaining full control over your local filesystem and development workflow.

---

## 🌟 Key Features

### 🛡️ Semantic Memory (RAG-based)
Mosaic features a local "Brain" capable of long-term memory.
- **Technology**: Vector similarity search using **Cosine Similarity**.
- **Persistence**: Local storage in `.mosaic/memories.json`.
- **Embeddings**: Dynamically generated via the active LLM provider (default: `text-embedding-3-small`).
- **Management**: Manual addition/deletion via the **Memory Sidebar (`Ctrl+M`)**.

### 🛠️ Dynamic Tool Explorer
Interact with a robust set of tools directly from the UI.
- **Visibility**: Toggle the **Tools Sidebar (`Ctrl+T`)** to view all available capabilities.
- **Capabilities**: File surgery (Read/Write/Edit), Command Execution, Todo management, and Semantic Recall.

### 📜 Persistent Session History
Never lose a thought. Every chat session is automatically persisted.
- **Separation**: Chats are stored as individual JSON files in `.mosaic/chats/`.
- **Restoration**: Reload past conversations via the **History Sidebar (`Ctrl+H`)**.
- **Privacy**: History remains local to your project workspace.

### 🎨 Premium TUI Aesthetic
A carefully curated "Dark Dull Stone Brown" theme designed to reduce eye strain during long coding sessions. Includes interactive hover effects, smooth sidebar transitions, and real-time loading indicators.

---

## 🏗️ Technical Architecture

| Component | Technology | Description |
| :--- | :--- | :--- |
| **TUI Core** | [Textual](https://www.textualize.io/) | Async TUI framework with CSS support. |
| **Agent Engine** | Custom Orchestrator | Handles tool selection, planning, and execution. |
| **RAG System** | Naive Vector Store | JSON-based storage + Python-native Similarity ranking. |
| **Persistence** | Flat-file JSON | Ensures maximum portability (No external DB required). |
| **Providers** | HTTPX / OpenRouter | Robust multi-provider support (OpenRouter, OpenAI, LM Studio). |

---

## ⌨️ Command Shortcuts

| Key | Action | Description |
| :--- | :--- | :--- |
| `Ctrl+S` | **Settings** | Configure API keys, Providers, and Models. |
| `Ctrl+H` | **History** | Browse and reload past chat sessions. |
| `Ctrl+M` | **Memory** | Manage long-term "Brain" memories. |
| `Ctrl+T` | **Tools** | Discover and explore available capabilities. |
| `Ctrl+C` | **Copy Last** | Copy the latest assistant response to clipboard. |
| `Ctrl+L` | **Clear Log** | Clear the TUI log (disk files are preserved). |
| `Ctrl+Q` | **Quit** | Gracefully save and exit. |

---

## 🚀 Getting Started

### Installation

1. **Clone the repository** and navigate to the CLI folder:
   ```bash
   cd cli
   ```

2. **Install the tool**:
   ```bash
   pip install -e .
   ```

3. **Global Config**:
   Settings are saved in `~/.mosaic.env`. Workspace data remains in `./.mosaic/`.

### Launching

```bash
# Start in current directory
mosaic

# Start in a specific workspace
mosaic /path/to/your/project
```

---

## 🧪 Stability & Testing

Mosaic is built for reliability. Run the full validation suite (Unit + E2E) with:
```bash
PYTHONPATH=. pytest tests/
```

> [!NOTE]
> Mosaic is fully **Cross-Platform**. It has been verified on Windows (CMD/PowerShell), macOS (Zsh), and Linux (Bash) with unified path resolution and UTF-8 encoding.

---

*Built with ❤️ by the Mosaic Team.*
