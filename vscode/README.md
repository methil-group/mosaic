# Mosaic VSCode Extension 🧩

AI-powered coding assistant with full tool-calling capabilities, ported from the Mosaic CLI.

## 🚀 Getting Started

### Prerequisites
- [VSCode](https://code.visualstudio.com/)
- [Node.js & npm](https://nodejs.org/)

### Installation
1. Clone the repository.
2. Navigate to the `vscode/` directory.
3. Run `npm install` to install dependencies.

### Development
1. Open the `vscode/` folder in VSCode.
2. Press **F5** to launch the extension in a new window (Extension Development Host).
   - This will automatically start the TypeScript watcher in the background.
3. In the new window, open the Mosaic sidebar icon to start chatting.

### Configuration
Go to VSCode Settings (`Cmd+,`) and search for "Mosaic" to configure:
- **API Keys**: OpenAI or OpenRouter keys.
- **Provider**: Choose your preferred LLM provider.
- **Model**: Select the model (e.g., `gpt-4o`).

## 🧪 Testing

### Unit Tests
We use Jest for unit testing core logic (parser, protocol, etc.).
```bash
npm run unit-test
```

### Integration Tests
Integration tests run within a VSCode instance.
```bash
npm test
```

## 🛠 Features
- **Tool Calling**: Native support for `<tool_call>` protocol.
- **Surgical Edits**: High-precision code modification.
- **Terminal Integration**: Run shell commands directly from the chat.
- **Workspace Exploration**: List and read files with context.

## 🎨 Quality & Aesthetics
Mosaic is designed with a premium dark theme, smooth animations, and a responsive streaming interface for a state-of-the-art coding experience.
