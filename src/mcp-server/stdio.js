/**
 * FrameForge MCP Server — Local Stdio Transport
 *
 * Implements standard stdio JSON-RPC transport for MCP 2024-11-05.
 * Used for zero-config integration with Claude Code, Cursor, Windsurf, Codex, opencode:
 *
 * {
 *   "mcpServers": {
 *     "frameforge": {
 *       "command": "node",
 *       "args": ["src/mcp-server/stdio.js"]
 *     }
 *   }
 * }
 */

'use strict';

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
