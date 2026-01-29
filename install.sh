#!/bin/bash

# Mosaic CLI Installer

ROOT_DIR="/Users/ethew/Documents/Github/methil-vibe"
SRC_SCRIPT="$ROOT_DIR/mosaic.sh"
DEST_COMMAND="/usr/local/bin/mosaic"

# ANSI Color Codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}📦 Installing Mosaic CLI Toolset...${NC}"

# 1. Ensure the source script exists
if [ ! -f "$SRC_SCRIPT" ]; then
    echo -e "${RED}❌ Error: Source script mosaic.sh not found at $SRC_SCRIPT${NC}"
    exit 1
fi

# 2. Make the source script executable
echo -e "${CYAN}🔧 Setting permissions...${NC}"
chmod +x "$SRC_SCRIPT"

# 3. Create symlink in /usr/local/bin
echo -e "${CYAN}🔗 Linking command to system path...${NC}"
echo -e "${BOLD}Note:${NC} This step might require your password to write to /usr/local/bin"

if sudo ln -sf "$SRC_SCRIPT" "$DEST_COMMAND"; then
    echo -e "${GREEN}${BOLD}✅ Installation Successful!${NC}"
    echo -e "You can now launch the entire ecosystem by simply typing: ${BOLD}mosaic${NC}"
else
    echo -e "${RED}❌ Installation failed.${NC}"
    echo -e "Please ensure you have permissions to write to /usr/local/bin or try running with sudo."
    exit 1
fi
