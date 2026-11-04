<div align="center">

# ⚡ FrameForge

### AI Video Production Engine for Any Agentic IDE

**Any IDE. Any topic. Any style. 1080p broadcast-quality videos from a single tool call.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](CHANGELOG.md)
[![MCP Spec](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/tests-475%20passing-brightgreen.svg)](#testing)
[![FFmpeg](https://img.shields.io/badge/engine-FFmpeg%20native-red.svg)](https://ffmpeg.org/)

</div>

---

FrameForge is an MCP server your IDE agent calls to make videos. You write the scenes — FrameForge handles TTS, image generation, FFmpeg compositing, audio mastering, and quality gating.

**No hardcoded topics, styles, or characters. No LLM key required for the agent path.**

---

## Get Started

**Prerequisites:** Node ≥ 18, FFmpeg ≥ 5, `pip install edge-tts`

```bash
git clone https://github.com/AMG555/FrameForge.git
cd FrameForge
npm run doctor    # checks everything and tells you what's missing
npm run setup     # interactive wizard — writes .env for you
npm run mcp       # MCP server on :3210, ready for your IDE
```

That's it. Three commands. Your IDE can now call FrameForge tools.

---

## Make Your First Video

Once the server is running, call this tool from any connected IDE:

```
create_video_from_script({
  scenes: [
    {
      narration: "GPS works by triangulating signals from at least four satellites.",
      caption: "GPS TRIANGULATION",
      visual_description: "satellite orbiting earth, flat illustration, bold colors"
    },
    {
      narration: "Your phone measures tiny timing differences to pinpoint your location.",
      caption: "YOUR LOCATION",
      visual_description: "phone with pin on map, white background, minimal illustration"
    }
  ],
  title: "How GPS Works"
})
```

Output lands in `.frameforge-files/`:

```
final_video_<id>.mp4   →  1080p landscape master
short_1_<id>.mp4       →  auto-extracted 9:16 vertical Short
video_meta.json        →  title, description, tags, chapters
```

> **No API keys required** for this path. `edge-tts` (voice) and `pollinations` (images) are both free with no signup. If Pollinations is slow, add `FALAI_API_KEY` and set `PROVIDER_IMAGE=falai` — that's the only change needed.

---

## Connect Your IDE

### Option A — Cloudflare Remote MCP (one URL, every IDE)

Deploy once, use from anywhere — no local server, no port forwarding.

```bash
cd cloudflare-mcp && npm install
wrangler secret put WORKER_API_URL      # your backend URL
wrangler secret put MCP_AUTH_TOKEN      # any 32-char secret
wrangler deploy
```

Add to any IDE's MCP config:

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

Works in Bob, Codex, opencode, Cursor, Windsurf, Claude Code, VS Code + Copilot, JetBrains AI, and any MCP-capable tool. See [`cloudflare-mcp/`](cloudflare-mcp/) for the full guide.

### Option B — Local stdio (no cloud account)

```json
{
  "mcpServers": {
    "frameforge": {
      "command": "node",
      "args": ["/absolute/path/to/FrameForge/src/mcp-server/stdio.js"],
      "env": {
        "PROVIDER_TTS":   "edge-tts",
        "PROVIDER_IMAGE": "pollinations"
      }
    }
  }
}
```

---

## Two Ways to Use FrameForge

### Agent-first — your IDE writes the scenes (recommended)

Your IDE's model (Claude, GPT-4o, Gemini…) writes the script. FrameForge only runs FFmpeg, TTS, and image generation. **No `PROVIDER_LLM` or LLM key needed.**

Use `create_video_from_script` — the example above is this path.

### Auto-research — FrameForge writes its own script

For overnight batch runs or when FrameForge runs without an IDE. It calls its own LLM for research and scripting. Requires `PROVIDER_LLM` + API key, or `PROVIDER_LLM=ollama` for zero-cost local operation.

```bash
npm run make -- --topic "How does GPS actually work?"
```

Or via tools: `research_topic` → `write_script` → `render_from_scenes`

---

## Bring Your Own Media

Skip AI generation for any scene by passing your own files:

```json
{
  "narration": "Here is the sorting algorithm running step by step.",
  "caption": "ALGORITHM",
  "video_path": "/recordings/screen_capture.mp4",
  "audio_path": "/recordings/my_voice.mp3"
}
```

Any mix of `image_path`, `video_path`, `audio_path` works — FrameForge generates only what you don't supply.

---

## MCP Tools

| # | Tool | Notes |
|---|------|-------|
| 1 | `create_video_from_script` | **Agent-first. No LLM key.** Your IDE writes scenes, FrameForge renders. |
| 2 | `render_from_scenes` | Render from an existing scenes manifest, skipping research and scripting. |
| 3 | `ingest_media` | Import your own clips, images, and audio into a scenes manifest. |
| 4 | `edit_scenes` | Read and patch a scenes manifest — update captions, swap files, append scenes. |
| 5 | `render_tts` | Synthesize narration audio for one scene. |
| 6 | `multi_voice_tts` | Call any TTS platform per-request without touching `.env`. |
| 7 | `generate_scene_image` | Generate one scene image via the configured image provider. |
| 8 | `assemble_video` | FFmpeg render + quality gate → master MP4. |
| 9 | `publish_video` | Deliver finished video via file copy or HTTP webhook. |
| 10 | `research_topic` | Research a topic and fact-check claims. **Needs `PROVIDER_LLM`.** |
| 11 | `write_script` | Generate a scene script from research claims. **Needs `PROVIDER_LLM`.** |
| 12 | `queue_full_pipeline` | Queue a full pipeline run via the Worker API. Returns `{ jobId }` immediately. |
| 13 | `get_job_status` | Poll a queued job. Returns `{ status, stage, result }`. |
| 14 | `external_platform_call` | HTTP bridge to ElevenLabs, Runway, Replicate, or any custom platform. |

> Tools 10, 11, and 12 make internal LLM calls. All others run deterministic code (FFmpeg, file I/O, HTTP).

---

## Providers

Switch any provider with one env var — no code changes.

### TTS (voice)

| Provider | Env var | Notes |
|----------|---------|-------|
| `edge-tts` | none | Free, offline, no account. **Default.** |
| `elevenlabs` | `ELEVENLABS_API_KEY` | Best quality, voice cloning. |
| `azure` | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` | Microsoft Neural voices. |
| `openai` | `OPENAI_API_KEY` | alloy, nova, shimmer, etc. |
| `webhook` | `WEBHOOK_TTS_URL` | Any custom TTS endpoint. |

Set `PROVIDER_TTS=<name>`. Use `multi_voice_tts` to override per call without touching `.env`.

### Images

| Provider | Env var | Notes |
|----------|---------|-------|
| `pollinations` | none | Free, no account. **Default.** May be slow at peak times. |
| `falai` | `FALAI_API_KEY` | Fast, high quality. Free tier at fal.ai. |
| `replicate` | `REPLICATE_API_KEY` | Any Replicate model. |
| `dalle` | `OPENAI_API_KEY` | DALL-E 3. |
| `webhook` | `WEBHOOK_IMAGE_URL` | Any custom image endpoint. |

Set `PROVIDER_IMAGE=<name>`.

### LLM (auto-research path only)

> Only needed for `research_topic`, `write_script`, and `queue_full_pipeline`. Skip entirely when using `create_video_from_script`.

| Provider | Env var | Notes |
|----------|---------|-------|
| `groq` | `GROQ_API_KEY` | Free tier, fast. [console.groq.com](https://console.groq.com) |
| `gemini` | `GEMINI_API_KEY` | Free tier. [aistudio.google.com](https://aistudio.google.com) |
| `ollama` | none | Fully local, zero cost. Set `OLLAMA_MODEL`. |
| `openrouter` | `OPENROUTER_API_KEY` | One key → Claude, GPT-4o, Gemini, Llama… |
| `anthropic` | `ANTHROPIC_API_KEY` | Claude direct. |
| `openai` | `OPENAI_API_KEY` | GPT-4o direct. |
| `webhook` | `WEBHOOK_LLM_URL` | Any OpenAI-compatible endpoint. |

Set `PROVIDER_LLM=<name>`.

---

## Key Features

| | |
|--|--|
| 🎙️ | **Multi-platform voice** — switch ElevenLabs, Azure, OpenAI TTS, edge-tts **per call** |
| 🎬 | **Bring your own media** — mix AI visuals with your own clips and audio per scene |
| 🎚️ | **Broadcast-grade audio** — voice compression, sidechain ducking, EBU R128 −14 LUFS |
| 📱 | **Vertical Shorts** — silence-detecting boundary clustering + focal-point 9:16 crop |
| 🛡️ | **Hard quality gates** — resolution, codec, LUFS, black/frozen frames — broken output never ships |
| 🔁 | **Resume-safe pipeline** — content-addressed manifest; re-runs skip already-rendered scenes |
| 💰 | **Cost tracking** — NDJSON usage log with USD estimates per provider call |
| ☁️ | **Remote MCP** — one HTTPS URL, every IDE, ~80% fewer context tokens vs local stdio |

---

## HTML Renderer (motion graphics)

An alternative to FFmpeg zoompan for creator-quality motion graphics. Uses Playwright to render frame-accurate animations defined as pure functions of time — same approach as Remotion, no React runtime.

```bash
# Scaffold from an existing script JSON
node scripts/html-renderer/new-project.mjs --script output/<id>-script.json --out output/html-render/

# Preview (fast contact sheet)
node scripts/render.mjs sheet

# Full encode
node scripts/render.mjs full
```

See [`plugins/video-pipeline/skills/html-renderer/SKILL.md`](plugins/video-pipeline/skills/html-renderer/SKILL.md) for the full workflow and engine API.

---

## Deployment

### Local / VPS / Pi

```bash
git clone https://github.com/AMG555/FrameForge.git && cd FrameForge
cp docs/env.template .env   # edit with your keys
npm run mcp                  # MCP server on :3210
```

See [`docs/deployment.md`](docs/deployment.md) for VPS, Pi, Docker, and systemd setup.

### Cloudflare + any backend

Deploy the Cloudflare Worker proxy (see [`cloudflare-mcp/`](cloudflare-mcp/)) and point `WORKER_API_URL` at any machine running `npm run start:worker`.

### Render.com split-worker (optional)

Network-bound work (LLM, TTS, image APIs) runs on Render's free tier; FFmpeg jobs delegate to a local machine. See [`render.yaml`](render.yaml) and [`docs/deployment.md`](docs/deployment.md).

---

## CLI Reference

| Command | What it does |
|---------|--------------|
| `npm run doctor` | Pre-flight check — Node, FFmpeg, edge-tts, env vars |
| `npm run setup` | Interactive key wizard — writes `.env` |
| `npm run mcp` | HTTP MCP server on port 3210 |
| `npm run mcp:stdio` | stdio MCP server |
| `npm run make -- --topic "..."` | Full pipeline: research → render → deliver |
| `npm run start:worker` | Background queue worker |
| `npm run validate` | Deep structural validation (113 checks) |
| `npm test` | Unit test suite (475 tests) |

**`npm run make` flags:**

```bash
npm run make -- \
  --topic "How GPS works" \
  --style educational \        # educational | comedic | documentary | vlog | tutorial
  --format "short-form reel" \
  --language en \              # BCP-47 code
  --no-publish \               # render only, skip delivery
  --no-shorts                  # skip vertical crop
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

## Architecture

```
YOUR IDE (Bob / Codex / opencode / Cursor / Windsurf / Claude Code)
         │
         │  HTTPS + SSE  (Cloudflare Remote MCP)
         ▼
[Cloudflare Workers]   ← proxies tool calls, keeps IDE context lean
         │
         │  HTTP + INTERNAL_API_TOKEN
         ▼
[FrameForge Node]   ← runs on VPS / Pi / your machine / Render.com
         │
         ├─ src/mcp-server/    14 MCP tools (HTTP + stdio)
         ├─ src/workflows/     research → script → assets → render → publish
         ├─ src/pipeline/      state machine, retry, telemetry, manifest
         ├─ src/video-renderer/ FFmpeg scene render + concat
         ├─ src/audio-mixer/   LUFS normalise, sidechain ducking
         └─ src/quality-gate/  7-point output validation
```

---

## Testing

```bash
npm test          # 475 tests, 0 failures
npm run validate  # 113 structural checks
```

---

## Security

- **Timing-safe auth** — all token comparisons use `crypto.timingSafeEqual`
- **Body size limits** — all HTTP servers reject requests > 4 MB with HTTP 413
- **Path traversal guards** — `productionId` and `outputPath` validated before any file I/O
- **Credential redaction** — 14 regex patterns strip keys from all logs at the source
- **No secrets in code** — all keys via `.env`; `.gitignore` covers it

Report vulnerabilities: [SECURITY.md](SECURITY.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Quick checklist:

1. `npm run doctor` passes on your OS
2. `npm test` passes (475/475)
3. `npm run validate` passes (all checks)
4. FFmpeg commands keep `-nostdin` and cross-platform font paths
5. Commit messages: plain imperative sentences — no `feat:`/`fix:` prefixes

---

## License

MIT — see [LICENSE](LICENSE).
