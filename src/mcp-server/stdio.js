#!/usr/bin/env node
/**
 * FrameForge MCP Server — Local Stdio Transport
 *
 * Implements standard stdio JSON-RPC transport for MCP 2024-11-05.
 * Used for zero-config integration with Claude Code, Cursor, Windsurf, Codex, opencode.
 *
 * When run via `npx frameforge-mcp`, keys are loaded from ~/.frameforge/config.json
 * (written once by `npx frameforge-setup`). Falls back to .env in cwd.
 *
 * IDE config (npx — no clone required):
 * {
 *   "mcpServers": {
 *     "frameforge": {
 *       "command": "npx",
 *       "args": ["-y", "frameforge-mcp"]
 *     }
 *   }
 * }
 *
 * IDE config (local clone):
 * {
 *   "mcpServers": {
 *     "frameforge": {
 *       "command": "node",
 *       "args": ["/absolute/path/to/frameforge/src/mcp-server/stdio.js"]
 *     }
 *   }
 * }
 */

'use strict';

// Load config BEFORE requiring server.js so env vars are set when providers initialise
require('../config/load-config').loadConfig();

// ── CLI Dispatch Fallback ──────────────────────────────────────────────────
// When run via `npx @amg555/frameforge-mcp` with CLI arguments (e.g. `make`, `--topic`,
// `doctor`, `setup`, `harness`, or `--help`), dispatch to the CLI tool instead of
// hanging on stdin JSON-RPC.
const firstArg = process.argv[2];
if (firstArg && (firstArg === 'make' || firstArg.startsWith('-') || firstArg === 'doctor' || firstArg === 'setup' || firstArg === 'harness')) {
  if (firstArg === 'doctor') {
    require('../cli/doctor');
    return;
  }
  if (firstArg === 'setup') {
    require('../cli/setup-keys');
    return;
  }
  if (firstArg === 'harness') {
    const harnessBin = require('path').resolve(__dirname, '../harness/bin/harness.mjs');
    const { spawnSync } = require('child_process');
    const res = spawnSync(process.execPath, [harnessBin, ...process.argv.slice(3)], { stdio: 'inherit' });
    process.exit(res.status ?? 0);
  }
  // Otherwise dispatch to make.js (stripping 'make' if present)
  if (firstArg === 'make') {
    process.argv.splice(2, 1);
  }
  require('../cli/make');
  return;
}

const readline = require('readline');
const { handleMCPRequest } = require('./server');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

process.stderr.write('[FrameForge Stdio MCP] Server initialized. Listening on stdin...\n');

rl.on('line', async line => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: `Parse error: ${err.message}` },
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
    return;
  }

  try {
    if (Array.isArray(request)) {
      const responses = await Promise.all(request.map(r => handleMCPRequest(r)));
      const filtered = responses.filter(r => r !== null);
      if (filtered.length > 0) {
        process.stdout.write(JSON.stringify(filtered) + '\n');
      }
    } else {
      const response = await handleMCPRequest(request);
      if (response !== null) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
  } catch (err) {
    process.stderr.write(`[FrameForge Stdio MCP] Request error: ${err.message}\n`);
    const errorResponse = {
      jsonrpc: '2.0',
      id: request.id || null,
      error: { code: -32603, message: `Internal server error: ${err.message}` },
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});
