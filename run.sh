#!/bin/bash
# wasnt made by me dont remember where this was from.

RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
BLUE="\e[34m"
RESET="\e[0m"
log() {
    echo -e "${BLUE}[INFO]${RESET} $1"
}
ok() {
    echo -e "${GREEN}[OK]${RESET} $1"
}
warn() {
    echo -e "${YELLOW}[WARN]${RESET} $1"
}
err() {
    echo -e "${RED}[ERROR]${RESET} $1"
}
if ! command -v node > /dev/null 2>&1; then
    err "Node.js is not installed!"
    echo -e "${YELLOW}Download it here:${RESET} https://nodejs.org"
    exit 1
fi
ok "Node.js found."
REQUIRED_VERSION=18
NODE_MAJOR=$(node -v | sed 's/v\([0-9]\+\).*/\1/')
if [ "$NODE_MAJOR" -lt "$REQUIRED_VERSION" ]; then
    err "Node version $NODE_MAJOR detected, but $REQUIRED_VERSION or higher required!"
    exit 1
fi
ok "Node version $(node -v) is compatible."
if ! command -v npm > /dev/null 2>&1; then
    err "npm not found!"
    echo -e "${YELLOW}Please install npm.${RESET}"
    exit 1
fi
ok "npm found."
if [ ! -f package.json ]; then
    warn "No package.json found!"
    warn "Skipping dependency installation."
else
    if [ ! -d node_modules ]; then
        warn "node_modules missing — installing packages..."
        npm install
        ok "Packages installed!"
    else
        log "node_modules exists — checking integrity..."

        # quick check to detect corrupt installs
        if ! npm ls >/dev/null 2>&1; then
            warn "Dependency tree broken — reinstalling clean!"
            rm -rf node_modules package-lock.json
            npm install
            ok "Packages reinstalled successfully."
        else
            ok "Dependencies look good."
        fi
    fi
fi
log "Starting..."
echo ""
node app.js
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    err "App exited with code $EXIT_CODE"
    exit $EXIT_CODE
else
    ok "App finished"
fi
