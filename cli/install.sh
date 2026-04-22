#!/bin/bash

# Mosaic Installer Script
# Optimized for curl -sSL ... | bash

set -e

REPO_URL="https://github.com/methil-mods/mosaic"
RAW_VERSION_URL="https://raw.githubusercontent.com/methil-mods/mosaic/main/cli/VERSION"

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

# Parse arguments
YES_MODE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -y|--yes) YES_MODE=true ;;
    esac
    shift
done

# Spinner function
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
    printf "\r\033[K"
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

check_command() {
    command -v "$1" &> /dev/null
}

show_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    echo "  __  __  ____   _____         _____  _____  "
    echo " |  \/  |/ __ \ / ____|  /\   |_   _|/ ____| "
    echo " | \  / | |  | | (___   /  \    | | | |      "
    echo " | |\/| | |  | |\___ \ / /\ \   | | | |      "
    echo " | |  | | |__| |____) / ____ \ _| |_| ____  "
    echo " |_|  |_|\____/|_____/_/    \_\_____|\_____| "
    echo -e "${DIM}                                 Made by Methil${NC}"
    echo -e "${DIM}------------------------------------------------------------${NC}"
}

# 1. Get Target Version
if [[ -f VERSION ]]; then
    TARGET_VERSION=$(cat VERSION | tr -d '[:space:]')
else
    # Fallback for curl | bash
    TARGET_VERSION=$(curl -sSL "$RAW_VERSION_URL" | tr -d '[:space:]' || echo "0.1.0")
fi

show_banner
echo -e "🧩 Target Version: ${BOLD}v$TARGET_VERSION${NC}\n"

# 2. Check current status
IS_INSTALLED=false
CURRENT_VERSION="none"

if check_command mosaic; then
    IS_INSTALLED=true
    CURRENT_VERSION=$(mosaic --version 2>/dev/null | awk '{print $NF}' | sed 's/^v//' || echo "unknown")
    echo -e "🔎 Detected existing installation: ${CYAN}v$CURRENT_VERSION${NC}"
fi

# 3. Decision Logic
ACTION="install"

if [ "$IS_INSTALLED" = true ]; then
    if [ "$YES_MODE" = true ]; then
        ACTION="install"
    else
        echo -e "\n${BOLD}Mosaic is already installed.${NC}"
        echo -e "What would you like to do?"
        
        if [[ "$CURRENT_VERSION" != "$TARGET_VERSION" && "$CURRENT_VERSION" != "unknown" ]]; then
            echo -e "  1) ${GREEN}${BOLD}Update to v$TARGET_VERSION${NC} (Recommended)"
        else
            echo -e "  1) ${BLUE}Reinstall v$TARGET_VERSION${NC}"
        fi
        echo -e "  2) ${RED}Uninstall Mosaic${NC}"
        echo -e "  3) Cancel"
        
        printf "\nChoice [1-3]: "
        read -r choice
        
        case $choice in
            1) ACTION="install" ;;
            2) ACTION="uninstall" ;;
            *) echo -e "\nCancelled."; exit 0 ;;
        esac
    fi
else
    if [ "$YES_MODE" = false ]; then
        printf "❓ Do you want to install ${PURPLE}Mosaic v$TARGET_VERSION${NC}? [y/N]: "
        read -r confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            echo -e "\nInstallation cancelled."
            exit 0
        fi
    fi
fi

# 4. Execute Action
if [ "$ACTION" = "uninstall" ]; then
    printf "🧹 Uninstalling Mosaic...\n"
    # Try to find python cmd used for installation or just python3
    PY_CMD="python3"
    check_command python3 || PY_CMD="python"
    
    $PY_CMD -m pip uninstall -y mosaic-tui &>/dev/null &
    spinner $! "Removing Mosaic CLI..."
    echo -e "\n${GREEN}✅ Mosaic has been uninstalled.${NC}"
    exit 0
fi

# 5. Installation/Update Flow
# Check requirements
if ! check_command git; then
    echo -e "${RED}❌ Error: git is not installed.${NC}"
    exit 1
fi

# Enhanced Python Discovery
printf "🔍 Searching for Python... "
PYTHON_CMD=""
SEARCH_LIST=("python3.13" "python3.12" "python3.11" "python3.10" "python3" "python")

if [[ "$OSTYPE" == "darwin"* ]]; then
     brew_prefix=$(command -v brew &>/dev/null && brew --prefix || echo "/opt/homebrew")
     SEARCH_LIST=("$brew_prefix/bin/python3.13" "${SEARCH_LIST[@]}")
fi

for cmd in "${SEARCH_LIST[@]}"; do
    if check_command "$cmd"; then
        # Check if version is 3.10+
        if $cmd -c 'import sys; exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
            PYTHON_CMD="$cmd"
            break
        fi
    fi
done

if [[ -z "$PYTHON_CMD" ]]; then
    # Final check just in case bc was missing
    if check_command python3; then PYTHON_CMD="python3"; fi
fi

if [[ -z "$PYTHON_CMD" ]]; then
    echo -e "${RED}❌ Error: No suitable Python found (3.10+ required).${NC}"
    exit 1
fi
echo -e "${GREEN}Found!${NC}"
echo -e "🐍 Using ${YELLOW}$($PYTHON_CMD --version)${NC}"

# Check for pip
if ! $PYTHON_CMD -m pip --version &> /dev/null; then
    echo -e "${RED}❌ Error: pip is not available for $PYTHON_CMD.${NC}"
    exit 1
fi

# Cross-platform temp directory
INSTALL_TEMP=$(mktemp -d 2>/dev/null || mktemp -d -t 'mosaic')
echo -e "📂 Preparing build space in ${DIM}$INSTALL_TEMP${NC}..."

# Clone with depth 1
printf "📥 Downloading Mosaic Assets...\n"
git clone --progress "$REPO_URL" "$INSTALL_TEMP" --depth 1 2>&1 | while read -d $'\r' -r line; do
    if [[ "$line" =~ ([0-9]+)% ]]; then
        draw_progress_bar "${BASH_REMATCH[1]}" "Downloading repository"
    fi
done
echo -e "\n   ${GREEN}✓ Downloaded!${NC}"

# Install CLI
INSTALL_FLAGS=""
if [[ -f /etc/os-release ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    INSTALL_FLAGS="--break-system-packages"
fi

# If already installed, we might want to uninstall first to be clean
if [ "$IS_INSTALLED" = true ]; then
    printf "🔄 Preparing update...\n"
    $PYTHON_CMD -m pip uninstall -y mosaic-tui &>/dev/null &
    spinner $! "Removing old version"
fi

printf "📦 Installing Mosaic CLI...\n"
$PYTHON_CMD -m pip install "$INSTALL_TEMP/cli" $INSTALL_FLAGS &>/dev/null &
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
        echo -e "💡 Add this to your ${BOLD}~/.zshrc${NC}:"
        echo -e "   ${CYAN}export PATH=\"\$PATH:\$($PYTHON_CMD -m site --user-base)/bin\"${NC}"
    else
        echo -e "💡 Ensure ${BOLD}~/.local/bin${NC} is in your PATH."
    fi
else
    echo -e "🚀 Run ${PURPLE}${BOLD}mosaic${NC} to start."
    echo -e "\n💡 ${DIM}If the command still runs the old version, run this in your terminal:${NC}"
    echo -e "   ${CYAN}hash -r${NC} ${DIM}(or reopen your terminal)${NC}"
fi
echo -e "${DIM}------------------------------------------------------------${NC}"
