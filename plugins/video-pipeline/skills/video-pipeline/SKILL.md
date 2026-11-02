---
name: video-pipeline
description: >
  Autonomous overnight video production pipeline. Given a topic, this skill
  researches, fact-checks, writes the script, synthesises voice, renders
  animation (Remotion/HTML+Playwright or n8n), runs quality gates, and
  delivers to Telegram or YouTube — all without human intervention.
  Works in IBM Bob, Claude Code, Cursor, Windsurf, Kiro IDE, or any IDE
  that loads Claude skills from ~/.claude/skills/ or .claude/skills/.
  Trigger phrases: "make a video about", "produce a reel on", "overnight
  batch", "queue videos", "generate video", "run the pipeline", "publish
  video". Also activates when a user pastes a topic list and says
  "make these" or "do the batch".
---

# Video Pipeline Skill

End-to-end autonomous video production. The AI proposes every creative
decision; deterministic systems (FFmpeg, Playwright, n8n, MCP) execute them;
a quality gate blocks bad output before delivery.

## Architecture

```
IDE Agent (IBM Bob / Claude Code / Cursor / Windsurf / Kiro)
    │
    ▼  MCP tools (port 3210) ──────────────────────────────────────────────
    │  research_topic  →  write_script  →  generate_scene_image
    │  render_tts  →  assemble_video  →  publish_video
    │
    ▼  Execution layer
    │  LLM provider:   PROVIDER_LLM=groq|watsonx|openai|ollama
    │  TTS provider:   PROVIDER_TTS=edge-tts|elevenlabs|azure|openai
    │  Image provider: PROVIDER_IMAGE=pollinations|fal|replicate|dalle
    │
    ▼  n8n workflow (optional orchestration)
       workflow.json  –  48-node pipeline, cron-triggered, Telegram delivery
       daily-video-workflow.json  –  35-node simpler variant
```

All secrets come from environment variables — **never** hardcoded.
See `references/providers.md` for the full env-var reference.

---

## Setup

### 1. Start the MCP server (one time)

```bash
cd <this repo>
npm install
node src/mcp-server/server.js
# Listens on http://localhost:3210
```

Register in your IDE:

**IBM Bob** (`.bob/mcp.json` or global `~/.bob/mcp.json`):
```json
{
  "mcpServers": {
    "video-pipeline": {
      "url": "http://localhost:3210",
      "transport": "http"
    }
  }
}
```

**Claude Code / Cursor / Windsurf** (`~/.claude/mcp.json` or project `.mcp.json`):
```json
{
  "mcpServers": {
    "video-pipeline": {
      "command": "node",
      "args": ["<absolute-path>/src/mcp-server/server.js"],
      "env": {
        "PROVIDER_LLM": "groq",
        "GROQ_API_KEY": "${GROQ_API_KEY}"
      }
    }
  }
}
```

**Kiro IDE** (`.kiro/mcp.json`):
```json
{
  "servers": {
    "video-pipeline": {
      "command": "node",
      "args": ["src/mcp-server/server.js"],
      "cwd": "<this repo>"
    }
  }
}
```

### 2. Set environment variables

Copy `.kiro/config/production-secrets.env.template` → `.env` and fill in:

```bash
# LLM (pick one)
PROVIDER_LLM=groq          # or: watsonx | openai | ollama
GROQ_API_KEY=gsk_...

# IBM watsonx (enterprise / data-residency deployments)
# PROVIDER_LLM=watsonx
# WATSONX_API_KEY=...
# WATSONX_PROJECT_ID=...
# LLM_BASE_URL=https://<region>.ml.cloud.ibm.com/ml/v1
# LLM_MODEL=ibm/granite-3-3-8b-instruct

# TTS (pick one)
PROVIDER_TTS=edge-tts       # free, no key
# PROVIDER_TTS=elevenlabs
# ELEVENLABS_API_KEY=sk_...

# Image (pick one)
PROVIDER_IMAGE=pollinations  # free, no key
# PROVIDER_IMAGE=fal
# FAL_API_KEY=...

# Delivery
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_API_BASE=https://api.telegram.org

# n8n
N8N_WEBHOOK_URL=http://localhost:5678
```

### 3. (Optional) Import into n8n

Import `workflow.json` (full 48-node pipeline) or `daily-video-workflow.json`
(35-node simpler variant) into your n8n instance. Both read from the same
env vars above — no hardcoded values remain.

---

## Workflow (step-by-step)

Work through these in order for a single video. For overnight batches, see
the Batch section below.

### 1. Research

Tell the skill the topic. It calls `research_topic` via MCP:

```
research_topic(topic="Why you should never Google customer-care numbers",
               productionId="prod-001")
```

Returns: researched talking points, verified facts with sources, hook ideas.
Every numerical claim is sourced. Unverifiable claims are flagged, not stated.

### 2. Script

```
write_script(productionId="prod-001",
             researchJson=<from step 1>,
             style="educational explainer, 55-65s, Malayalam with English tech words")
```

Returns: scenes array (label, caption lines, voice text, visual prompt per scene).
**Read the script before proceeding.** Changing one word after voice is generated
means redoing audio and timing.

Script structure that works:
| Part | Length | Job |
|------|--------|-----|
| Hook | 0–5 s | Shocking number / question / twist. No "hi guys". |
| Story | 15–25 s | One real case, simply told. |
| How it works | 10–15 s | The trick in one picture. |
| What to do | 10–15 s | 2–3 tips, best tip last. |
| CTA | 5 s | Follow / share / comment. |

### 3. Voice synthesis

```
render_tts(productionId="prod-001", sceneIndex=0,
           text="...", voice="en-US-GuyNeural", rate="-5%")
```

Repeat per scene. With `PROVIDER_TTS=edge-tts` this is free and offline.
With `PROVIDER_TTS=elevenlabs` you get voice cloning.

### 4. Scene images

```
generate_scene_image(productionId="prod-001", sceneIndex=0,
                     prompt="...", style="Simple History ink doodle")
```

With `PROVIDER_IMAGE=pollinations`: free, no key. Images are
1920×1080, consistent style.

### 5. Assemble video

```
assemble_video(productionId="prod-001", sceneCount=6,
               musicPath="/optional/music.mp3", musicVolume=0.08)
```

Runs FFmpeg concat demuxer → zoompan animation → caption drawtext →
audio ducking → loudness normalisation (-14 LUFS) → H.264 CRF 22 master.
Quality gate runs automatically and blocks if hard gates fail:
resolution, codec, pixel format, frame rate, LUFS, true peak,
black frames, frozen frames.

### 6. Publish

```
publish_video(productionId="prod-001",
              masterPath="/path/to/master.mp4",
              channels=["telegram"],
              youtubeTitle="...", youtubeDescription="...")
```

Sends to Telegram via curl (works in Docker / n8n without Node FormData).
YouTube upload via Data API v3 (OAuth2 resumable upload). See `docs/youtube-upload.md` for token setup.

---

## Overnight batch

```
I'm going to sleep. Make as many videos as you can before 9 AM.
Topics (queue them all):
  1. Why you should never Google customer-care numbers
  2. The SIM swap scam explained simply
  3. What happens when you click a phishing link

Rules:
- Strong hook, double-verify every fact.
- After each video: run the quality gate, then publish to Telegram.
- Leave me a summary of topics + source URLs + captions when done.
```

The skill will call MCP tools sequentially for each topic using
the StateMachine to track progress. If a stage fails, it retries
with exponential backoff (jitter). If it fails terminally, it marks
that production FAILED and moves to the next topic.

---

## Provider reference

| Role | Provider | Key env var | Notes |
|------|----------|-------------|-------|
| LLM | groq | `GROQ_API_KEY` | Default. Fast, free tier. |
| LLM | **watsonx** | `WATSONX_API_KEY` + `WATSONX_PROJECT_ID` | IBM enterprise, data residency, granite-3.3 |
| LLM | openai | `OPENAI_API_KEY` | GPT-4o |
| LLM | ollama | _(none)_ | Local, `LLM_BASE_URL=http://localhost:11434` |
| TTS | edge-tts | _(none)_ | Free, offline, 300+ voices |
| TTS | elevenlabs | `ELEVENLABS_API_KEY` | Voice cloning |
| TTS | azure | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` | Enterprise |
| TTS | openai | `OPENAI_API_KEY` | High quality |
| Image | pollinations | _(none)_ | Free, no key |
| Image | fal | `FAL_API_KEY` | Fast FLUX |
| Image | replicate | `REPLICATE_API_TOKEN` | Flexible |
| Image | dalle | `OPENAI_API_KEY` | DALL-E 3 |

---

## IDE-specific notes

### IBM Bob
Bob is the primary target platform. The MCP server registers all 6 tools
(`research_topic`, `write_script`, `generate_scene_image`, `render_tts`,
`assemble_video`, `publish_video`) which Bob can call directly in any
conversation. No n8n is required — Bob drives the pipeline step by step.

For watsonx models in Bob: set `PROVIDER_LLM=watsonx` and configure the
watsonx env vars. The `LLMProvider` class in `src/pipeline/providers.js`
handles the IBM IAM token exchange automatically.

### Claude Code
Install via plugin marketplace:
```
/plugin marketplace add <your-org>/auto-vid-gen
/plugin install video-pipeline@auto-vid-gen
```
Or manually: `./install.sh` (copies skill to `~/.claude/skills/video-pipeline`).

### Cursor / Windsurf
Register the MCP server in project settings. The 6 tools appear in the
tool palette. Cursor's Agent mode can run the overnight batch unattended.

### Kiro IDE
Add to `.kiro/mcp.json`. Kiro's spec-driven workflow pairs well with the
StateMachine — each spec task maps to one MCP tool call.

---

## Quality gates (hard — will block delivery)

| Gate | Threshold |
|------|-----------|
| File size | > 1 MB |
| Video stream | present |
| Resolution (master) | 1920×1080 |
| Resolution (short) | 1080×1920 |
| Codec | H.264 |
| Pixel format | yuv420p |
| Frame rate | 24–30 fps |
| Integrated loudness | −14 ±1.5 LUFS |
| True peak | ≤ −0.5 dBTP |
| Black frames | none > 0.5 s |
| Frozen frames | none > 0.5 s |

Sanity checks (warn, do not block): video bitrate ≥ 3 Mbps, duration in expected range.

---

## Files

```
src/mcp-server/server.js          MCP server (6 tools, port 3210)
src/pipeline/providers.js         LLM / TTS / Image abstraction
src/pipeline/state-machine.js     PostgreSQL + file production state
src/pipeline/retry-policy.js      Exponential backoff, stage timeouts
src/pipeline/telemetry.js         NDJSON + PostgreSQL cost tracking
src/quality-gate/gate.js          9 hard gates, safe spawnSync (no eval)
src/audio-mixer/mixer.js          Sidechain ducking, LUFS normalisation
src/shorts-extractor/extractor.js Silence-based 9:16 crop for Shorts
src/fact-checker/checker.js       Claim risk classification + evidence gates
src/video-renderer/renderer.js    Scene render + master assembly
workflow.json                     n8n 48-node pipeline (all credentials env-var)
daily-video-workflow.json         n8n 35-node simpler variant
references/providers.md           Full env-var reference for all providers
references/mcp-tools.md           MCP tool schemas and examples
```
