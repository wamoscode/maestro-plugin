#!/bin/bash

# Sync Agents Script
# Downloads latest agent definitions from the awesome-claude-code-subagents repository

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Repository info
SOURCE_REPO="https://github.com/VoltAgent/awesome-claude-code-subagents"
SOURCE_BRANCH="main"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Agent Synchronization Script        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Get plugin directory
if [ -n "$1" ]; then
    PLUGIN_DIR="$1"
else
    PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

SUBAGENTS_DIR="$PLUGIN_DIR/subagents"
TEMP_DIR=$(mktemp -d)

echo -e "${YELLOW}Plugin directory: ${PLUGIN_DIR}${NC}"
echo -e "${YELLOW}Temp directory: ${TEMP_DIR}${NC}"
echo ""

# Clone source repository
echo -e "${BLUE}Fetching latest agent definitions...${NC}"

if command -v git &> /dev/null; then
    git clone --depth 1 --branch "$SOURCE_BRANCH" "$SOURCE_REPO" "$TEMP_DIR/source" 2>/dev/null
    echo -e "${GREEN}✓ Repository cloned${NC}"
else
    echo -e "${RED}✗ Git not found. Please install git.${NC}"
    exit 1
fi

# Create backup
echo ""
echo -e "${BLUE}Creating backup...${NC}"
BACKUP_DIR="$PLUGIN_DIR/.backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$SUBAGENTS_DIR" "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup created at ${BACKUP_DIR}${NC}"

# Category mapping from source to local
declare -A CATEGORY_MAP=(
    ["01-core-development"]="01-core-development"
    ["02-language-specialists"]="02-language-specialists"
    ["03-infrastructure"]="03-infrastructure"
    ["04-quality-security"]="04-quality-security"
    ["05-data-ai"]="05-data-ai"
    ["06-developer-experience"]="06-developer-experience"
    ["07-specialized-domains"]="07-specialized-domains"
    ["08-business-product"]="08-business-product"
    ["09-meta-orchestration"]="09-meta-orchestration"
    ["10-research-analysis"]="10-research-analysis"
)

# Sync agents
echo ""
echo -e "${BLUE}Syncing agents...${NC}"

NEW_AGENTS=0
UPDATED_AGENTS=0
SKIPPED_AGENTS=0

SOURCE_CATEGORIES="$TEMP_DIR/source/categories"

if [ -d "$SOURCE_CATEGORIES" ]; then
    for category_dir in "$SOURCE_CATEGORIES"/*; do
        if [ -d "$category_dir" ]; then
            category_name=$(basename "$category_dir")
            local_category="${CATEGORY_MAP[$category_name]:-$category_name}"
            local_dir="$SUBAGENTS_DIR/$local_category"

            mkdir -p "$local_dir"

            for agent_file in "$category_dir"/*.md; do
                if [ -f "$agent_file" ]; then
                    agent_name=$(basename "$agent_file")
                    local_file="$local_dir/$agent_name"

                    if [ -f "$local_file" ]; then
                        # Check if file has changed
                        if ! cmp -s "$agent_file" "$local_file"; then
                            cp "$agent_file" "$local_file"
                            ((UPDATED_AGENTS++))
                            echo -e "  ${YELLOW}↑ Updated: ${local_category}/${agent_name}${NC}"
                        else
                            ((SKIPPED_AGENTS++))
                        fi
                    else
                        cp "$agent_file" "$local_file"
                        ((NEW_AGENTS++))
                        echo -e "  ${GREEN}+ New: ${local_category}/${agent_name}${NC}"
                    fi
                fi
            done
        fi
    done
else
    echo -e "${RED}✗ Source categories not found${NC}"
fi

# Update registry
echo ""
echo -e "${BLUE}Updating agent registry...${NC}"

# This would regenerate the registry.json based on current agents
# For now, we'll just note that it should be updated
if [ -f "$SUBAGENTS_DIR/registry.json" ]; then
    echo -e "${YELLOW}Note: You may need to regenerate registry.json${NC}"
fi

# Cleanup
echo ""
echo -e "${BLUE}Cleaning up...${NC}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✓ Temp files removed${NC}"

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Synchronization Complete!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Summary:"
echo -e "  ${GREEN}+ New agents:     ${NEW_AGENTS}${NC}"
echo -e "  ${YELLOW}↑ Updated agents: ${UPDATED_AGENTS}${NC}"
echo -e "  ${BLUE}○ Unchanged:      ${SKIPPED_AGENTS}${NC}"
echo ""

if [ $NEW_AGENTS -gt 0 ] || [ $UPDATED_AGENTS -gt 0 ]; then
    echo -e "${YELLOW}Don't forget to update the registry.json if needed!${NC}"
fi
