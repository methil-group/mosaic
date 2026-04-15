#!/bin/bash

# Mosaic Installer Script
# This script clones the Mosaic repository and installs the CLI tool.

set -e

REPO_URL="https://github.com/methil-group/mosaic"

echo "🧩 Installing Mosaic..."

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

# Spinner function
spinner() {
    local pid=$1
    local delay=0.15
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps -p $pid -o pid=)" ]; do
        local temp=${spinstr#?}
        printf " ${PURPLE}%c${NC} " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Function to check for commands
check_command() {
    command -v "$1" &> /dev/null
}

clear
echo -e "${PURPLE}${BOLD}🧩 Mosaic Installer${NC}"
echo -e "${DIM}----------------------------------------${NC}"

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
printf "📥 Downloading Mosaic... "
git clone "$REPO_URL" "$INSTALL_TEMP" --depth 1 &>/dev/null &
spinner $!
echo -e "${GREEN}Done!${NC}"

cd "$INSTALL_TEMP"

# Clean up
printf "🧹 Cleaning environment... "
$PYTHON_CMD -m pip uninstall -y mosaic-tui &>/dev/null &
spinner $!
echo -e "${GREEN}Done!${NC}"

# Install CLI
printf "📦 Installing Mosaic CLI... "
INSTALL_FLAGS=""
if [[ -f /etc/os-release ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    INSTALL_FLAGS="--break-system-packages"
fi

# Executing install in background for spinner
$PYTHON_CMD -m pip install ./cli $INSTALL_FLAGS &>/dev/null &
install_pid=$!
spinner $install_pid
wait $install_pid
res=$?

if [[ $res -ne 0 ]]; then
    echo -e "${RED}❌ Installation failed.${NC}"
    rm -rf "$INSTALL_TEMP"
    exit 1
fi
echo -e "${GREEN}Done!${NC}"

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
echo -e "${DIM}----------------------------------------${NC}"
