# Deployment Guide — Task #36

How to run the full autonomous video pipeline on a Raspberry Pi, Linux server, or Docker container alongside n8n.

---

## Architecture deployed

```
                    ┌─────────────────────────────────┐
  IDE (Bob/Cursor)  │  MCP Server  :3210              │
  n8n Code nodes ──▶│  Worker API  :3211              │ ← this machine
                    │  n8n         :5678              │
                    │  PostgreSQL  :5432 (optional)   │
                    └─────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | `nvm install 18` |
| FFmpeg | ≥ 5.0 | `apt install ffmpeg` |
| edge-tts | any | `npm install -g edge-tts` |
| curl | ≥ 7.68 | pre-installed on most Linux |
| n8n | ≥ 1.x | `npm install -g n8n` (optional) |

---

## Step 1 — Clone and configure

```bash
git clone <your-repo-url> auto-vid-gen
cd auto-vid-gen
npm install          # no dependencies currently — safe no-op
cp .kiro/config/production-secrets.env.template .env
```

Edit `.env` and fill in at minimum:

```bash
# Required for LLM
PROVIDER_LLM=groq
GROQ_API_KEY=gsk_...

# Required for delivery
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Optional — free providers work without keys
PROVIDER_TTS=edge-tts
PROVIDER_IMAGE=pollinations
```

---

## Step 2 — Start the MCP server

```bash
source .env          # or: export $(cat .env | xargs)
npm start            # node src/mcp-server/server.js
# Listening on http://127.0.0.1:3210
```

Test it:
```bash
curl -s http://127.0.0.1:3210/health | python3 -m json.tool
```

---

## Step 3 — Start the Worker API

```bash
npm run start:worker  # node src/worker/server.js
# Listening on http://127.0.0.1:3211
```

Test with a full pipeline job:
```bash
curl -s -X POST http://127.0.0.1:3211/jobs \
  -H 'Content-Type: application/json' \
  -d '{"type":"research","payload":{"topic":"Why ancient humans never brushed their teeth"}}' \
  | python3 -m json.tool

# Poll status:
curl -s http://127.0.0.1:3211/jobs/<jobId> | python3 -m json.tool
```

---

## Step 4 — (Optional) Import n8n workflow

1. Open n8n at `http://localhost:5678`
2. Import → Upload file → select `workflow.json`
3. Set n8n environment variables in n8n Settings → Variables:
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_API_BASE`
   - `GEMINI_API_KEY`, `GROQ_API_KEY`
4. Configure the `Header Auth account` credential with your Groq API key
5. Activate the workflow

---

## Step 5 — Register MCP server in your IDE

### IBM Bob (`~/.bob/mcp.json`)
```json
{
  "mcpServers": {
    "video-pipeline": {
      "command": "node",
      "args": ["/absolute/path/to/src/mcp-server/server.js"],
      "env": {
        "PROVIDER_LLM": "groq",
        "GROQ_API_KEY": "${GROQ_API_KEY}",
        "PROVIDER_TTS": "edge-tts",
        "PROVIDER_IMAGE": "pollinations",
        "TELEGRAM_BOT_TOKEN": "${TELEGRAM_BOT_TOKEN}",
        "TELEGRAM_CHAT_ID": "${TELEGRAM_CHAT_ID}"
      }
    }
  }
}
```

### Claude Code / Cursor / Windsurf (`.mcp.json` in project root)
```json
{
  "mcpServers": {
    "video-pipeline": {
      "command": "node",
      "args": ["src/mcp-server/server.js"],
      "env": {
        "GROQ_API_KEY": "${GROQ_API_KEY}"
      }
    }
  }
}
```

### Kiro IDE (`.kiro/mcp.json`)
```json
{
  "servers": {
    "video-pipeline": {
      "command": "node",
      "args": ["src/mcp-server/server.js"],
      "cwd": "/absolute/path/to/auto-vid-gen"
    }
  }
}
```

---

## Step 6 — Install as a skill

```bash
./install.sh         # copies to ~/.claude/skills/video-pipeline
./install.sh --bob   # copies to ~/.bob/skills/video-pipeline
```

Restart your IDE. The skill appears in the skill palette and the MCP tools appear in the tool palette.

---

## Raspberry Pi / low-memory notes

- Use `PROVIDER_LLM=ollama` with `LLM_MODEL=llama3.2:1b` for local inference
- Use `PROVIDER_IMAGE=pollinations` (free, no local GPU needed)
- Set `parallelism=1` in runAssets calls if RAM < 2 GB
- FFmpeg render is CPU-bound: a 55-scene video takes ~45 min on Pi 4

---

## Process manager (systemd)

```ini
# /etc/systemd/system/video-mcp.service
[Unit]
Description=Video Pipeline MCP Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/home/node/auto-vid-gen
EnvironmentFile=/home/node/auto-vid-gen/.env
ExecStart=/usr/bin/node src/mcp-server/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable video-mcp video-worker
sudo systemctl start  video-mcp video-worker
sudo journalctl -fu   video-mcp
```

---

## Checking the pipeline ran

```bash
# See all productions
ls -lh /home/node/.n8n-files/state/

# See usage/cost log
cat /home/node/.n8n-files/usage.ndjson | python3 -c "
import sys,json
for line in sys.stdin:
    d=json.loads(line)
    print(f\"{d['stage']:20} {d['provider']:12} {d['units']:6} units  {d.get('estimated_cost','?')} USD\")
"

# See production package
ls -lh /home/node/.n8n-files/packages/
```

---

## Overnight batch (IBM Bob)

In any Bob conversation with the MCP server registered:

```
I'm going to sleep. Queue these topics and produce a video for each one:
1. Why ancient humans never got bored
2. How ancient humans dealt with heartbreak
3. What ancient humans did for fun at night

Use Telegram delivery. Double-verify every fact. Leave me a summary of results.
```

Bob will call `research_topic` → `write_script` → `generate_scene_image` × N → `render_tts` × N → `assemble_video` → `publish_video` for each topic in sequence, reporting progress.
