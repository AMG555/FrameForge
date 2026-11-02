# FrameForge — Cloudflare Remote MCP

Deploy the MCP proxy to Cloudflare Workers for ~80% token savings vs local stdio MCP.

## How it works

```
Agentic IDE (IBM Bob / Cursor / Windsurf / Kiro)
  │  HTTPS POST Bearer MCP_AUTH_TOKEN
  ▼
Cloudflare Workers  ← this file
  │  HTTP POST Bearer INTERNAL_API_TOKEN
  ▼
Render Free / VPS / Pi  (server-render-free.js)
  │  FFmpeg rendering + TTS + image gen
  ▼
Telegram / YouTube
```

**Token savings:** IDEs download tool descriptions once and cache them. Binary results (images, audio) stay on the server — only file paths are returned. Result: ~60-80% fewer tokens per session compared to stdio MCP.

**Free tier:** Cloudflare Workers free = 100,000 requests/day. More than enough for overnight video generation.

## Prerequisites

- [Cloudflare account](https://cloudflare.com) (free)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`
- A running [Render API](../docs/hybrid-deployment.md) or VPS running `server-render-free.js`

## Deploy (2 minutes)

```bash
cd cloudflare-mcp
npm install

# Authenticate with Cloudflare
wrangler login

# Set required secrets
wrangler secret put WORKER_API_URL
# → Enter: https://your-render-app.onrender.com

wrangler secret put INTERNAL_API_TOKEN
# → Enter: (same token set as INTERNAL_API_TOKEN on your Render app)

# Optional but recommended
wrangler secret put MCP_AUTH_TOKEN
# → Enter: (random 32-byte hex — your IDE will use this as the Bearer token)

# Deploy
wrangler deploy
```

Your MCP endpoint is now live at:
```
https://frameforge.<YOUR_SUBDOMAIN>.workers.dev/mcp
```

## Connect your IDE

### IBM Bob (`~/.bob/mcp.json`)
```json
{
  "mcpServers": {
    "frameforge": {
      "url": "https://frameforge.YOUR_SUBDOMAIN.workers.dev/mcp",
      "headers": { "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN" }
    }
  }
}
```

### Cursor / Claude Code / Windsurf / Kiro (`.mcp.json` or `~/.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "frameforge": {
      "url": "https://frameforge.YOUR_SUBDOMAIN.workers.dev/mcp",
      "headers": { "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN" }
    }
  }
}
```

If you did not set `MCP_AUTH_TOKEN`, omit the `headers` block.

## Verify

```bash
curl https://frameforge.YOUR_SUBDOMAIN.workers.dev/health
```

Expected (configured):
```json
{ "status": "ok", "worker": "frameforge-mcp", "version": "1.1.0", "configured": true }
```

Expected (not configured — `WORKER_API_URL` missing):
```json
{ "status": "degraded", "configured": false, "missing": ["WORKER_API_URL (wrangler secret put WORKER_API_URL)"] }
```

## Async tool pattern

`assemble_video`, `publish_video`, and `queue_full_pipeline` take minutes. The Worker returns `{jobId}` immediately — your IDE agent must call `get_job_status` to poll for completion:

```
Agent calls:  queue_full_pipeline({ topic: "..." })
  → returns:  { jobId: "job_...", status: "RUNNING" }

Agent polls:  get_job_status({ jobId: "job_..." })   (every 30s)
  → returns:  { status: "RUNNING", stage: "Assets" }
  → returns:  { status: "SUCCEEDED", result: { masterPath: "...", ... } }
```

`research_topic` and `write_script` are fast (~5-8s) and return results directly without requiring polling.

## Keep-alive cron

The Worker pings your Render `/health` endpoint every 8 minutes via a Cloudflare Cron Trigger (configured in `wrangler.toml`). This keeps the Render free dyno awake during pipeline runs.

## Troubleshooting

| Problem | Cause | Fix |
| :--- | :--- | :--- |
| `WORKER_API_URL not set` | Secret not configured | `wrangler secret put WORKER_API_URL` |
| `HTTP 401` from IDE | Wrong `MCP_AUTH_TOKEN` | Re-check token in IDE config |
| `HTTP 401` from Render | `INTERNAL_API_TOKEN` mismatch | Must match on both CF Worker and Render |
| Tool calls timeout | Render dyno sleeping | Wait 30s for wake; cron will prevent this in future |
| `job_... not found` after Render restart | Free tier ephemeral state | Use paid Render ($7/mo) for persistence; or re-run |
