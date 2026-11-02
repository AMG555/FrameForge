<div align="center">

# ⚡ FrameForge

### AI Video Production Engine for Any Agentic IDE

**Any IDE. Any topic. Any style. 1080p broadcast-quality videos from a single tool call.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](CHANGELOG.md)
[![MCP Spec](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/tests-381%20passing-brightgreen.svg)](#-testing)
[![FFmpeg](https://img.shields.io/badge/engine-FFmpeg%20native-red.svg)](https://ffmpeg.org/)

[Quickstart](#-60-second-quickstart) · [Connect Your IDE](#-connect-your-ide) · [14 MCP Tools](#-mcp-tools-reference) · [HTML Renderer](#-html-renderer) · [Architecture](#-architecture) · [Deploy](#-deployment)

---

</div>

## What is FrameForge?

**FrameForge is a rendering execution engine. Your IDE is the intelligence.**

Connect IBM Bob, Codex, opencode, Cursor, Windsurf, Claude Code, or any MCP-capable tool via the Cloudflare Remote MCP endpoint. The IDE agent writes the video script — FrameForge handles TTS synthesis, AI image generation, FFmpeg compositing, audio mastering, quality gating, and delivery.

No hardcoded topics, styles, or characters. Any format, any language, any visual aesthetic.

```
Your IDE agent writes this:              FrameForge renders this:
──────────────────────────               ─────────────────────────
scenes: [                                final_video_1080p.mp4 ✓
  { narration: "...",                    short_1_vertical.mp4  ✓
    caption: "OVERLAY",                  video_meta.json       ✓
    visual_description: "..." }          → file output / webhook
]
```

---

## Key Features

| | Feature | Detail |
|--|---------|--------|
| ☁️ | **Cloudflare Remote MCP** | One HTTPS URL, every IDE. ~80% fewer context tokens vs local stdio. |
| 🤖 | **Agent-first path** | `create_video_from_script` — your IDE writes scenes, FrameForge renders. Zero internal LLM. |
| 🎙️ | **Multi-platform voice** | Switch between ElevenLabs, Azure, OpenAI TTS, and edge-tts **per call** — no `.env` change needed. |
| 🎬 | **Bring your own media** | Mix AI visuals with your own clips, images, and pre-recorded voiceovers per scene. |
| 🎚️ | **Broadcast-grade audio** | Voice compression, sidechain music ducking, EBU R128 −14 LUFS normalization. |
| 📱 | **Vertical Shorts** | Silence-detecting boundary clustering + focal-point-aware 9:16 crop. |
| 🛡️ | **Hard quality gates** | Resolution, codec, LUFS, black frames, frozen frames — broken output never ships. |
| 🔁 | **Resume-safe pipeline** | Content-addressed artifact manifest; re-runs skip already-rendered scenes. |
| 💰 | **Cost tracking** | NDJSON usage log with USD estimates per LLM / TTS / image call. |

---

## 60-Second Quickstart

### 1. Install prerequisites

```bash
node --version    # need ≥ 18
ffmpeg -version   # need ≥ 5.0   (brew install ffmpeg / apt install ffmpeg)
npm install -g edge-tts   # free offline TTS — no account needed
```

### 2. Clone and configure

```bash
git clone https://github.com/AMG555/FrameForge.git
cd FrameForge
npm run doctor        # pre-flight check — tells you what's missing
npm run setup         # interactive key wizard (~2 min)
```

Minimum `.env` for a free, zero-cost run:

```env
GROQ_API_KEY=gsk_...         # free tier — console.groq.com
PROVIDER_LLM=groq
PROVIDER_TTS=edge-tts        # free, offline — no key needed
PROVIDER_IMAGE=pollinations  # free — no key needed
```

### 3. Generate your first video

```bash
npm run make -- --topic "How does GPS actually work?"
```

Output in `.frameforge-files/`:

```
final_video_<id>.mp4    1080p landscape master
short_1_<id>.mp4        auto-extracted 9:16 vertical Short
video_meta.json         title, description, tags, chapter markers
usage.ndjson            per-call cost log
```

---

## Connect Your IDE

### ☁️ Cloudflare Remote MCP (recommended)

One URL works everywhere. No local server process, no port forwarding, ~80% fewer context tokens than stdio.

**Deploy once (< 2 minutes):**

```bash
cd cloudflare-mcp
npm install
wrangler secret put WORKER_API_URL      # https://your-render-app.onrender.com
wrangler secret put MCP_AUTH_TOKEN      # any 32-byte hex string
wrangler secret put INTERNAL_API_TOKEN  # different 32-byte hex string
wrangler deploy
```

**Add to any IDE:**

```json
{
  "mcpServers": {
    "frameforge": {
      "url": "https://video-mcp.YOUR_SUBDOMAIN.workers.dev/mcp",
      "headers": { "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN" }
    }
  }
}
```

Same block works in IBM Bob, Codex, opencode, Cursor, Windsurf, Claude Code, VS Code + Copilot, JetBrains AI, and any MCP-capable tool. See [`cloudflare-mcp/`](cloudflare-mcp/) for the full deployment guide.

---

### 💻 Local stdio (alternative — no cloud account needed)

```json
{
  "mcpServers": {
    "frameforge": {
      "command": "node",
      "args": ["/absolute/path/to/FrameForge/src/mcp-server/stdio.js"],
      "env": {
        "GROQ_API_KEY": "gsk_...",
        "PROVIDER_LLM": "groq",
        "PROVIDER_TTS": "edge-tts",
        "PROVIDER_IMAGE": "pollinations"
      }
    }
  }
}
```

---

## Using FrameForge from Your IDE

### Agent-first path (recommended)

Your IDE agent writes the `scenes[]` array. FrameForge renders it. No internal LLM needed.

```
create_video_from_script({
  scenes: [
    {
      narration: "WiFi sends data as invisible radio waves at 2.4 or 5 GHz.",
      caption: "RADIO WAVES",
      visual_description: "router emitting concentric waves, flat design, bold colors"
    },
    {
      narration: "Your laptop picks up the signal and decodes the packets instantly.",
      caption: "YOUR DEVICE",
      visual_description: "laptop with signal bars, white background, minimal illustration"
    }
  ],
  imageStyle: "flat design, white background, bold primary colors"
})
→ { masterPath: "/files/final_video_abc123.mp4", passed: true, sceneCount: 2 }
```

### Auto-research path

Let FrameForge handle research and scripting internally:

```
1. research_topic({ topic: "How GPS works", style: "educational", format: "YouTube short" })
2. write_script({ ...claims, persona: "tech explainer", language: "en", targetDuration: 60 })
3. render_from_scenes({ productionId, skipImages: false })
```

### Bring your own media

Pass per-scene paths to skip AI generation for any scene:

```json
{
  "narration": "Here is the sorting algorithm running step by step.",
  "caption": "ALGORITHM",
  "video_path": "/recordings/screen_capture.mp4",
  "audio_path": "/recordings/my_voice.mp3"
}
```

Any combination of `image_path`, `video_path`, `audio_path` works. FrameForge generates only what you don't supply.

---

## MCP Tools Reference

| # | Tool | Description |
|---|------|-------------|
| 1 | `research_topic` | Research any topic. Extracts + fact-checks claims. Accepts `persona`, `style`, `format`, `audience`. |
| 2 | `write_script` | Generate a video script from claims. Any style, language, persona, duration, or visual aesthetic. |
| 3 | `generate_scene_image` | Generate one scene image using the configured image provider. `imageStyle` controls the aesthetic. |
| 4 | `render_tts` | Synthesize narration audio for one scene using the configured TTS provider. |
| 5 | `assemble_video` | FFmpeg render + 7-point quality gate → master MP4. |
| 6 | `publish_video` | Deliver finished video via file copy or HTTP webhook. |
| 7 | `ingest_media` | Import your own clips, images, and audio into a scenes manifest. |
| 8 | `edit_scenes` | Read and patch an existing scenes manifest — update captions, swap files, append scenes. |
| 9 | `render_from_scenes` | Render directly from a scenes manifest, skipping research and scripting. |
| 10 | `external_platform_call` | HTTP bridge to VoxForge, Runway, ElevenLabs, Remotion, or any external platform. |
| 11 | `create_video_from_script` | **Agent-first.** Your IDE writes the scenes, FrameForge renders. No internal LLM. |
| 12 | `multi_voice_tts` | Call any TTS platform per-request (ElevenLabs / Azure / OpenAI / edge-tts / webhook) without touching `.env`. |
| 13 | `queue_full_pipeline` | Queue a full pipeline run via the Worker API. Returns `{ jobId, status }` immediately. |
| 14 | `get_job_status` | Poll a queued job by `jobId`. Returns `{ status, stage, result }`. Call every 30s until `SUCCEEDED`. |

---

## HTML Renderer

For motion-graphics-quality output, FrameForge includes an HTML compositor renderer as an alternative to FFmpeg zoompan. Instead of camera presets, every animation is a pure function of the frame number — the same approach as Remotion, but without a React runtime.

| | FFmpeg zoompan (default) | HTML renderer |
|--|--------------------------|---------------|
| **Speed** | Fast — no browser | Slower — Playwright renders each frame |
| **Quality** | Ken-Burns, pan, tilt | Kinetic text, springs, counters, captions |
| **Requirements** | FFmpeg only | FFmpeg + Playwright + Chromium |
| **Best for** | Overnight batch, Shorts | Creator-quality motion graphics |

### Quick start

```bash
# 1. Get a script JSON from FrameForge
npm run make -- --topic "How GPS works" --dry-run --out-dir output/gps

# 2. Scaffold the HTML renderer project
node scripts/html-renderer/new-project.mjs \
  --script output/gps/<productionId>-script.json \
  --out    output/gps/html-render/

# 3. Install Playwright
npx playwright install chromium

# 4. Check visuals (fast)
node scripts/render.mjs sheet

# 5. Transcribe TTS audio for word-level captions
uv run scripts/transcribe.py

# 6. Full render + verify
node scripts/render.mjs full
uv run scripts/verify.py
```

The scaffold produces `edit.js` with one `layer()` per scene. Each layer is a pure function of `t` (seconds). Edit the animation math, re-run `render.mjs sheet` to check, repeat until satisfied, then `render.mjs full` to encode.

The finished MP4 can be fed back into FrameForge via `video_path` in any scene, or published directly with `publish_video`.

See [`plugins/video-pipeline/skills/html-renderer/SKILL.md`](plugins/video-pipeline/skills/html-renderer/SKILL.md) for the full workflow and engine API.

---

## Providers

Switch any provider by setting the corresponding env var — no code changes.

### LLM providers

Set `PROVIDER_LLM=` to any supported provider. Override the model with `LLM_MODEL=your-model-id` and the endpoint with `LLM_BASE_URL=https://...` — any OpenAI-compatible API works.

### TTS providers

| `PROVIDER_TTS=` | Notes | Key |
|-----------------|-------|-----|
| `edge-tts` | Free, offline, 300+ voices | — |
| `elevenlabs` | Voice cloning, highest quality | `ELEVENLABS_API_KEY` |
| `azure` | Natural voices, multilingual | `AZURE_SPEECH_KEY` |
| `openai` | Fast, clean narration | `OPENAI_API_KEY` |
| `webhook` | Any HTTP TTS endpoint | `WEBHOOK_TTS_URL` |

Use `multi_voice_tts` to override the provider per call without changing `.env`.

### Image generation providers

| `PROVIDER_IMAGE=` | Notes | Key |
|-------------------|-------|-----|
| `pollinations` | Free, no account | — |
| `falai` | Fast, high quality | `FALAI_API_KEY` |
| `replicate` | 1000+ models | `REPLICATE_API_KEY` |
| `dalle` | DALL-E 3 | `OPENAI_API_KEY` |
| `webhook` | Any HTTP image endpoint | `CUSTOM_IMAGE_URL` |

---

## Architecture

```
YOUR IDE (IBM Bob / Codex / opencode / Cursor / Windsurf / Claude Code)
         │
         │  HTTPS + SSE  (Cloudflare Remote MCP)
         ▼
[Cloudflare Workers]   ← caches schemas, proxies tool calls, keeps IDE context lean
         │
         │  HTTP + INTERNAL_API_TOKEN
         ▼
[FrameForge Node]  ← runs on Render free / VPS / Pi / your machine
         │
         ├─ src/pipeline/
         │   ├─ providers.js        LLM / TTS / Image providers (env-var-switchable)
         │   ├─ state-machine.js    file + PostgreSQL production state
         │   ├─ retry-policy.js     exponential backoff, FATAL/NON_RETRYABLE/RETRYABLE
         │   ├─ telemetry.js        NDJSON cost tracking per provider
         │   ├─ artifact-manifest.js  content-addressed idempotency manifest
         │   └─ artifact-retention.js permanent / 30-day / temp sweep
         │
         ├─ src/workflows/
         │   ├─ research.js   research + fact extraction
         │   ├─ script.js     scene schema v2.0.0 generation + normalisation
         │   ├─ assets.js     parallel image gen + TTS (configurable concurrency)
         │   ├─ render.js     FFmpeg zoompan + captions + quality gate
         │   ├─ shorts.js     silence segmentation + focal-point 9:16 crop
         │   ├─ packaging.js  manifest + metadata JSON
         │   └─ publishing.js file copy + HTTP webhook delivery
         │
         ├─ src/mcp-server/
         │   ├─ server.js   HTTP MCP (port 3210) — 14 tools
         │   └─ stdio.js    stdio MCP — same 14 tools
         │
         └─ src/worker/
             ├─ server.js              full worker (local / VPS)
             └─ server-render-free.js  Render.com free tier (api_only mode)
                                       delegates FFmpeg to LOCAL_RENDER_URL
```

---

## Quality Gates

Every video passes 7 automated checks before delivery. Any failure blocks the output.

| Gate | Requirement |
|------|-------------|
| Resolution | 1920×1080 (landscape) or 1080×1920 (shorts) |
| Video codec | H.264, high profile, level 4.1, yuv420p |
| Integrated loudness | −14 LUFS ± 1.5 LU |
| True peak | ≤ −0.5 dBTP |
| Black frames | None longer than 0.5 s |
| Frozen frames | None longer than 0.5 s |
| File integrity | > 1 MB, valid video + audio streams |

---

## Deployment

### Render.com free tier + local render (recommended)

FrameForge has a split-worker design. Network-bound work (LLM, TTS, image APIs) runs on the Render free tier (512 MB RAM). FFmpeg render jobs are delegated to your local machine, Pi, or VPS.

```
Render free tier  ← research, script, assets, packaging, publishing
Your local machine ← render, shorts (FFmpeg, ~800 MB RAM peak)
```

See [`render.yaml`](render.yaml) for the Render deploy config and [`docs/deployment.md`](docs/deployment.md) for the full step-by-step guide.

### Environment variables

```bash
cp docs/env.template .env
# then edit .env — minimum:
GROQ_API_KEY=gsk_...
PROVIDER_LLM=groq
PROVIDER_TTS=edge-tts
PROVIDER_IMAGE=pollinations
```

Full reference: [`docs/env.template`](docs/env.template)

### systemd (Linux VPS / Pi)

```ini
[Unit]
Description=FrameForge MCP Server
After=network.target

[Service]
User=node
WorkingDirectory=/home/node/FrameForge
EnvironmentFile=/home/node/FrameForge/.env
ExecStart=/usr/bin/node src/mcp-server/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable frameforge
sudo systemctl start  frameforge
sudo journalctl -fu   frameforge
```

---

## CLI Reference

| Command | What it does |
|---------|--------------|
| `npm run doctor` | Pre-flight check — Node, FFmpeg, edge-tts, env vars |
| `npm run setup` | Interactive provider key wizard (writes `.env`) |
| `npm run setup:check` | Validate an existing `.env` |
| `npm run make -- --topic "..."` | Full pipeline: research → render → deliver |
| `npm run mcp` | HTTP MCP server on port 3210 |
| `npm run mcp:stdio` | stdio MCP server |
| `npm run start:worker` | Background queue worker |
| `npm run start:worker:render` | Render-optimised worker (api_only mode) |
| `npm run start:local-render` | Local full-render worker (RENDER_MODE=full) |
| `npm run validate` | Deep structural validation (113 checks) |
| `npm test` | Unit test suite (375 tests, 80 suites) |

**`npm run make` flags:**

```bash
npm run make -- \
  --topic "How GPS works" \
  --style educational \       # educational | comedic | documentary | vlog | tutorial
  --format "YouTube short" \  # YouTube video | YouTube short | Instagram reel | explainer
  --language en \             # BCP-47 code
  --no-publish \              # render only, skip delivery
  --no-shorts \               # skip vertical crop
  --channels file,webhook
```

---

## Testing

375 tests across 16 modules — run with:

```bash
npm test
```

| Module | Tests | Covers |
|--------|-------|--------|
| `retry-policy` | 30 | Error classification, retry/dead-letter/FATAL, backoff math |
| `telemetry` | 15 | `estimateCost` all providers, NDJSON round-trip, cost aggregation |
| `artifact-manifest` | 22 | create/load/resume/overwrite, scene updates, idempotency checks |
| `artifact-retention` | 21 | All 4 retention categories, tagging, sweep, dryRun |
| `external-adapter` | 23 | `isConfigured`, 5 platform presets, auth headers, MIME, poll logic |
| `script` | 34 | `normaliseScene` all fields, clamping, legacy compat, free-form character_id |
| `animation-system` | 40 | All 11 camera hints, MAX_ZOOM constraint, transitions, auto quadrant |
| `review-gate` | 22 | All risk × status combos, `formatReviewRequest`, `recordHumanDecision` |
| `log-redaction` | 30 | 14 credential patterns, nested object redaction, safe logger |
| `server-render-free` | 18 | `timingSafeEqual`, 4 MB body limit, path traversal guard |
| `mcp-server` | 17 | `readBodyLimited`, `LLMProvider.parseJson`, TTSProvider overrides, outputPath guard |
| `quality-gate` | 9 | instantiation, result schema, ffprobe/ffmpeg helpers |
| `extractor` | 30 | focal point math, segment scoring, silence boundaries |
| `mixer` | 14 | detectPauses, mixWithDucking, mixVideo error handling |
| `renderer` | 23 | captionFilter, discoverScenes, findMusicFile, renderScene errors |
| `checker` | 27 | claim normalization, risk classification, gate pass logic, cache |

---

## Security

- **Timing-safe auth** — All token comparisons use `crypto.timingSafeEqual` (no timing oracle)
- **Body size limits** — All three HTTP servers reject requests > 4 MB with HTTP 413
- **Path traversal guards** — `productionId` and `outputPath` validated before any file operation
- **Credential redaction** — 14 regex patterns strip keys from all logs at the source
- **No secrets in code** — All keys via `.env`; `.gitignore` covers it

Report vulnerabilities: [SECURITY.md](SECURITY.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

Quick checklist:
1. `npm run doctor` passes on your OS
2. `npm test` passes (375/375)
3. `npm run validate` passes (113/113 checks)
4. FFmpeg commands keep `-nostdin` and cross-platform font paths
5. Commit messages: plain imperative sentences — no `feat:`/`fix:` prefixes

---

## License

MIT — see [LICENSE](LICENSE).
