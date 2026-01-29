#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                                 Mosaic                                    ║
# ║           Modular Platform for AI Interaction & Code Ecosystem            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

VERSION="1.1.0"

# Paths
ROOT_DIR="/Users/ethew/Documents/Github/methil-vibe"
BACKEND_DIR="$ROOT_DIR/mosaic"
FRONTEND_DIR="$ROOT_DIR/mosaic-front"

# UI Constants
FRONTEND_PORT=3715
BACKEND_PORT=3710

# ANSI Color Palette
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
YELLOW='\033[0;33m'
GRAY='\033[0;90m'
NC='\033[0m'
BOLD='\033[1m'
UNDERLINE='\033[4m'

# Progress Characters
CHECKMARK="✔"
ARROW="➜"
DOTS="... "

show_help() {
    echo -e "${BOLD}${PURPLE}Mosaic${NC} v$VERSION"
    echo ""
    echo -e "${BOLD}USAGE:${NC}"
    echo "  mosaic [options]"
    echo ""
    echo -e "${BOLD}OPTIONS:${NC}"
    echo "  --help, -h     Show this help message"
    echo "  --version, -v  Show version information"
    echo ""
    echo -e "Launched without options, this starts the full ecosystem."
}

if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

if [[ "$1" == "--version" || "$1" == "-v" ]]; then
    echo "Mosaic CLI v$VERSION"
    exit 0
fi

clear
echo -e "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}${BOLD}   Initializing Mosaic Ecosystem${NC}"
echo -e "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cleanup() {
    echo ""
    echo -e "${YELLOW}${BOLD}⚠️  Termination signal received...${NC}"
    echo -e "${GRAY}┖ Sending SIGTERM to process group...${NC}"
    
    [[ -n $BACKEND_PID ]] && kill -TERM "$BACKEND_PID" 2>/dev/null
    [[ -n $FRONTEND_PID ]] && kill -TERM "$FRONTEND_PID" 2>/dev/null
    
    sleep 1.2
    
    echo -e "${GRAY}┖ Finalizing cleanup process...${NC}"
    [[ -n $BACKEND_PID ]] && kill -KILL "$BACKEND_PID" 2>/dev/null
    [[ -n $FRONTEND_PID ]] && kill -KILL "$FRONTEND_PID" 2>/dev/null
    
    echo -e "${GREEN}${BOLD}${CHECKMARK} System offline. Safe journey.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -en "${CYAN}${BOLD}[1/2]${NC} Launching Backend Engine${DOTS}"
cd "$BACKEND_DIR" || { echo -e "${RED}❌ Error: Backend path mismatch.${NC}"; exit 1; }
gleam run > /dev/null 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}${CHECKMARK} ONLINE${NC}"

# Start Frontend
echo -en "${CYAN}${BOLD}[2/2]${NC} Launching Frontend Hub${DOTS}"
cd "$FRONTEND_DIR" || { echo -e "${RED}❌ Error: Frontend path mismatch.${NC}"; exit 1; }
PORT=$FRONTEND_PORT npm run dev -- --port $FRONTEND_PORT > /dev/null 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}${CHECKMARK} ONLINE${NC}"

echo ""
echo -e "${PURPLE}${BOLD}✨ MOSAIC IS NOW BROADCASTING${NC}"
echo -e "${GRAY}───────────────────────────────────────────────────────────────────────────${NC}"
echo -e "  ${BOLD}${CYAN}${ARROW} BACKEND:  ${NC}${UNDERLINE}http://localhost:$BACKEND_PORT${NC}"
echo -e "  ${BOLD}${CYAN}${ARROW} FRONTEND: ${NC}${UNDERLINE}http://localhost:$FRONTEND_PORT${NC}"
echo -e "${GRAY}───────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BOLD}${YELLOW}  [CTRL+C to safely hibernate the system]${NC}"
echo ""

# Keep alive
wait $BACKEND_PID $FRONTEND_PID
