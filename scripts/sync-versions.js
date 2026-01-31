#!/usr/bin/env node

/**
 * Version Synchronization Script
 *
 * Ensures version consistency across:
 * - package.json (source of truth)
 * - plugin.json
 * - mcp/config.json
 *
 * Run after bumping version in package.json:
 *   npm run sync-versions
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Files to sync
const files = [
  { path: 'package.json', key: 'version' },
  { path: 'plugin.json', key: 'version' },
  { path: 'mcp/config.json', key: 'version' }
];

function readJSON(filePath) {
  const fullPath = path.join(rootDir, filePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function writeJSON(filePath, data) {
  const fullPath = path.join(rootDir, filePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main() {
  console.log('Synchronizing versions across config files...\n');

  // Get version from package.json (source of truth)
  const packageJson = readJSON('package.json');
  const version = packageJson.version;

  console.log(`Source version (package.json): ${version}\n`);

  let updated = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const data = readJSON(file.path);
      const currentVersion = data[file.key];

      if (currentVersion === version) {
        console.log(`✓ ${file.path}: ${currentVersion} (already synced)`);
      } else {
        data[file.key] = version;
        writeJSON(file.path, data);
        console.log(`✓ ${file.path}: ${currentVersion} → ${version}`);
        updated++;
      }
    } catch (error) {
      console.error(`✗ ${file.path}: ${error.message}`);
      errors++;
    }
  }

  console.log(`\nSummary: ${updated} files updated, ${errors} errors`);

  if (errors > 0) {
    process.exit(1);
  }
}

main();
