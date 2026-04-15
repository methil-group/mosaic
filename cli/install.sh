#!/bin/bash

# Mosaic Installer Script
# This script clones the Mosaic repository and installs the CLI tool.

set -e

REPO_URL="https://github.com/methil-group/mosaic"
INSTALL_DIR="mosaic"

echo "🧩 Installing Mosaic..."

# Function to check for commands
check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

# Check dependencies
if ! check_command git; then
    echo "❌ Error: git is not installed."
    exit 1
fi

PYTHON_CMD=""
# Search order: stable versions first, then generic python3, then 3.14 as last resort
for cmd in python3.13 python3.12 python3.11 python3.10 python3 python python3.14; do
    if check_command "$cmd"; then
        # If it's python3 or python, check if it's 3.14. If so, keep looking unless nothing else found.
        VERSION=$($cmd -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "0.0")
        if [[ "$VERSION" == "3.14" ]] && [[ "$PYTHON_CMD" == "" ]]; then
            # Found 3.14, but we'll only use it if we don't find others
            TEMP_PYTHON="$cmd"
            continue
        fi
        PYTHON_CMD="$cmd"
        break
    fi
done

if [[ -z "$PYTHON_CMD" ]]; then
    PYTHON_CMD="$TEMP_PYTHON"
fi

if [[ -z "$PYTHON_CMD" ]]; then
    echo "❌ Error: Python is not installed."
    exit 1
fi

echo "🐍 Using $($PYTHON_CMD --version) (Command: $PYTHON_CMD)"

# Ensure pip is available
if ! $PYTHON_CMD -m pip --version &> /dev/null; then
    echo "❌ Error: pip is not available for $PYTHON_CMD."
    echo "💡 Try installing it with: sudo apt install python3-pip (on Debian/Ubuntu)"
    exit 1
fi

# Clone repository
if [ -d "$INSTALL_DIR" ]; then
    echo "⚠️  Directory '$INSTALL_DIR' already exists. Pulling latest changes..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "📂 Cloning repository from $REPO_URL..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Uninstall existing first to ensure a clean slate
echo "🧹 Removing existing installation..."
$PYTHON_CMD -m pip uninstall -y mosaic-tui &> /dev/null || true

# Install CLI
echo "📦 Installing Mosaic CLI..."
# Force standard installation (not editable) to avoid path issues
if ! $PYTHON_CMD -m pip install ./cli; then
    echo "⚠️  Standard installation failed. Attempting with --break-system-packages (PEP 668 compatibility)..."
    $PYTHON_CMD -m pip install ./cli --break-system-packages || {
        echo "❌ Installation failed. You might need to use a virtual environment."
        exit 1
    }
fi

echo "✅ Mosaic has been successfully installed!"
echo "🚀 Try running 'mosaic' to get started."
