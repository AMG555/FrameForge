# 🔌 FrameForge MCP Setup Guide

This guide details how to manually connect FrameForge's Model Context Protocol (MCP) server to any agentic IDE, CLI, or agent framework.

---

## ⚡ Recommended: Zero-Config Agent Setup
If you use an AI agent (Claude Code, Cursor, Windsurf, or terminal agents), you do not need to edit JSON files manually. Just tell your agent:

> **"Set up FrameForge MCP from npm package `@amg555/frameforge-mcp` so you have video creation and editing tools, and verify dependencies are ready."**

Your agent will configure the server automatically.

---

## 🛠️ Manual IDE Configurations

### 1. Claude Code CLI
Run in your terminal:
```bash
claude mcp add frameforge npx -y @amg555/frameforge-mcp
```
Or add directly to `~/.claude.json`:
```json
{
  "mcpServers": {
    "frameforge": {
      "command": "npx",
      "args": ["-y", "@amg555/frameforge-mcp"]
    }
  }
}
```

---

### 2. Cursor (`.cursor/mcp.json` or Global Settings)
Open Cursor Settings → Features → MCP, or create `.cursor/mcp.json` in your project root:
```json
{
  "mcpServers": {
    "frameforge": {
      "command": "npx",
      "args": ["-y", "@amg555/frameforge-mcp"]
    }
  }
}
```

---

### 3. Windsurf (`~/.codeium/windsurf/mcp_config.json`)
Add to `mcp_config.json`:
```json
{
  "mcpServers": {
    "frameforge": {
      "command": "npx",
      "args": ["-y", "@amg555/frameforge-mcp"]
    }
  }
}
```

---

### 4. VS Code (Cline / Roo Code / Copilot MCP)
Add to your extension's MCP configuration settings:
```json
{
  "mcpServers": {
    "frameforge": {
      "command": "npx",
      "args": ["-y", "@amg555/frameforge-mcp"]
    }
  }
}
```

---

### 5. Autonomous Agent Frameworks (LangChain, CrewAI, AutoGen, Custom Scripts)

#### Node.js / TypeScript:
```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@amg555/frameforge-mcp"]
});

const client = new Client({ name: "my-agent", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);

// List available tools (34 tools)
const tools = await client.listTools();
```

#### Python:
```python
from mcp import StdioServerParameters
from mcp.client.stdio import stdio_client

server_params = StdioServerParameters(
    command="npx",
    args=["-y", "@amg555/frameforge-mcp"],
    env=None
)
```

---

## 🌐 Remote MCP Setup (Cloudflare Worker / HTTP)
To run FrameForge as an HTTP/SSE server on a remote server or VPS:
```bash
# Start HTTP MCP server on port 3000
PORT=3000 node src/mcp-server/server.js
```
Then connect via SSE endpoint: `http://localhost:3000/sse`.
See [Collaboration Guide](collaboration.md) for remote worker deployment details.
