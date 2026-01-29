#!/bin/bash

# Maestro Plugin Installation Helper Script
#
# This script helps with development setup and manual installation.
# For most users, the recommended installation is via Claude Code:
#   /plugin install wamoscode/maestro-plugin

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Plugin info
PLUGIN_NAME="maestro"
PLUGIN_VERSION="1.9.0"
GITHUB_REPO="https://github.com/wamoscode/maestro-plugin"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Maestro Plugin Installation Helper       ║${NC}"
echo -e "${BLUE}║            Version ${PLUGIN_VERSION}                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory (where the plugin source is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${CYAN}For most users, install directly in Claude Code:${NC}"
echo -e "${GREEN}  /plugin install wamoscode/maestro-plugin${NC}"
echo ""
echo -e "${YELLOW}This script is for development setup and manual installation.${NC}"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "  1) Install MCP server dependencies (npm install)"
echo "  2) Validate plugin structure"
echo "  3) Create local development config"
echo "  4) Show Claude Code installation commands"
echo "  5) Exit"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}Installing MCP server dependencies...${NC}"

        # Check for Node.js
        if ! command -v node &> /dev/null; then
            echo -e "${RED}✗ Node.js not found. Please install Node.js 18 or later.${NC}"
            exit 1
        fi

        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js found: ${NODE_VERSION}${NC}"

        # Check for npm
        if ! command -v npm &> /dev/null; then
            echo -e "${RED}✗ npm not found. Please install npm.${NC}"
            exit 1
        fi

        # Install dependencies in mcp directory
        if [ -f "$SCRIPT_DIR/mcp/package.json" ]; then
            cd "$SCRIPT_DIR/mcp"
            npm install
            echo -e "${GREEN}✓ MCP server dependencies installed${NC}"
        else
            echo -e "${YELLOW}No package.json found in mcp directory${NC}"
        fi

        # Also install root dependencies if present
        if [ -f "$SCRIPT_DIR/package.json" ]; then
            cd "$SCRIPT_DIR"
            npm install
            echo -e "${GREEN}✓ Root dependencies installed${NC}"
        fi
        ;;

    2)
        echo ""
        echo -e "${BLUE}Validating plugin structure...${NC}"

        # Check for required files
        ERRORS=0

        if [ -f "$SCRIPT_DIR/.claude-plugin/plugin.json" ]; then
            echo -e "${GREEN}✓ .claude-plugin/plugin.json exists${NC}"
            # Validate JSON
            if command -v jq &> /dev/null; then
                if jq empty "$SCRIPT_DIR/.claude-plugin/plugin.json" 2>/dev/null; then
                    echo -e "${GREEN}✓ plugin.json is valid JSON${NC}"
                else
                    echo -e "${RED}✗ plugin.json is invalid JSON${NC}"
                    ERRORS=$((ERRORS + 1))
                fi
            fi
        else
            echo -e "${RED}✗ .claude-plugin/plugin.json not found${NC}"
            ERRORS=$((ERRORS + 1))
        fi

        if [ -d "$SCRIPT_DIR/commands" ]; then
            CMD_COUNT=$(find "$SCRIPT_DIR/commands" -name "*.md" | wc -l | tr -d ' ')
            echo -e "${GREEN}✓ commands/ directory exists (${CMD_COUNT} commands)${NC}"
        else
            echo -e "${RED}✗ commands/ directory not found${NC}"
            ERRORS=$((ERRORS + 1))
        fi

        if [ -d "$SCRIPT_DIR/subagents" ]; then
            AGENT_COUNT=$(find "$SCRIPT_DIR/subagents" -name "*.md" | wc -l | tr -d ' ')
            echo -e "${GREEN}✓ subagents/ directory exists (${AGENT_COUNT} agents)${NC}"
        else
            echo -e "${YELLOW}⚠ subagents/ directory not found${NC}"
        fi

        if [ -f "$SCRIPT_DIR/mcp/server.js" ]; then
            echo -e "${GREEN}✓ mcp/server.js exists${NC}"
        else
            echo -e "${YELLOW}⚠ mcp/server.js not found${NC}"
        fi

        echo ""
        if [ $ERRORS -eq 0 ]; then
            echo -e "${GREEN}Plugin structure is valid!${NC}"
        else
            echo -e "${RED}Found ${ERRORS} error(s). Please fix before installing.${NC}"
        fi
        ;;

    3)
        echo ""
        echo -e "${BLUE}Creating local development config...${NC}"

        # Create maestro config directory
        CONFIG_DIR="$HOME/.maestro"
        mkdir -p "$CONFIG_DIR"
        mkdir -p "$CONFIG_DIR/logs"
        mkdir -p "$CONFIG_DIR/metrics"
        mkdir -p "$CONFIG_DIR/workflows"

        # Create default config if not exists
        if [ ! -f "$CONFIG_DIR/config.json" ]; then
            cat > "$CONFIG_DIR/config.json" << 'EOF'
{
  "version": "1.9.0",
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
            echo -e "${GREEN}✓ Created ~/.maestro/config.json${NC}"
        else
            echo -e "${YELLOW}Config already exists at ~/.maestro/config.json${NC}"
        fi

        echo -e "${GREEN}✓ Development config ready${NC}"
        ;;

    4)
        echo ""
        echo -e "${BLUE}Claude Code Installation Commands:${NC}"
        echo ""
        echo -e "${CYAN}Option 1: Direct install from GitHub${NC}"
        echo -e "  ${GREEN}/plugin install wamoscode/maestro-plugin${NC}"
        echo ""
        echo -e "${CYAN}Option 2: Install via marketplace${NC}"
        echo -e "  ${GREEN}/plugin marketplace add wamoscode/maestro-plugin${NC}"
        echo -e "  ${GREEN}/plugin install maestro@maestro-plugins${NC}"
        echo ""
        echo -e "${CYAN}Option 3: Install from local directory${NC}"
        echo -e "  ${GREEN}/plugin install ${SCRIPT_DIR}${NC}"
        echo ""
        echo -e "${CYAN}After installation, verify with:${NC}"
        echo -e "  ${GREEN}/plugin list${NC}"
        echo -e "  ${GREEN}/list-subagents${NC}"
        ;;

    5)
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
echo -e "For more information, visit: ${BLUE}${GITHUB_REPO}${NC}"
