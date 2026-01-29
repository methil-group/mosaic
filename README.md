# Mosaic

> **The Modular AI Interaction & Code Ecosystem**

Mosaic is an advanced platform designed to provide an easy and efficient pipeline for running AI locally. It features a high-performance Gleam-powered backend and a premium Nuxt-based frontend hub for seamless agentic workflows.

---

## Quick Start (CLI)

We provide a specialized CLI tool to launch the entire Mosaic ecosystem with a single command.

### Installation

To register the `mosaic` command globally on your system, run the installation script from the project root:

```bash
chmod +x install.sh
./install.sh
```

> [!NOTE]
> This will create a symlink in `/usr/local/bin` and may require your system password.

### Usage

Once installed, you can launch the platform from anywhere in your terminal:

```bash
mosaic
```

#### Commands & Flags
| Command | Description |
| :--- | :--- |
| `mosaic` | Start Backend (3710) and Frontend (3715) |
| `mosaic --help` | Show CLI help and usage |
| `mosaic --version` | Check the current CLI version |

---

## System Architecture

- **Backend**: Built with [Gleam](https://gleam.run/) (Erlang/OTP). Handles high-concurrency agent logic and tool execution.
- **Frontend**: Built with [Nuxt 4](https://nuxt.com/) and Vue 3. A premium, reactive dashboard for interacting with your AI agents.

### Ports
- **Frontend Hub**: `http://localhost:3715`
- **Engine API**: `http://localhost:3710`

---

## Manual Development

If you prefer to run the services individually:

### Backend
```bash
cd mosaic
gleam run
```

### Frontend
```bash
cd mosaic-front
npm run dev -- --port 3715
```

---

## Stopping the System

When using the `mosaic` CLI, simply press **`Ctrl + C`**. The CLI will automatically handle the graceful shutdown of both the backend and frontend processes for you.

---

*Built for the future of agentic coding.*
