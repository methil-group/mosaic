#!/bin/bash

# Mosaic CLI Installer

ROOT_DIR="/Users/ethew/Documents/Github/methil-vibe"
SRC_SCRIPT="$ROOT_DIR/mosaic.sh"
DEST_COMMAND="/usr/local/bin/mosaic"

# Minimum required versions
MIN_GLEAM_VERSION="1.0.0"
MIN_NPM_VERSION="8.0.0"

# ANSI Color Codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'
BOLD='\033[1m'
GRAY='\033[0;90m'

echo -e "${CYAN}${BOLD}📦 Initializing Mosaic Installation Sequence...${NC}"
echo -e "${GRAY}───────────────────────────────────────────────────${NC}"

# Function to extract numeric version parts for comparison
version_to_int() {
    echo "$1" | awk -F. '{ printf("%d%03d%03d", $1,$2,$3); }'
}

# 1. Requirement Checks
echo -e "${BOLD}🔍 Validating System Requirements:${NC}"

# Detect OS
OS_TYPE=$(uname -s)
if [ "$OS_TYPE" == "Darwin" ]; then
    OS_NAME="macOS $(sw_vers -productVersion)"
elif [ -f /etc/os-release ]; then
    OS_NAME=$(grep ^PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"')
else
    OS_NAME="$OS_TYPE"
fi
echo -e "  ${GREEN}✔${NC} OS detected:    ${BOLD}$OS_NAME${NC}"

# Check Gleam
if command -v gleam >/dev/null 2>&1; then
    GLEAM_VER=$(gleam --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [ "$(version_to_int "$GLEAM_VER")" -ge "$(version_to_int "$MIN_GLEAM_VERSION")" ]; then
        echo -e "  ${GREEN}✔${NC} Gleam detected: ${BOLD}$GLEAM_VER${NC}"
    else
        echo -e "  ${RED}✘${NC} Gleam version too old: ${BOLD}$GLEAM_VER${NC} (Required: >= $MIN_GLEAM_VERSION)"
        exit 1
    fi
else
    echo -e "  ${RED}✘${NC} Gleam is not installed. Please visit ${BOLD}https://gleam.run/${NC}"
    exit 1
fi

# Check Node/NPM
if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    NODE_VER=$(node --version | tr -d 'v')
    NPM_VER=$(npm --version)
    if [ "$(version_to_int "$NPM_VER")" -ge "$(version_to_int "$MIN_NPM_VERSION")" ]; then
        echo -e "  ${GREEN}✔${NC} Node.js:       ${BOLD}$NODE_VER${NC}"
        echo -e "  ${GREEN}✔${NC} NPM:           ${BOLD}$NPM_VER${NC}"
    else
        echo -e "  ${RED}✘${NC} NPM version too old: ${BOLD}$NPM_VER${NC} (Required: >= $MIN_NPM_VERSION)"
        exit 1
    fi
else
    echo -e "  ${RED}✘${NC} Node.js/NPM is not installed. Please install Node.js."
    exit 1
fi

echo -e "${GRAY}───────────────────────────────────────────────────${NC}"

# 2. Ensure the source script exists
if [ ! -f "$SRC_SCRIPT" ]; then
    echo -e "${RED}❌ Fatal Error:${NC} Source script 'mosaic.sh' not found at $SRC_SCRIPT"
    exit 1
fi

# 3. Make the source script executable
echo -e "${CYAN}🔧 Applying launch permissions...${NC}"
chmod +x "$SRC_SCRIPT"

# 4. Create symlink in /usr/local/bin
echo -e "${CYAN}🔗 Registering global command...${NC}"
echo -e "${YELLOW}${BOLD}Note:${NC} Administrative privileges required for /usr/local/bin"

if sudo ln -sf "$SRC_SCRIPT" "$DEST_COMMAND"; then
    echo -e ""
    echo -e "${GREEN}${BOLD}✨ INSTALLATION COMPLETE${NC}"
    echo -e "   You can now launch the platform by typing: ${BOLD}mosaic${NC}"
else
    echo -e ""
    echo -e "${RED}❌ Installation Failed${NC}"
    echo -e "   Could not create symlink. Please check permissions."
    exit 1
fi
