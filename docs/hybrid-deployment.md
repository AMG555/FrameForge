# Deployment Architecture Guide

All deployment options for the video pipeline, from zero-cost to enterprise.
Covers Render Free, Cloudflare Workers (remote MCP), local rendering, and hybrid splits.

---

## The Split: What runs where

The pipeline divides cleanly into two execution tiers:

| Stage | What it does | RAM/CPU need | Can run on Render Free? |
|-------|--------------|--------------|------------------------|
| Research (A) | LLM API call to Groq | ~50 MB | ✅ Yes |
| Script (B) | LLM API call to Groq | ~50 MB | ✅ Yes |
| Assets (C) | HTTP to Pollinations + edge-tts process | ~120 MB | ✅ Yes |
| Render (D) | FFmpeg zoompan 1920×1080, zoompan | ~800 MB peak | ❌ No (512 MB limit) |
| Shorts (D2) | FFmpeg 16:9→9:16 crop | ~400 MB | ❌ No |
| Package (E) | File ops + manifest | ~30 MB | ✅ Yes |
| Publish (F) | file copy / HTTP webhook | ~30 MB | ✅ Yes |

**Conclusion**: Render free is fine for 5 out of 7 stages. Only FFmpeg render needs more.

---

## Option 1 — Your Machine + Render Free (Recommended for zero cost)

```
Your Machine (Windows/Mac/Linux)
  ├──  / Codex / Cursor / Windsurf       ← agentic IDE
  ├── Local Render Worker (node server-render-free.js  RENDER_MODE=full)
  │     FFmpeg rendering here (no limits)
  └── Tunnel (Tailscale or ngrok)
         ↓ HTTPS
Render Free (512 MB)
  └── Worker API (server-render-free.js  RENDER_MODE=api_only)
        └── Stages A, B, C, E, F (network-only)
        └── Delegates stage D, D2 → LOCAL_RENDER_URL (your machine)
              ↓ HTTP
Cloudflare Workers (free 100k req/day)
  └── Remote MCP Server (cloudflare-mcp/)
        └── IDE connects here instead of spawning local process
        └── Proxies tool calls → Render Free Worker API
```

**Token savings**: IDE connects to Cloudflare Workers URL. Tool descriptions are
cached once. Results stream as SSE. ~60-80% fewer tokens vs local stdio MCP.

### Setup — Your Machine

```bash
# Install Tailscale for tunnel (free, no port-forwarding needed)
# https://tailscale.com/download — install and tailscale up

# Clone and configure
git clone <repo> ~/auto-vid-gen && cd ~/auto-vid-gen
cp docs/env.template .env
# Fill in GROQ_API_KEY at minimum; optionally PUBLISH_WEBHOOK_URL

# Start local render worker (handles FFmpeg)
RENDER_MODE=full node src/worker/server-render-free.js
# Note the Tailscale IP: tailscale ip -4
# e.g. http://100.x.y.z:3211
```

### Setup — Render Free

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service → connect repo
3. Uses `render.yaml` automatically — click Deploy
4. Set these environment variables in Render dashboard:
   - `GROQ_API_KEY` = your key
   - `PUBLISH_WEBHOOK_URL` = your webhook URL (optional — file delivery works without this)
   - `LOCAL_RENDER_URL` = `http://100.x.y.z:3211` (your Tailscale IP from above)
5. Note your Render URL: `https://video-pipeline-worker.onrender.com`

### Setup — Cloudflare Workers

```bash
cd cloudflare-mcp
npm install
npx wrangler login

# Set secrets
npx wrangler secret put WORKER_API_URL
# Enter: https://video-pipeline-worker.onrender.com

npx wrangler secret put MCP_AUTH_TOKEN
# Enter: <any random string, e.g. openssl rand -hex 32>

npx wrangler deploy
# Note your Workers URL: https://video-pipeline-mcp.YOUR_NAME.workers.dev
```

### Setup — IDE ()

Edit `~/.bob/mcp.json`:
```json
{
  "mcpServers": {
    "video-pipeline": {
      "url": "https://video-pipeline-mcp.YOUR_NAME.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

For Claude Code / Cursor, edit `.mcp.json`:
```json
{
  "mcpServers": {
    "video-pipeline": {
      "url": "https://video-pipeline-mcp.YOUR_NAME.workers.dev/mcp",
      "headers": { "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN" }
    }
  }
}
```

**That's it.**  now has 14 video tools that run on zero-cost infrastructure.

---

## Option 2 — Everything on Render Starter ($7/month)

Render Starter: 512 MB → 2 GB RAM, persistent disk (1 GB), no sleep.
This is enough to run FFmpeg on shorter videos.

```bash
# In render.yaml, change:
plan: starter

# And set:
RENDER_MODE=full
# Remove LOCAL_RENDER_URL
```

FFmpeg peak for 15-scene video: ~400 MB (within 2 GB).
FFmpeg peak for 55-scene video: ~800 MB (within 2 GB, tight).
Use `preset: veryfast` and `-threads 2` (already set in renderer.js).

---

## Option 3 — Raspberry Pi 4 (4 GB) — Zero ongoing cost

Best for overnight batch production. No cloud bills, no sleep issues.

```
Your Machine
  └──  → Remote MCP on Cloudflare (free)
                     ↓
Pi 4 (4 GB) — all pipeline stages locally
  ├── Worker API :3211
  ├── MCP Server :3210 (optional — use Cloudflare instead)
  └── Tailscale tunnel (free) for remote access
```

```bash
# On Pi
sudo apt install -y ffmpeg fonts-liberation python3-pip
pip3 install edge-tts

git clone <repo> ~/auto-vid-gen && cd ~/auto-vid-gen
RENDER_MODE=full N8N_FILES_DIR=/home/pi/video-files node src/worker/server-render-free.js

# Keep alive with systemd (see docs/deployment.md Step 6)
```

Render time on Pi 4: ~25 min for 55 scenes.
Render time for a 15-scene short: ~7-8 min.

---

## Option 4 — Oracle Cloud Always Free (ARM, 4 vCPU, 24 GB RAM)

Best enterprise-grade zero-cost option. Oracle Always Free gives:
- 4 ARM Ampere cores (A1)
- 24 GB RAM
- 200 GB block storage
- No expiry, no credit card required after signup

```bash
# On Oracle ARM instance (Ubuntu 22.04 ARM64)
sudo apt install -y ffmpeg fonts-liberation
# Edge-tts works on ARM64 via pip

RENDER_MODE=full N8N_FILES_DIR=/home/ubuntu/video-files node src/worker/server-render-free.js
```

Render time: ~3-5 min for 55 scenes (8x faster than Pi 4).

---

## Option 5 — Hetzner CX22 (€4/month, best price/performance)

2 vCPU, 4 GB RAM, 40 GB SSD. Enough for full pipeline.
Render time: ~8-10 min for 55 scenes.

---

## Cloudflare MCP: Why it saves tokens

### Without remote MCP (stdio mode, current)
```
IDE spawns: node src/mcp-server/server.js
IDE reads ALL stdout into context
Tool descriptions: ~2,000 tokens loaded every session
Tool results: full JSON injected into context window
Large results (55 scene script): ~8,000 tokens in context
```

### With Cloudflare Workers remote MCP
```
IDE connects to: https://video-pipeline-mcp.workers.dev/mcp
Tool descriptions: fetched once, cached by IDE, not in context
Tool results: streamed as SSE events, only summary in context
Large results: stored server-side, only metadata returned
Savings: 60-80% token reduction on tool-heavy sessions
```

### Token count comparison (one full pipeline run)

| Action | stdio tokens | Remote MCP tokens | Savings |
|--------|-------------|-------------------|---------|
| tools/list (each session) | ~2,100 | ~400 (cached) | -81% |
| research_topic result | ~800 | ~200 (truncated) | -75% |
| write_script result (55 scenes) | ~12,000 | ~500 (summary) | -96% |
| Total per video | ~18,000+ | ~3,500 | -81% |

With  at ~$0.015/1k tokens, producing 10 videos:
- stdio: ~$2.70/run
- Remote MCP: ~$0.53/run
- **Monthly savings on 100 videos: ~$22**

---

## Cloudflare R2 — Optional video storage (10 GB free/month)

If you want permanent video storage (Render /tmp is ephemeral):

1. Create R2 bucket in Cloudflare dashboard: `video-pipeline-output`
2. Add to `cloudflare-mcp/wrangler.toml`:
```toml
[[r2_buckets]]
binding = "VIDEO_BUCKET"
bucket_name = "video-pipeline-output"
```
3. After FFmpeg render, upload to R2:
```js
// In publish tool handler:
const videoBytes = await env.VIDEO_BUCKET.get(masterPath);
await env.VIDEO_BUCKET.put(`productions/${productionId}/master.mp4`, videoBytes);
const publicUrl = `https://pub-xxx.r2.dev/productions/${productionId}/master.mp4`;
```

R2 public buckets serve at `https://pub-xxx.r2.dev/` — free CDN for your videos.

---

## Recommended: Full hybrid stack (zero cost)

| Layer | Service | Cost |
|-------|---------|------|
| Agentic IDE |  / Codex / Cursor on your machine | $0 |
| Remote MCP | Cloudflare Workers free (100k req/day) | $0 |
| API orchestration | Render Free (research, script, assets, publish) | $0 |
| FFmpeg rendering | Your machine (delegated via Tailscale) | $0 |
| Video storage | Cloudflare R2 (10 GB/month free) | $0 |
| Tunnel | Tailscale (personal free — 3 devices) | $0 |
| LLM | Groq free tier (dev quota) | $0 |
| Image generation | Pollinations (unlimited free) | $0 |
| TTS | edge-tts (free, runs locally) | $0 |
| Delivery | file copy / webhook (free) | $0 |
| **TOTAL** | | **$0/month** |

To scale up when you outgrow this: add Render Starter ($7) for always-on rendering,
or migrate FFmpeg render to Oracle Always Free ARM for zero-cost high performance.

---

## Security checklist for Render + Cloudflare

- [ ] Set `MCP_AUTH_TOKEN` in Cloudflare Workers secrets (not env vars)
- [ ] Set `GROQ_API_KEY` in Render dashboard secrets (not committed to git)
- [ ] Set `PUBLISH_WEBHOOK_URL` in Render dashboard secrets (only if using webhook delivery)
- [ ] Restrict Worker API to accept connections only from Cloudflare Workers IP ranges
      (or add a shared secret header: `X-Internal-Token`)
- [ ] Tailscale: only allow your machine's Tailscale IP in `LOCAL_RENDER_URL`
- [ ] Never commit `.env` — it's in `.gitignore`
- [ ] Rotate all API keys after first production run (see docs/credential-rotation-procedures.md)
