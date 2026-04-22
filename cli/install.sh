#!/bin/bash

# Mosaic Installer Script
# This script clones the Mosaic repository and installs the CLI tool.

set -e

REPO_URL="https://github.com/methil-mods/mosaic"

MOSAIC_VERSION="0.0.3"
echo "🧩 Installing Mosaic v$MOSAIC_VERSION..."

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Spinner function — uses \r (carriage return) to avoid backspace corruption
spinner() {
    local pid=$1
    local msg=$2
    local delay=0.1
    local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⦿' '⠧' '⠇' '⠏')
    local i=0
    while kill -0 "$pid" 2>/dev/null; do
        printf "\r  ${PURPLE}${frames[$i]}${NC}  %s " "$msg"
        i=$(( (i + 1) % ${#frames[@]} ))
        sleep $delay
    done
    printf "\r\033[K"  # clear the spinner line
}

draw_progress_bar() {
    local percentage=$1
    local msg=$2
    local width=30
    local filled=$(( width * percentage / 100 ))
    local empty=$(( width - filled ))
    printf "\r  ${BOLD}${PURPLE}📥${NC} %-30s ${BOLD}[${PURPLE}" "$msg"
    for ((i=0; i<$filled; i++)); do printf "█"; done
    printf "${DIM}"
    for ((i=0; i<$empty; i++)); do printf "░"; done
    printf "${NC}${BOLD}]${NC} ${CYAN}%3d%%${NC}" "$percentage"
}

# Function to check for commands
check_command() {
    command -v "$1" &> /dev/null
}

clear
echo -e "${PURPLE}${BOLD}"
echo "  __  __  ____   _____         _____  _____  "
echo " |  \/  |/ __ \ / ____|  /\   |_   _|/ ____| "
echo " | \  / | |  | | (___   /  \    | | | |      "
echo " | |\/| | |  | |\___ \ / /\ \   | | | |      "
echo " | |  | | |__| |____) / ____ \ _| |_| ____  "
echo " |_|  |_|\____/|_____/_/    \_\_____|\_____| "
echo -e "${DIM}                                 v$MOSAIC_VERSION | Made by Methil${NC}"
echo -e "${DIM}------------------------------------------------------------${NC}"

# Check requirements
if ! check_command git; then
    echo -e "${RED}❌ Error: git is not installed.${NC}"
    exit 1
fi

# Enhanced Python Discovery
printf "🔍 Searching for Python... "
PYTHON_CMD=""
SEARCH_LIST=("python3.13" "python3.12" "python3.11" "python3.10" "python3" "python" "python3.14")

if [[ "$OSTYPE" == "darwin"* ]]; then
     brew_prefix=$(command -v brew &>/dev/null && brew --prefix || echo "/opt/homebrew")
     SEARCH_LIST=("$brew_prefix/bin/python3.13" "${SEARCH_LIST[@]}")
fi

for cmd in "${SEARCH_LIST[@]}"; do
    if check_command "$cmd"; then
        VERSION=$($cmd -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "0.0")
        if [[ "$VERSION" == "3.14" ]] && [[ -z "$PYTHON_CMD" ]]; then
            TEMP_PYTHON="$cmd"
            continue
        fi
        PYTHON_CMD="$cmd"
        break
    fi
done

PYTHON_CMD=${PYTHON_CMD:-$TEMP_PYTHON}

if [[ -z "$PYTHON_CMD" ]]; then
    echo -e "${RED}❌ Error: No suitable Python found (3.10+ required).${NC}"
    exit 1
fi
echo -e "${GREEN}Found!${NC}"
echo -e "🐍 Using ${YELLOW}$($PYTHON_CMD --version)${NC} at ${DIM}$(which $PYTHON_CMD)${NC}"

# Check for pip
if ! $PYTHON_CMD -m pip --version &> /dev/null; then
    echo -e "${RED}❌ Error: pip is not available for $PYTHON_CMD.${NC}"
    exit 1
fi

# Cross-platform temp directory
INSTALL_TEMP=$(mktemp -d 2>/dev/null || mktemp -d -t 'mosaic')
echo -e "📂 Preparing build space in ${BLUE}$INSTALL_TEMP${NC}..."

# Clone with depth 1
printf "📥 Downloading Mosaic Assets...\n"
# Using git clone --progress and parsing stderr for percentage
git clone --progress "$REPO_URL" "$INSTALL_TEMP" --depth 1 2>&1 | while read -d $'\r' -r line; do
    if [[ "$line" =~ ([0-9]+)% ]]; then
        draw_progress_bar "${BASH_REMATCH[1]}" "Downloading repository"
    fi
done
echo -e "\n   ${GREEN}✓ Downloaded!${NC}"

cd "$INSTALL_TEMP"

# Clean up
printf "🧹 Cleaning environment...\n"
$PYTHON_CMD -m pip uninstall -y mosaic-tui &>/dev/null &
spinner $! "Removing old installation"
echo -e "   ${GREEN}✓ Environment clean!${NC}"

# Install CLI
INSTALL_FLAGS=""
if [[ -f /etc/os-release ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    INSTALL_FLAGS="--break-system-packages"
fi
printf "📦 Installing Mosaic CLI...\n"
$PYTHON_CMD -m pip install ./cli $INSTALL_FLAGS &>/dev/null &
install_pid=$!
spinner $install_pid "Installing Mosaic CLI..."
wait $install_pid
res=$?

if [[ $res -ne 0 ]]; then
    echo -e "${RED}❌ Installation failed.${NC}"
    rm -rf "$INSTALL_TEMP"
    exit 1
fi
echo -e "   ${GREEN}✓ Installed!${NC}"

# Cleanup
rm -rf "$INSTALL_TEMP"

echo -e "\n${GREEN}${BOLD}✅ Mosaic successfully installed!${NC}"

# Final PATH Check
if ! check_command mosaic; then
    echo -e "${YELLOW}⚠️  Warning: 'mosaic' command was installed but is not in your PATH.${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "💡 Add this to your ${BOLD}~/.zshrc${NC} or ${BOLD}~/.bash_profile${NC}:"
        echo -e "   ${CYAN}export PATH=\"\$PATH:\$($PYTHON_CMD -m site --user-base)/bin\"${NC}"
    else
        echo -e "💡 Ensure ${BOLD}~/.local/bin${NC} is in your PATH."
    fi
else
    echo -e "🚀 Run ${PURPLE}${BOLD}mosaic${NC} to start."
fi
echo -e "${DIM}------------------------------------------------------------${NC}"
