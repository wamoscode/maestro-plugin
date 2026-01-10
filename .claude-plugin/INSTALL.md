# Installing Maestro Plugin

## Quick Install (Recommended)

```bash
# From the Claude Code CLI
/plugin marketplace add maestro
```

## Manual Installation

### macOS
```bash
git clone https://github.com/wamoscode/maestro-plugin.git ~/.claude/plugins/maestro
cd ~/.claude/plugins/maestro
./scripts/install.sh
```

### Linux
```bash
git clone https://github.com/wamoscode/maestro-plugin.git ~/.config/claude-code/plugins/maestro
cd ~/.config/claude-code/plugins/maestro
./scripts/install.sh
```

## Post-Installation

1. Restart Claude Code or reload the plugin:
   ```
   /plugin reload maestro
   ```

2. Verify installation:
   ```
   /list-subagents
   ```

3. Start orchestrating:
   ```
   /maestro Build a REST API with authentication
   ```

## Configuration

Configuration is stored in `~/.maestro/config.json`:

```json
{
  "maxParallelAgents": 5,
  "defaultTimeout": 300000,
  "enableLogging": true,
  "logLevel": "info"
}
```

## Uninstallation

```bash
# Remove plugin
rm -rf ~/.claude/plugins/maestro

# Remove configuration (optional)
rm -rf ~/.maestro
```

## Troubleshooting

### Plugin not loading
- Ensure Node.js 18+ is installed
- Check plugin.json is valid: `jq . plugin.json`
- Review Claude Code logs for errors

### Agents not found
- Run validation: `./scripts/validate.sh`
- Check registry.json is valid JSON

### MCP server issues
- Test server: `node mcp/server.js`
- Check config.json is valid
