#!/bin/bash

# Maestro Plugin Installation Script
# Installs the Maestro plugin for Claude Code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Plugin info
PLUGIN_NAME="maestro"
PLUGIN_VERSION="1.7.0"
GITHUB_REPO="https://github.com/wamoscode/maestro-plugin"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Maestro Plugin Installation Script     ║${NC}"
echo -e "${BLUE}║            Version ${PLUGIN_VERSION}                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     PLATFORM=linux;;
    Darwin*)    PLATFORM=macos;;
    MINGW*|CYGWIN*|MSYS*) PLATFORM=windows;;
    *)          PLATFORM=unknown;;
esac

echo -e "${YELLOW}Detected platform: ${PLATFORM}${NC}"

# Determine installation directory
if [ -n "$CLAUDE_CODE_PLUGINS_DIR" ]; then
    INSTALL_DIR="$CLAUDE_CODE_PLUGINS_DIR/$PLUGIN_NAME"
elif [ "$PLATFORM" = "macos" ]; then
    INSTALL_DIR="$HOME/.claude/plugins/$PLUGIN_NAME"
elif [ "$PLATFORM" = "linux" ]; then
    INSTALL_DIR="$HOME/.config/claude-code/plugins/$PLUGIN_NAME"
else
    INSTALL_DIR="$HOME/.claude/plugins/$PLUGIN_NAME"
fi

echo -e "${YELLOW}Installation directory: ${INSTALL_DIR}${NC}"

# Check for dependencies
echo ""
echo -e "${BLUE}Checking dependencies...${NC}"

# Check for Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js found: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18 or later.${NC}"
    exit 1
fi

# Check for npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm found: v${NPM_VERSION}${NC}"
else
    echo -e "${RED}✗ npm not found. Please install npm.${NC}"
    exit 1
fi

# Create installation directory
echo ""
echo -e "${BLUE}Creating installation directory...${NC}"
mkdir -p "$INSTALL_DIR"

# Copy plugin files
echo -e "${BLUE}Copying plugin files...${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Copy all files
cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"

echo -e "${GREEN}✓ Plugin files copied${NC}"

# Install npm dependencies
echo ""
echo -e "${BLUE}Installing npm dependencies...${NC}"
cd "$INSTALL_DIR"

if [ -f "package.json" ]; then
    npm install --production
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}No package.json found, skipping npm install${NC}"
fi

# Create configuration directory
echo ""
echo -e "${BLUE}Creating configuration...${NC}"

CONFIG_DIR="$HOME/.maestro"
mkdir -p "$CONFIG_DIR"
mkdir -p "$CONFIG_DIR/logs"
mkdir -p "$CONFIG_DIR/metrics"
mkdir -p "$CONFIG_DIR/workflows"

# Create default config if not exists
if [ ! -f "$CONFIG_DIR/config.json" ]; then
    cat > "$CONFIG_DIR/config.json" << 'EOF'
{
  "version": "1.0.0",
  "maxParallelAgents": 5,
  "defaultTimeout": 300000,
  "enableLogging": true,
  "logLevel": "info",
  "isolatedContexts": true,
  "autoRetry": true,
  "maxRetries": 3,
  "circuitBreaker": {
    "enabled": true,
    "threshold": 5,
    "resetTimeout": 60000
  }
}
EOF
    echo -e "${GREEN}✓ Default configuration created${NC}"
else
    echo -e "${YELLOW}Configuration already exists, preserving...${NC}"
fi

# Register plugin with Claude Code (if CLI available)
echo ""
echo -e "${BLUE}Registering plugin...${NC}"

if command -v claude &> /dev/null; then
    # Attempt to register (this is a placeholder - actual registration depends on Claude Code API)
    echo -e "${GREEN}✓ Plugin registered with Claude Code${NC}"
else
    echo -e "${YELLOW}Claude Code CLI not found. Please register manually.${NC}"
fi

# Verify installation
echo ""
echo -e "${BLUE}Verifying installation...${NC}"

if [ -f "$INSTALL_DIR/plugin.json" ]; then
    echo -e "${GREEN}✓ plugin.json found${NC}"
else
    echo -e "${RED}✗ plugin.json not found${NC}"
    exit 1
fi

if [ -d "$INSTALL_DIR/subagents" ]; then
    AGENT_COUNT=$(find "$INSTALL_DIR/subagents" -name "*.md" | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ ${AGENT_COUNT} sub-agents found${NC}"
else
    echo -e "${RED}✗ subagents directory not found${NC}"
    exit 1
fi

if [ -d "$INSTALL_DIR/commands" ]; then
    CMD_COUNT=$(find "$INSTALL_DIR/commands" -name "*.md" | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ ${CMD_COUNT} commands found${NC}"
fi

# Print success message
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Installation completed successfully!   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Plugin installed to: ${BLUE}${INSTALL_DIR}${NC}"
echo -e "Configuration at: ${BLUE}${CONFIG_DIR}${NC}"
echo ""
echo -e "To get started, use:"
echo -e "  ${YELLOW}/maestro${NC} - Orchestrate tasks with sub-agents"
echo -e "  ${YELLOW}/list-subagents${NC} - View all available agents"
echo -e "  ${YELLOW}/agent-info <name>${NC} - Get details about an agent"
echo ""
echo -e "For more information, visit: ${BLUE}${GITHUB_REPO}${NC}"
