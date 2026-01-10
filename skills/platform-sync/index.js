/**
 * Platform Sync Skill
 *
 * Provides integration between CDD and external project management platforms.
 * Supports both direct API and MCP-based connections.
 */

const { SyncEngine, MCPAdapterWrapper } = require('./sync-engine');
const adapters = require('./adapters');

module.exports = {
  SyncEngine,
  MCPAdapterWrapper,
  ...adapters
};
