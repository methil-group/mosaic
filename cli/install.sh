#!/bin/bash

# Mosaic Installer Script
# This script clones the Mosaic repository and installs the CLI tool.

set -e

REPO_URL="https://github.com/methil-mods/mosaic"
INSTALL_DIR="mosaic"

echo "🧩 Installing Mosaic..."

# Check dependencies
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed."
    exit 1
fi

if ! command -v pip &> /dev/null; then
    echo "❌ Error: pip is not installed."
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
pip install -e ./cli

echo "✅ Mosaic has been successfully installed!"
echo "🚀 Try running 'mosaic' to get started."
