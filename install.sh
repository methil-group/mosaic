#!/bin/bash

# methil-vibe - Installation & Update Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_NAME="methil-vibe"

echo "🧪 methil-vibe - Installation"
echo "=============================="

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "❌ Conda not found. Please install Miniconda or Anaconda first."
    exit 1
fi

# Initialize conda for script
eval "$(conda shell.bash hook)"

# Check if environment exists
if conda env list | grep -q "^${ENV_NAME} "; then
    echo "📦 Updating existing environment..."
    conda activate $ENV_NAME
else
    echo "📦 Creating new environment..."
    conda create -n $ENV_NAME python=3.11 -y
    conda activate $ENV_NAME
fi

# Install/update the package
echo "⬇️  Installing dependencies..."
cd "$SCRIPT_DIR"
pip install -e . --upgrade --quiet

echo ""
echo "✅ Installation complete!"
echo ""
echo "Usage:"
echo "  conda activate $ENV_NAME"
echo "  methil-vibe"
echo ""
