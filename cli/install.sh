#!/usr/bin/env bash
# Mosaic Installer Script
# Usage: curl -sSL https://raw.githubusercontent.com/methil-mods/mosaic/main/cli/install.sh | bash

{

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

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
    command -v "$1" >/dev/null 2>&1
}

# ── Banner ──────────────────────────────────────────────
REPO_URL="https://github.com/methil-mods/mosaic"
RAW_VERSION_URL="https://raw.githubusercontent.com/methil-mods/mosaic/main/cli/VERSION"

TARGET_VERSION=$(curl -sSL "$RAW_VERSION_URL" 2>/dev/null | tr -d '[:space:]' || echo "latest")

echo -e "${PURPLE}${BOLD}"
echo "  __  __  ____   _____         _____  _____  "
echo " |  \/  |/ __ \ / ____|  /\   |_   _|/ ____| "
echo " | \  / | |  | | (___   /  \    | | | |      "
echo " | |\/| | |  | |\___ \ / /\ \   | | | |      "
echo " | |  | | |__| |____) / ____ \ _| |_| ____  "
echo " |_|  |_|\____/|_____/_/    \_\_____|\_____| "
echo -e "${DIM}                                 Made by Methil${NC}"
echo -e "${DIM}------------------------------------------------------------${NC}"
echo -e "🧩 Installing Mosaic ${BOLD}v$TARGET_VERSION${NC}\n"

# ── Requirements ────────────────────────────────────────
if ! check_command git; then
    echo -e "${RED}❌ git is not installed.${NC}"
    exit 1
fi

# ── Python Discovery ───────────────────────────────────
printf "🔍 Searching for Python... "
PYTHON_CMD=""
for cmd in python3.13 python3.12 python3.11 python3.10 python3 python; do
    if check_command "$cmd"; then
        if $cmd -c 'import sys; exit(0 if sys.version_info >= (3, 10) else 1)' </dev/null 2>/dev/null; then
            PYTHON_CMD="$cmd"
            break
        fi
    fi
done

if [[ -z "$PYTHON_CMD" ]]; then
    echo -e "${RED}❌ No suitable Python found (3.10+ required).${NC}"
    exit 1
fi
echo -e "${GREEN}$($PYTHON_CMD --version 2>&1)${NC}"

if ! $PYTHON_CMD -m pip --version </dev/null >/dev/null 2>&1; then
    echo -e "${RED}❌ pip is not available for $PYTHON_CMD.${NC}"
    exit 1
fi

# ── Uninstall old version (silent) ─────────────────────
$PYTHON_CMD -m pip uninstall -y mosaic-tui </dev/null >/dev/null 2>&1

# ── Download ───────────────────────────────────────────
INSTALL_TEMP=$(mktemp -d 2>/dev/null || mktemp -d -t 'mosaic')

printf "📥 Downloading Mosaic...\n"
git clone --progress "$REPO_URL" "$INSTALL_TEMP" --depth 1 2>&1 | while read -d $'\r' -r line; do
    if [[ "$line" =~ ([0-9]+)% ]]; then
        draw_progress_bar "${BASH_REMATCH[1]}" "Downloading"
    fi
done
echo -e "\n   ${GREEN}✓ Downloaded${NC}"

# ── Install ────────────────────────────────────────────
INSTALL_FLAGS=""
if [[ -f /etc/os-release ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    INSTALL_FLAGS="--break-system-packages"
fi

printf "📦 Installing...\n"
$PYTHON_CMD -m pip install "$INSTALL_TEMP/cli" $INSTALL_FLAGS </dev/null >/dev/null 2>&1 &
install_pid=$!
spinner $install_pid "Installing Mosaic CLI..."
wait $install_pid
res=$?

rm -rf "$INSTALL_TEMP"

if [[ $res -ne 0 ]]; then
    echo -e "${RED}❌ Installation failed.${NC}"
    exit 1
fi
echo -e "   ${GREEN}✓ Installed${NC}"

# ── Done ───────────────────────────────────────────────
echo -e "\n${GREEN}${BOLD}✅ Mosaic v$TARGET_VERSION installed!${NC}"

if ! check_command mosaic; then
    echo -e "${YELLOW}⚠️  'mosaic' is not in your PATH.${NC}"
    echo -e "💡 Ensure ${BOLD}~/.local/bin${NC} is in your PATH, then restart your terminal."
else
    echo -e "🚀 Run ${PURPLE}${BOLD}mosaic${NC} to start."
fi
echo -e "${DIM}------------------------------------------------------------${NC}"

exit 0
}
