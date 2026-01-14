#!/bin/bash

# methil-vibe - Installation & Update Script

set -e

# --- Styles & Colors ---
BOLD='\033[1m'
PURPLE='\033[1;35m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
RED='\033[1;31m'
NC='\033[0m' # No Color

# --- Globals ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_NAME="methil-vibe"

# --- Functions ---
log_header() {
    echo -e "\n${BOLD}${PURPLE}=======================================${NC}"
    echo -e "${BOLD}${PURPLE}   🧪 METHIL VIBE - $1${NC}"
    echo -e "${BOLD}${PURPLE}=======================================${NC}\n"
}

log_info() {
    echo -e "${CYAN}➜  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# --- Main Script ---

log_header "INSTALLATION"

# Check if conda is available
if ! command -v conda &> /dev/null; then
    log_error "Conda not found. Please install Miniconda or Anaconda first."
    exit 1
fi

# Initialize conda for script
eval "$(conda shell.bash hook)"

# Check if environment exists
if conda env list | grep -q "^${ENV_NAME} "; then
    log_info "Updating existing environment '${ENV_NAME}'..."
    conda activate $ENV_NAME
else
    log_info "Creating new environment '${ENV_NAME}'..."
    conda create -n $ENV_NAME python=3.11 -y
    conda activate $ENV_NAME
fi

# Install/update the package
log_info "Installing dependencies..."
cd "$SCRIPT_DIR"
pip install -e . --upgrade --quiet

echo ""
log_success "Installation complete!"
echo ""
echo -e "${BOLD}Usage:${NC}"
echo -e "  ${CYAN}conda activate $ENV_NAME${NC}"
echo -e "  ${CYAN}methil-vibe${NC}"
echo ""
