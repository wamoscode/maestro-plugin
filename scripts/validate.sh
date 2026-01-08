#!/bin/bash

# Validation Script
# Validates plugin structure and agent definitions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Plugin Validation Script             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Get plugin directory
if [ -n "$1" ]; then
    PLUGIN_DIR="$1"
else
    PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

echo -e "${YELLOW}Plugin directory: ${PLUGIN_DIR}${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to report error
error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to report warning
warning() {
    echo -e "${YELLOW}! WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to report success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check plugin.json
echo -e "${BLUE}Checking plugin.json...${NC}"
if [ -f "$PLUGIN_DIR/plugin.json" ]; then
    # Validate JSON syntax
    if command -v jq &> /dev/null; then
        if jq . "$PLUGIN_DIR/plugin.json" > /dev/null 2>&1; then
            success "plugin.json is valid JSON"

            # Check required fields
            NAME=$(jq -r '.name // empty' "$PLUGIN_DIR/plugin.json")
            VERSION=$(jq -r '.version // empty' "$PLUGIN_DIR/plugin.json")
            DESCRIPTION=$(jq -r '.description // empty' "$PLUGIN_DIR/plugin.json")

            if [ -n "$NAME" ]; then
                success "plugin.json has name: $NAME"
            else
                error "plugin.json missing 'name' field"
            fi

            if [ -n "$VERSION" ]; then
                success "plugin.json has version: $VERSION"
            else
                error "plugin.json missing 'version' field"
            fi

            if [ -n "$DESCRIPTION" ]; then
                success "plugin.json has description"
            else
                warning "plugin.json missing 'description' field"
            fi
        else
            error "plugin.json has invalid JSON syntax"
        fi
    else
        warning "jq not installed, skipping JSON validation"
    fi
else
    error "plugin.json not found"
fi

echo ""

# Check subagents directory
echo -e "${BLUE}Checking subagents...${NC}"
SUBAGENTS_DIR="$PLUGIN_DIR/subagents"

if [ -d "$SUBAGENTS_DIR" ]; then
    success "subagents directory exists"

    # Check registry.json
    if [ -f "$SUBAGENTS_DIR/registry.json" ]; then
        success "registry.json exists"
    else
        warning "registry.json not found"
    fi

    # Check maestro.md
    if [ -f "$SUBAGENTS_DIR/maestro.md" ]; then
        success "Main maestro agent exists"
    else
        error "maestro.md not found"
    fi

    # Count and validate agent files
    AGENT_COUNT=0
    VALID_AGENTS=0
    INVALID_AGENTS=0

    for category_dir in "$SUBAGENTS_DIR"/*/; do
        if [ -d "$category_dir" ]; then
            for agent_file in "$category_dir"*.md; do
                if [ -f "$agent_file" ]; then
                    ((AGENT_COUNT++))

                    # Check for required frontmatter
                    if head -1 "$agent_file" | grep -q "^---$"; then
                        # Check for name field
                        if grep -q "^name:" "$agent_file"; then
                            ((VALID_AGENTS++))
                        else
                            warning "Missing 'name' in frontmatter: $(basename "$agent_file")"
                            ((INVALID_AGENTS++))
                        fi
                    else
                        warning "Missing frontmatter: $(basename "$agent_file")"
                        ((INVALID_AGENTS++))
                    fi
                fi
            done
        fi
    done

    success "Found $AGENT_COUNT agent files"
    if [ $VALID_AGENTS -gt 0 ]; then
        success "$VALID_AGENTS agents have valid format"
    fi
    if [ $INVALID_AGENTS -gt 0 ]; then
        warning "$INVALID_AGENTS agents have formatting issues"
    fi
else
    error "subagents directory not found"
fi

echo ""

# Check commands directory
echo -e "${BLUE}Checking commands...${NC}"
COMMANDS_DIR="$PLUGIN_DIR/commands"

if [ -d "$COMMANDS_DIR" ]; then
    success "commands directory exists"

    REQUIRED_COMMANDS=("maestro.md" "list-subagents.md")
    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        if [ -f "$COMMANDS_DIR/$cmd" ]; then
            success "Found required command: $cmd"
        else
            warning "Missing command: $cmd"
        fi
    done

    CMD_COUNT=$(find "$COMMANDS_DIR" -name "*.md" | wc -l | tr -d ' ')
    success "Found $CMD_COUNT command files"
else
    error "commands directory not found"
fi

echo ""

# Check hooks directory
echo -e "${BLUE}Checking hooks...${NC}"
HOOKS_DIR="$PLUGIN_DIR/hooks"

if [ -d "$HOOKS_DIR" ]; then
    success "hooks directory exists"

    REQUIRED_HOOKS=("pre-execution.js" "post-execution.js" "error-handler.js" "agent-router.js")
    for hook in "${REQUIRED_HOOKS[@]}"; do
        if [ -f "$HOOKS_DIR/$hook" ]; then
            success "Found hook: $hook"

            # Validate JavaScript syntax if node is available
            if command -v node &> /dev/null; then
                if node --check "$HOOKS_DIR/$hook" 2>/dev/null; then
                    success "  └─ Valid JavaScript syntax"
                else
                    error "  └─ Invalid JavaScript syntax in $hook"
                fi
            fi
        else
            warning "Missing hook: $hook"
        fi
    done
else
    warning "hooks directory not found"
fi

echo ""

# Check scripts directory
echo -e "${BLUE}Checking scripts...${NC}"
SCRIPTS_DIR="$PLUGIN_DIR/scripts"

if [ -d "$SCRIPTS_DIR" ]; then
    success "scripts directory exists"

    for script in "$SCRIPTS_DIR"/*.sh; do
        if [ -f "$script" ]; then
            script_name=$(basename "$script")
            if [ -x "$script" ]; then
                success "Script is executable: $script_name"
            else
                warning "Script not executable: $script_name"
            fi
        fi
    done
else
    warning "scripts directory not found"
fi

echo ""

# Check skills directory
echo -e "${BLUE}Checking skills...${NC}"
SKILLS_DIR="$PLUGIN_DIR/skills"

if [ -d "$SKILLS_DIR" ]; then
    success "skills directory exists"
    SKILL_COUNT=$(find "$SKILLS_DIR" -name "*.js" | wc -l | tr -d ' ')
    success "Found $SKILL_COUNT skill files"
else
    warning "skills directory not found"
fi

echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Validation Summary               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All validations passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}Validation completed with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "${RED}Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    exit 1
fi
