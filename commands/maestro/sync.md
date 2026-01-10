# /maestro:sync - Platform Synchronization Command

Synchronize CDD tracks and tasks with external project management platforms.

## Usage

```
/maestro:sync [action] [options]
```

## Actions

### `status` (default)
Show sync status for all configured platforms.

```
/maestro:sync status
```

### `push`
Push CDD data to external platforms.

```
/maestro:sync push [--platform=<name>] [--track=<id>] [--force]
```

### `pull`
Pull data from external platforms to CDD.

```
/maestro:sync pull [--platform=<name>] [--force]
```

### `full`
Perform full bidirectional sync.

```
/maestro:sync full [--platform=<name>]
```

### `config`
Configure sync settings.

```
/maestro:sync config [--init] [--platform=<name>]
```

### `test`
Test platform connections.

```
/maestro:sync test [--platform=<name>]
```

### `link`
Link a CDD track to an external item.

```
/maestro:sync link <track-id> <platform>:<external-id>
```

### `unlink`
Remove sync link for a track.

```
/maestro:sync unlink <track-id> [--platform=<name>]
```

## Options

| Option | Description |
|--------|-------------|
| `--platform=<name>` | Target specific platform (clickup, linear, jira, asana, todoist, youtrack, notion, github) |
| `--track=<id>` | Target specific track |
| `--force` | Force sync even with conflicts |
| `--dry-run` | Preview changes without applying |
| `--verbose` | Show detailed sync log |
| `--mcp` | Force MCP mode for platform |

## Implementation

When this command is invoked:

### 1. Load Sync Configuration

```javascript
const fs = require('fs');
const path = require('path');

// Load sync configuration
const configPath = path.join(projectRoot, '.cdd', 'sync-config.json');
let syncConfig;

if (fs.existsSync(configPath)) {
  syncConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  // Use template as fallback
  const templatePath = path.join(__dirname, '../../templates/sync-config.json');
  syncConfig = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
}
```

### 2. Initialize Sync Engine

```javascript
const { SyncEngine } = require('../../skills/platform-sync/sync-engine');

const engine = new SyncEngine(projectRoot);
await engine.initialize(syncConfig);
```

### 3. Execute Sync Action

#### Status Action
```javascript
async function showStatus(engine) {
  const status = await engine.getSyncStatus();

  console.log('\n## Platform Sync Status\n');

  for (const [platform, info] of Object.entries(status.platforms)) {
    const icon = info.connected ? '✓' : '✗';
    const state = info.connected ? 'Connected' : 'Disconnected';
    console.log(`${icon} **${platform}**: ${state}`);

    if (info.connected) {
      console.log(`  - Last sync: ${info.lastSync || 'Never'}`);
      console.log(`  - Synced items: ${info.syncedCount}`);
      console.log(`  - Pending: ${info.pendingCount}`);
    }
  }

  if (status.conflicts.length > 0) {
    console.log('\n### Conflicts');
    for (const conflict of status.conflicts) {
      console.log(`- ${conflict.trackId}: ${conflict.description}`);
    }
  }
}
```

#### Push Action
```javascript
async function pushSync(engine, options) {
  const { platform, trackId, force, dryRun } = options;

  console.log('\n## Pushing CDD Data\n');

  // Get tracks to sync
  let tracks;
  if (trackId) {
    tracks = [await engine.getTrack(trackId)];
  } else {
    tracks = await engine.getAllTracks();
  }

  // Filter by platform if specified
  const platforms = platform ? [platform] : engine.getEnabledPlatforms();

  for (const plat of platforms) {
    console.log(`\n### Syncing to ${plat}\n`);

    for (const track of tracks) {
      if (dryRun) {
        console.log(`[DRY-RUN] Would sync: ${track.id} - ${track.title}`);
        continue;
      }

      try {
        const result = await engine.pushTrack(plat, track, { force });
        console.log(`✓ ${track.id}: ${result.action} (${result.externalId})`);
      } catch (error) {
        console.log(`✗ ${track.id}: ${error.message}`);
      }
    }
  }
}
```

#### Pull Action
```javascript
async function pullSync(engine, options) {
  const { platform, force, dryRun } = options;

  console.log('\n## Pulling External Data\n');

  const platforms = platform ? [platform] : engine.getEnabledPlatforms();

  for (const plat of platforms) {
    console.log(`\n### Pulling from ${plat}\n`);

    try {
      const items = await engine.pullItems(plat);

      for (const item of items) {
        if (dryRun) {
          console.log(`[DRY-RUN] Would import: ${item.name}`);
          continue;
        }

        const result = await engine.importItem(plat, item, { force });
        console.log(`✓ ${result.trackId}: ${result.action}`);
      }
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
  }
}
```

#### Config Action
```javascript
async function configureSync(engine, options) {
  const { init, platform } = options;

  if (init) {
    // Initialize sync configuration
    const templatePath = path.join(__dirname, '../../templates/sync-config.json');
    const configPath = path.join(projectRoot, '.cdd', 'sync-config.json');

    fs.copyFileSync(templatePath, configPath);
    console.log('✓ Created sync-config.json in .cdd directory');
    console.log('\nNext steps:');
    console.log('1. Edit .cdd/sync-config.json to configure your platforms');
    console.log('2. Set environment variables for API keys');
    console.log('3. Run `/maestro:sync test` to verify connections');
    return;
  }

  if (platform) {
    // Show platform-specific configuration guide
    await showPlatformGuide(platform);
    return;
  }

  // Show general configuration status
  console.log('\n## Sync Configuration\n');
  const config = await engine.getConfig();

  console.log(`Mode: ${config.sync.mode}`);
  console.log(`Conflict Resolution: ${config.sync.conflictResolution}`);
  console.log(`Auto Sync: ${config.sync.autoSync ? 'Enabled' : 'Disabled'}`);

  console.log('\n### Platforms\n');
  for (const [name, plat] of Object.entries(config.platforms)) {
    const status = plat.enabled ? 'Enabled' : 'Disabled';
    const type = plat.connection?.type || 'unknown';
    console.log(`- **${name}**: ${status} (${type})`);
  }
}
```

#### Test Action
```javascript
async function testConnections(engine, options) {
  const { platform } = options;

  console.log('\n## Testing Platform Connections\n');

  const platforms = platform ? [platform] : engine.getEnabledPlatforms();

  for (const plat of platforms) {
    process.stdout.write(`Testing ${plat}... `);

    try {
      const result = await engine.testConnection(plat);
      if (result.success) {
        console.log('✓ Connected');
        if (result.user) {
          console.log(`  Authenticated as: ${result.user}`);
        }
      } else {
        console.log(`✗ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
  }
}
```

#### Link Action
```javascript
async function linkTrack(engine, trackId, linkSpec) {
  const [platform, externalId] = linkSpec.split(':');

  if (!platform || !externalId) {
    console.log('Usage: /maestro:sync link <track-id> <platform>:<external-id>');
    return;
  }

  try {
    await engine.linkTrack(trackId, platform, externalId);
    console.log(`✓ Linked ${trackId} to ${platform}:${externalId}`);
  } catch (error) {
    console.log(`✗ Failed to link: ${error.message}`);
  }
}
```

### 4. MCP Mode Support

When `--mcp` flag is used or platform is configured for MCP:

```javascript
// The sync engine automatically detects MCP configuration
// and uses MCPAdapterWrapper instead of direct API calls

// Example MCP tool calls that get generated:
{
  "_mcp": true,
  "server": "notion-mcp-server",
  "tool": "notion_create_page",
  "arguments": {
    "database_id": "...",
    "properties": { ... }
  }
}
```

The MCP wrapper returns tool call specifications that Claude can execute
using the configured MCP servers.

## Platform Configuration Guides

### ClickUp

1. Get API key from ClickUp Settings > Apps > API Token
2. Find Workspace ID in URL: `app.clickup.com/{workspace_id}/...`
3. Configure in sync-config.json:

```json
{
  "clickup": {
    "enabled": true,
    "connection": {
      "type": "api",
      "apiKey": "${CLICKUP_API_KEY}",
      "workspaceId": "your-workspace-id"
    },
    "mapping": {
      "listId": "your-list-id"
    }
  }
}
```

### Linear

1. Get API key from Linear Settings > API > Personal API keys
2. Find Team ID using Linear API or from URL
3. Configure:

```json
{
  "linear": {
    "enabled": true,
    "connection": {
      "type": "api",
      "apiKey": "${LINEAR_API_KEY}"
    },
    "mapping": {
      "teamId": "your-team-id"
    }
  }
}
```

### Jira

1. Create API token at https://id.atlassian.com/manage-profile/security/api-tokens
2. Get your Jira host URL (e.g., https://your-org.atlassian.net)
3. Configure:

```json
{
  "jira": {
    "enabled": true,
    "connection": {
      "type": "api",
      "host": "${JIRA_HOST}",
      "email": "${JIRA_EMAIL}",
      "apiToken": "${JIRA_API_TOKEN}"
    },
    "mapping": {
      "projectKey": "PROJ"
    }
  }
}
```

### Using MCP Instead of Direct API

For platforms supported by MCP servers:

```json
{
  "notion": {
    "enabled": true,
    "connection": {
      "type": "mcp",
      "mcp": {
        "server": "notion-mcp-server",
        "toolPrefix": "notion"
      }
    }
  }
}
```

Ensure the MCP server is configured in your `mcp` section or Claude Code settings.

## Examples

```bash
# Check sync status
/maestro:sync status

# Push all tracks to all platforms
/maestro:sync push

# Push specific track to Linear
/maestro:sync push --platform=linear --track=TRACK-001

# Pull from Jira (preview only)
/maestro:sync pull --platform=jira --dry-run

# Full sync with all platforms
/maestro:sync full

# Initialize sync configuration
/maestro:sync config --init

# Test Jira connection
/maestro:sync test --platform=jira

# Link existing track to Jira issue
/maestro:sync link TRACK-001 jira:PROJ-123

# Unlink track from all platforms
/maestro:sync unlink TRACK-001
```

## Environment Variables

Set these in your shell or `.env` file:

```bash
# ClickUp
export CLICKUP_API_KEY="your-api-key"
export CLICKUP_WORKSPACE_ID="your-workspace-id"

# Linear
export LINEAR_API_KEY="your-api-key"

# Jira
export JIRA_HOST="https://your-org.atlassian.net"
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"

# Asana
export ASANA_ACCESS_TOKEN="your-token"

# Todoist
export TODOIST_API_TOKEN="your-token"

# YouTrack
export YOUTRACK_HOST="https://your-org.youtrack.cloud"
export YOUTRACK_TOKEN="your-token"

# MCP Servers
export NOTION_API_KEY="your-notion-key"
export GITHUB_TOKEN="your-github-token"
```
