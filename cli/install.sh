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
if check_command python3.14; then
    PYTHON_CMD="python3.14"
elif check_command python3; then
    PYTHON_CMD="python3"
elif check_command python; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python is not installed."
    exit 1
fi

echo "🐍 Using $($PYTHON_CMD --version)"

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

# Install CLI
echo "📦 Installing Mosaic CLI..."
# Use --break-system-packages if needed, or better yet, recommend a venv
if ! $PYTHON_CMD -m pip install ./cli; then
    echo "⚠️  Standard installation failed. Attempting with --break-system-packages (PEP 668 compatibility)..."
    $PYTHON_CMD -m pip install ./cli --break-system-packages || {
        echo "❌ Installation failed. You might need to use a virtual environment."
        exit 1
    }
fi

echo "✅ Mosaic has been successfully installed!"
echo "🚀 Try running 'mosaic' to get started."
