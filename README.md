<div align="center">

# ⚡ FrameForge

### AI Video Production Engine for Any Agentic IDE

**Any IDE. Any topic. Any style. 1080p videos from a single prompt.**

[![npm](https://img.shields.io/npm/v/@amg555/frameforge-mcp.svg?label=npm)](https://www.npmjs.com/package/@amg555/frameforge-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](CHANGELOG.md)
[![MCP Spec](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/tests-512%20passing-brightgreen.svg)](#testing)

</div>

---

FrameForge is an MCP server your IDE agent calls to make videos. You (or your agent) write the scenes — FrameForge handles voice, images, FFmpeg compositing, and quality checking. Works in Bob, Cursor, Windsurf, Codex, opencode, Claude Code, and any MCP-capable IDE.

---

## Zero-install quickstart (npx)

No cloning. No `npm install`. FFmpeg and edge-tts run on your own machine.

```bash
# 1. Install prerequisites (one-time, system-level)
#    FFmpeg: https://ffmpeg.org/download.html  →  add bin/ to PATH
#    edge-tts: pip install edge-tts

# 2. Configure your API keys (one-time, saved to ~/.frameforge/config.json)
npx --package=@amg555/frameforge-mcp frameforge-setup

# 3. Check everything is ready
npx --package=@amg555/frameforge-mcp frameforge-doctor

# 4. Add to your IDE — then ask your agent to make a video
```

Add to your IDE's MCP config (works in Bob, Cursor, Windsurf, Codex, Claude Code, opencode):

```json
{
  "mcpServers": {
    "frameforge": {
      "command": "npx",
      "args": ["--package=@amg555/frameforge-mcp", "-y", "frameforge-mcp"]
    }
  }
}
```

That's it. Your agent now has 17 video production tools. FFmpeg and TTS run on your machine — no cloud render costs.

---

## Other connection methods

### Cloned repo (contributors / local dev)

```bash
git clone https://github.com/AMG555/FrameForge.git && cd FrameForge && npm run doctor && npm run setup
```

```json
{
  "mcpServers": {
    "frameforge": {
      "command": "node",
      "args": ["/absolute/path/to/FrameForge/src/mcp-server/stdio.js"]
    }
  }
}
```

### Remote URL (Cloudflare Workers — FFmpeg must run separately)

Deploy once to Cloudflare (free):

```bash
cd cloudflare-mcp && npm install
wrangler secret put WORKER_API_URL   # your FrameForge backend URL
wrangler secret put MCP_AUTH_TOKEN   # any random 32-char string
wrangler deploy
```

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

---

## Make your first video

**New to FrameForge?** Read [`START_HERE.md`](START_HERE.md) — it's a single file you paste into any IDE chat that starts a guided conversation: the agent asks what you want to make, produces a beat sheet for your approval, then drives the full pipeline.

Once connected, tell your IDE:

> *"Make a 60-second explainer video about how GPS works"*

Or call the tool directly:

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
      visual_description: "phone with pin on map, white background, minimal"
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

**No API keys required for this path.** `edge-tts` (voice) and `pollinations` (images) are both free with no account. If Pollinations is slow, add `FALAI_API_KEY` and set `PROVIDER_IMAGE=falai`.

---

## Two ways to use it

### Your IDE writes the script — no LLM key needed

Your IDE's model writes the scenes. FrameForge only runs FFmpeg, TTS, and image generation. Use `create_video_from_script`. This is the fastest path and what most people want.

### FrameForge researches and scripts itself

For batch runs or when running without an IDE. Requires a free LLM key (Groq or Gemini both have free tiers).

```bash
npm run make -- --topic "How does GPS actually work?"
```

---

## Bring your own media

Skip AI generation for any scene by supplying your own files:

```json
{
  "narration": "Here is the sorting algorithm running step by step.",
  "caption": "ALGORITHM",
  "video_path": "/recordings/screen_capture.mp4",
  "audio_path": "/recordings/my_voice.mp3"
}
```

Any combination of `image_path`, `video_path`, `audio_path` works — FrameForge only generates what you don't supply.

---

## Tools

17 tools, grouped by what you're doing:

**Make a video from your own script (no LLM key)**

| Tool | What it does |
|------|-------------|
| `create_video_from_script` | Full render from scenes you provide — voice, images, FFmpeg, quality gate |
| `ingest_media` | Import your own clips, images, and audio into a scenes manifest |
| `edit_scenes` | Update captions, swap media files, or append scenes to a manifest |
| `render_from_scenes` | Re-render from an existing manifest, skipping research and scripting |
| `assemble_video` | FFmpeg render + quality gate — produces the master MP4 |
| `render_tts` | Generate voice audio for one scene |
| `multi_voice_tts` | Override TTS provider per call without touching `.env` |
| `generate_scene_image` | Generate one scene image via the configured image provider |
| `publish_video` | Deliver the finished video via file copy or HTTP webhook |
| `external_platform_call` | HTTP bridge to ElevenLabs, Runway, Replicate, or any custom platform |

**Auto-research pipeline (needs a free LLM key)**

| Tool | What it does |
|------|-------------|
| `research_topic` | Research any topic and extract fact-checked claims |
| `write_script` | Generate a structured scene script from research claims |
| `queue_full_pipeline` | Queue a full research → render → publish run; returns `{ jobId }` immediately |
| `get_job_status` | Poll a queued job for `{ status, stage, result }` |

**Code-driven animated video (Playwright + FFmpeg)**

| Tool | What it does |
|------|-------------|
| `scaffold_animation_project` | Create a project where every frame is a pure function of time `t` |
| `validate_storyboard` | Check `STORYBOARD.md` against the 4-gate beat-sheet contract |
| `render_animation` | Run the Playwright renderer: sheet / strip / storyboard / crop / full |

---

## Providers

Switch any provider with one `.env` change — no code changes.

**Voice (TTS)**

| Provider | Free? | Key needed |
|----------|-------|------------|
| `edge-tts` | ✅ free, offline | none — **default** |
| `elevenlabs` | paid | `ELEVENLABS_API_KEY` |
| `azure` | paid | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` |
| `openai` | paid | `OPENAI_API_KEY` |
| `webhook` | — | `WEBHOOK_TTS_URL` |

Set `PROVIDER_TTS=<name>`.

**Images**

| Provider | Free? | Key needed |
|----------|-------|------------|
| `pollinations` | ✅ free, no account | none — **default** |
| `falai` | ✅ free tier | `FALAI_API_KEY` at fal.ai |
| `replicate` | paid | `REPLICATE_API_KEY` |
| `dalle` | paid | `OPENAI_API_KEY` |
| `webhook` | — | `WEBHOOK_IMAGE_URL` |

Set `PROVIDER_IMAGE=<name>`.

**LLM — only for the auto-research path**

> Skip entirely when using `create_video_from_script`.

| Provider | Free? | Key needed |
|----------|-------|------------|
| `groq` | ✅ free tier | `GROQ_API_KEY` at console.groq.com |
| `gemini` | ✅ free tier | `GEMINI_API_KEY` at aistudio.google.com |
| `ollama` | ✅ fully local | none — set `OLLAMA_MODEL` |
| `openrouter` | pay per use | `OPENROUTER_API_KEY` |
| `anthropic` | paid | `ANTHROPIC_API_KEY` |
| `openai` | paid | `OPENAI_API_KEY` |

Set `PROVIDER_LLM=<name>`.

---

## Quality gates

Every video passes 7 checks before delivery. Any failure blocks the output.

| Check | Requirement |
|-------|------------|
| Resolution | 1920×1080 landscape or 1080×1920 portrait |
| Video codec | H.264, high profile, yuv420p |
| Loudness | −14 LUFS ± 1.5 LU (broadcast standard) |
| True peak | ≤ −0.5 dBTP |
| Black frames | None longer than 0.5 s |
| Frozen frames | None longer than 0.5 s |
| File integrity | > 1 MB, valid video + audio streams |

---

## CLI commands

**Via npx (no clone needed):**

| Command | What it does |
|---------|-------------|
| `npx --package=@amg555/frameforge-mcp frameforge-setup` | Interactive key wizard — saves to `~/.frameforge/config.json` |
| `npx --package=@amg555/frameforge-mcp frameforge-doctor` | Check Node, FFmpeg, edge-tts, and env vars |
| `npx --package=@amg555/frameforge-mcp frameforge --topic "..."` | Full pipeline: research → render → deliver |

**Via cloned repo:**

| Command | What it does |
|---------|-------------|
| `npm run doctor` | Check Node, FFmpeg, edge-tts, and env vars |
| `npm run setup` | Interactive key wizard — writes `.env` |
| `npm run mcp` | Start MCP server on port 3210 |
| `npm run mcp:stdio` | stdio MCP server for direct IDE connection |
| `npm run make -- --topic "..."` | Full pipeline: research → render → deliver |
| `npm run validate` | Deep structural validation (113 checks) |
| `npm test` | Test suite (512 tests) |

---

## Architecture

```
YOUR IDE (Bob / Codex / opencode / Cursor / Windsurf / Claude Code)
         │
         │  HTTPS + SSE  (Cloudflare Remote MCP — optional)
         ▼
[Cloudflare Worker]     proxies tool calls, keeps IDE context lean
         │
         │  HTTP + INTERNAL_API_TOKEN
         ▼
[FrameForge Node]       runs on VPS / Pi / your machine / Render.com
         │
         ├─ src/mcp-server/     17 MCP tools
         ├─ src/workflows/      research → script → assets → render → publish
         ├─ src/pipeline/       state machine, retry, telemetry, manifest
         ├─ src/video-renderer/ FFmpeg scene render + concat
         ├─ src/audio-mixer/    LUFS normalise, sidechain ducking
         └─ src/quality-gate/   7-point output validation
```

---

## Security

- **Timing-safe auth** — all token comparisons use `crypto.timingSafeEqual`
- **SSRF protection** — webhook and pipeline URLs validated against RFC-1918 / loopback / link-local blocklist
- **Path traversal guards** — `productionId`, `audioPath`, `localPath` validated before any file I/O
- **CLI injection guards** — animation timestamps allowlisted before passing to `render.mjs`
- **Worker API auth** — `INTERNAL_API_TOKEN` Bearer check on all internal routes
- **Body size limits** — all HTTP servers reject requests > 4 MB with HTTP 413
- **Credential redaction** — 14+ regex patterns strip API keys from all logs

Report vulnerabilities: [SECURITY.md](SECURITY.md)

---

## Deployment

**npx (no install — recommended for users):**

```bash
npx --package=@amg555/frameforge-mcp frameforge-setup
# then add the IDE config from the quickstart above
```

**VPS / Pi / self-hosted (cloned repo):**

```bash
git clone https://github.com/AMG555/FrameForge.git && cd FrameForge
cp docs/env.template .env   # edit with your keys
npm run mcp
```

See [`docs/deployment.md`](docs/deployment.md) for Docker, systemd, and Render.com setup.

---

## Testing

```bash
npm test          # 512 tests, 0 failures
npm run validate  # 113 structural checks
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

1. `npm run doctor` passes on your OS
2. `npm test` passes (512/512)
3. `npm run validate` passes (113/113)
4. FFmpeg commands keep `-nostdin` and cross-platform font paths

---

## License

MIT — see [LICENSE](LICENSE).
