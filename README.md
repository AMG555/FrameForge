<div align="center">

# ⚡ FrameForge

### AI Video Production Engine for Any Agentic IDE
**Any IDE. Any topic. Any style. 1080p broadcast-quality videos from a single tool call.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP Spec](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)
[![Token Saver](https://img.shields.io/badge/Context%20Tokens--80%25-orange.svg)](#-cloudflare-remote-mcp--recommended)
[![FFmpeg](https://img.shields.io/badge/Engine-FFmpeg%20Native-red.svg)](https://ffmpeg.org/)

[Quickstart](#-60-second-quickstart) • [Connect IDE](#-connect-your-agentic-ide) • [Cloudflare Remote MCP](#-cloudflare-remote-mcp--recommended) • [Add Your Own Media](#-bring-your-own-media) • [All Tools](#-mcp-tools-reference) • [Architecture](#-architecture)

---

</div>

## 💡 What is FrameForge?

**FrameForge is a rendering execution engine controlled by your agentic IDE.**

Connect your IDE (Codex, opencode, Cursor, or any MCP-capable tool) via the Cloudflare Remote MCP endpoint. The IDE writes the video script — FrameForge handles TTS synthesis, AI image generation, FFmpeg compositing, audio mastering, and delivery.

No locked-in workflow. No hardcoded topics or styles. You describe what you want to make; the IDE structures it; FrameForge renders it.

---

## 🔥 Key Features

* ☁️ **Cloudflare Remote MCP (Recommended)**: One HTTPS URL works in every IDE, every device. ~80% fewer context tokens vs local stdio. Deploy once, use everywhere.
* 🤖 **Agent-First Path**: `create_video_from_script` — your IDE agent writes the scenes, FrameForge renders. Zero internal LLM needed. Works for any topic, any language, any style.
* 🎙️ **Multi-Platform Voice**: Switch between ElevenLabs, Azure, OpenAI TTS, and edge-tts per video — or per scene — without touching `.env`.
* 🎬 **Bring Your Own Media**: Mix AI visuals with your own clips, images, and pre-recorded voiceovers per scene.
* 🎚️ **Broadcast-Grade Audio**: Voice compression, sidechain music ducking, EBU R128 (`-14 LUFS ± 1.5`) normalization.
* 📱 **Vertical Shorts**: Silence-detecting boundary clustering + focal-point-aware 9:16 cropping for Reels/TikTok/Shorts.
* 🛡️ **Hard Quality Gates**: Resolution, codec, LUFS, black frames, frozen frames — broken output never ships.
* 🔌 **Universal IDE Support**: Codex, opencode, Cursor, Windsurf, IBM Bob, Claude Code, VS Code + Copilot, JetBrains AI, and any MCP-capable tool.

---

## 🚀 60-Second Quickstart

### 1. Clone & Pre-flight Check

```bash
git clone https://github.com/AMG555/FrameForge.git
cd FrameForge
npm install
npm run doctor
```

### 2. Configure Environment

Use the interactive wizard (recommended):

```bash
npm run setup
```

Or copy the template and edit manually:

```bash
cp docs/env.template .env
```

Minimum config:

```env
# Free LLM (Groq free tier — no credit card)
GROQ_API_KEY=gsk_...
PROVIDER_LLM=groq

# Free offline voice (no account needed)
PROVIDER_TTS=edge-tts

# Free images (no account needed)
PROVIDER_IMAGE=pollinations
```

### 3. Generate a Video

```bash
npm run make -- --topic "How does GPS actually work?"
```

Outputs saved to `.frameforge-files/`:
* `final_video.mp4` — 1080p landscape master
* `short_1.mp4`, `short_2.mp4` — auto-extracted 9:16 vertical Shorts
* `video_meta.json` — title, description, tags, chapter markers

---

## 🤖 Connect Your Agentic IDE

### ☁️ Cloudflare Remote MCP (Recommended)

The primary connection method. One URL works in every IDE — no local server process, no port forwarding, ~80% fewer context tokens.

**Deploy once:**

```bash
cd cloudflare-mcp
npm install
wrangler secret put WORKER_API_URL     # https://your-render-app.onrender.com
wrangler secret put MCP_AUTH_TOKEN     # 32-byte hex — your IDE auth
wrangler secret put INTERNAL_API_TOKEN # 32-byte hex — worker↔render auth
wrangler deploy
```

**Add to any IDE's MCP config:**

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

That's it. The same config block works in Codex, opencode, Cursor, Windsurf, IBM Bob, Claude Code, and any other MCP-capable IDE. See [`cloudflare-mcp/`](cloudflare-mcp/) for the full 2-minute deployment guide.

---

### 💻 Local Stdio (Alternative — No Cloudflare Account)

If you prefer local-only with no Cloudflare setup:

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

## ☁️ Cloudflare Remote MCP — Recommended

Traditional stdio MCP spawns a local process that floods your IDE's active context with tool schemas and JSON buffers on every cycle. With enough tools and large schemas, this becomes significant overhead.

FrameForge's Cloudflare Workers proxy solves this:

```
Your IDE (Codex / opencode / Cursor / Windsurf / IBM Bob / Claude Code / any MCP tool)
         │
         │  HTTPS POST + SSE streaming
         ▼
[Cloudflare Workers Edge]  ← Caches tool schemas, streams responses
         │
         │  HTTP  (internal token)
         ▼
[FrameForge Render Node]   ← FFmpeg rendering, TTS, image gen
         │
         ▼
[Your Machine / VPS / Pi]  ← Final output files
```

* **~60–80% fewer context tokens** per tool call — schemas cached, binary results stay server-side
* **Zero local server required** — works on any device, any network
* **Free tier** — Cloudflare Workers: 100,000 requests/day free

---

## 🎬 Using FrameForge from Your IDE

Once connected via MCP, your IDE agent can produce videos by calling tools directly.

### Agent-First Path (Recommended)

Your IDE writes the script. FrameForge renders it. No internal LLM needed inside FrameForge.

```
Agent prompt: "Make a 3-scene explainer about how WiFi works, flat design style"

Agent calls: create_video_from_script({
  scenes: [
    { narration: "WiFi sends data as radio waves...", caption: "RADIO WAVES", visual_description: "router emitting waves, flat illustration" },
    { narration: "Your device picks up the signal...", caption: "YOUR DEVICE", visual_description: "laptop receiving signal" },
    { narration: "Data travels at 2.4 or 5 gigahertz...", caption: "FREQUENCY BANDS", visual_description: "frequency spectrum diagram" }
  ],
  imageStyle: "flat design, white background, bold colors"
})

FrameForge: generates TTS + images → renders → returns masterPath
```

### Auto-Research Path

Let FrameForge handle research and scripting too:

```
1. research_topic({ topic: "...", style: "educational", format: "YouTube short" })
2. write_script({ ...claims, persona: "tech reviewer", language: "en", targetDuration: 60 })
3. render_from_scenes({ productionId, skipImages: false })
```

### Add Your Own Media

Per-scene: pass `image_path`, `video_path`, or `audio_path` to skip AI generation for that scene.

---

## 🎙️ Bring Your Own Media

FrameForge works with your own files at the scene level.

### Your Own Video Clips (B-roll, gameplay, screen recordings)

```json
{
  "narration": "Here is how the sorting algorithm works step by step.",
  "caption": "ALGORITHM",
  "video_path": "/path/to/screen_recording.mp4"
}
```

FrameForge loops or trims your clip to match narration duration, scales to 1080p with Lanczos, and renders captions on top.

### Your Own Voice Recording

```json
{
  "narration": "This text is shown as caption but your audio file is used",
  "audio_path": "/recordings/my_voice_scene3.mp3"
}
```

### Your Own Images

```json
{
  "narration": "The temperature has risen 1.2 degrees since 1880.",
  "image_path": "/photos/climate_chart.png"
}
```

### Voice Cloning (ElevenLabs per-call)

Use `multi_voice_tts` to call ElevenLabs with your cloned voice ID for a specific scene, without changing your global TTS config:

```
multi_voice_tts({
  text: "Your narration text",
  outputPath: "/path/to/output.m4a",
  platform: "elevenlabs",
  voice: "your_cloned_voice_id",
  apiKey: "sk_..."
})
```

---

## 🛠️ MCP Tools Reference

| # | Tool | What it does |
|---|------|-------------|
| 1 | `research_topic` | Research any topic, extract + fact-check claims. Pass `persona`, `style`, `format`, `audience`. |
| 2 | `write_script` | Generate a video script from claims. Any style, language, scene count, or visual aesthetic. |
| 3 | `generate_scene_image` | Generate one scene image. Pass `imageStyle` for full aesthetic control. |
| 4 | `render_tts` | Synthesize narration audio using the configured TTS provider. |
| 5 | `assemble_video` | FFmpeg render + quality gate → master MP4. |
| 6 | `publish_video` | Deliver to Telegram / YouTube. |
| 7 | `ingest_media` | Import your own clips/images/audio into a scenes manifest. |
| 8 | `edit_scenes` | Read and patch an existing scenes manifest. |
| 9 | `render_from_scenes` | Render from a scenes manifest — skips research and scripting. |
| 10 | `external_platform_call` | Bridge to VoxForge, Runway, ElevenLabs, or any external platform via HTTP. |
| 11 | `create_video_from_script` | **Agent-first path.** Your IDE writes scenes, FrameForge renders. Zero internal LLM. |
| 12 | `multi_voice_tts` | Call any voice platform per-request (ElevenLabs/Azure/OpenAI/edge-tts/webhook) without changing `.env`. |
| 13 | `n8n_webhook_trigger` | Trigger an n8n workflow for a full async pipeline run. |

---

## 🏗️ Architecture

```
INPUT
  IDE agent tool call (create_video_from_script)
  CLI (npm run make -- --topic "...")
  Research → Script → Assets path
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  PIPELINE                                           │
│                                                     │
│  research.js    → Any topic, any persona, any style │
│  script.js      → Generic scene schema v2.0.0       │
│  assets.js      → Image gen + TTS (parallel batch)  │
│    ├─ video_path → use your clip (skip AI)          │
│    ├─ image_path → use your image (skip AI)         │
│    └─ audio_path → use your audio (skip TTS)        │
│  render.js      → FFmpeg zoompan + captions         │
│  shorts.js      → Silence segmentation + 9:16 crop  │
│  packaging.js   → Manifest + metadata               │
│  publishing.js  → Telegram + YouTube                │
└─────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  PROVIDERS (providers.js) — switch via .env         │
│                                                     │
│  LLM: groq | cerebras | openrouter | anthropic      │
│       gemini | mistral | together | openai          │
│       ollama | webhook                              │
│                                                     │
│  TTS: edge-tts | elevenlabs | azure | openai        │
│       webhook                                       │
│                                                     │
│  Image: pollinations | falai | replicate | dalle    │
│         webhook                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Quality Gates

Every video must pass automated inspection before delivery:

| Gate | Requirement | On Failure |
|------|------------|-----------|
| **Resolution** | 1920×1080 (landscape) / 1080×1920 (short) | Blocked |
| **Encoding** | H.264, high profile, level 4.1, yuv420p | Blocked |
| **Integrated Loudness** | −14 LUFS ± 1.5 LU | Blocked |
| **True Peak** | ≤ −0.5 dBTP | Blocked |
| **Black Frames** | None > 0.5s | Blocked |
| **Frozen Frames** | None > 0.5s | Blocked |
| **File Integrity** | > 1 MB, valid video + audio streams | Blocked |

---

## 🛠️ CLI Reference

| Command | Description |
|---------|-------------|
| `npm run doctor` | Pre-flight environment check |
| `npm run setup` | Interactive provider key wizard |
| `npm run make -- --topic "..."` | Standalone full pipeline |
| `npm run mcp:stdio` | Local stdio MCP server |
| `npm run mcp` | Local HTTP MCP server (port 3210) |
| `npm run start:worker` | Background queue worker |

---

## 🤝 Contributing

Contributions welcome. Please ensure:
1. `npm run doctor` passes on Windows, macOS, and Linux.
2. FFmpeg commands preserve `-nostdin` and cross-platform font resolution.
3. PRs maintain clean separation between CLI, worker, and MCP transport.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
