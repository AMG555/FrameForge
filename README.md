<div align="center">

# ⚡ FrameForge

### Autonomous AI Video Factory for Any Agentic IDE & Localhost
**Broadcast-quality 1080p documentary videos & vertical Shorts from a single prompt or IDE command.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP Spec](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)
[![Token Saver](https://img.shields.io/badge/Context%20Tokens--80%25-orange.svg)](#-cloudflare-remote-mcp--token-efficiency)
[![FFmpeg](https://img.shields.io/badge/Engine-FFmpeg%20Native-red.svg)](https://ffmpeg.org/)

[Quickstart](#-60-second-quickstart-localhost) • [Connect to IDE](#-connect-to-your-agentic-ide) • [Cloudflare Remote MCP](#-cloudflare-remote-mcp--token-efficiency) • [Custom Clips & Audio](#-bring-your-own-media) • [Architecture](#-architecture)

---

</div>

## 💡 What is FrameForge?

**FrameForge** is an open-source, autonomous video production pipeline designed for content creators, automated channels, and developer agents. 

Unlike toy AI video tools that generate 3-second silent clips or burn massive RAM with bloated browser renderers, FrameForge operates as a **full headless broadcast studio** powered by native C-level FFmpeg, professional audio mastering (`-14 LUFS`, dynamic ducking), and strict automated quality gates.

Give it a topic: it **researches**, **fact-checks**, **scripts 55 dynamic scenes**, **synthesizes voiceovers**, **animates visuals**, **mixes audio**, and **extracts viral 9:16 Shorts** — completely unattended.

---

## 🔥 Key Differentiators

* ⚡ **Localhost-First Simplicity**: Clone, run diagnostic doctor, and generate a video in 60 seconds. Zero mandatory cloud accounts.
* 🌐 **Cloudflare Remote MCP (~80% Token Reduction)**: Run the MCP gateway on Cloudflare Workers edge. Your IDE streams tool calls over HTTP/SSE instead of flooding prompt context with bulky stdio buffers.
* 🎬 **Bring Your Own Media**: Mix AI-generated visuals with your own video clips (B-roll, gameplay, screen recordings) and pre-recorded voiceovers.
* 🎚️ **Broadcast-Grade Audio Engine**: Voice compression, high/lowpass filtering, sidechain music ducking, and EBU R128 (`-14 LUFS ± 1.5`) normalization.
* 📱 **Automated Vertical Shorts Extraction**: Silence-detecting boundary clustering + focal-point-aware 9:16 vertical cropping with UI safe margins.
* 🛡️ **Hard Quality Gates**: Automated inspection blocks broken output (resolution, codec, LUFS, black frames, frozen frames).
* 🔌 **Any IDE Native**: Works out-of-the-box with **Cursor**, **Claude Code**, **Windsurf**, **Kiro**, **IBM Bob**, and **Antigravity**.

---

## 🚀 60-Second Quickstart (Localhost)

### 1. Clone & Pre-flight Diagnostics

```bash
git clone https://github.com/AMG555/FrameForge.git
cd FrameForge
npm install

# Run the environment doctor (verifies FFmpeg, voice engine, and system fonts)
npm run doctor
```

### 2. Configure Environment

Copy the secret template and add your preferred free API keys:

```bash
cp .kiro/config/production-secrets.env.template .env
```

```env
# Free LLM via Groq (or OpenAI / Ollama / WatsonX / Custom)
GROQ_API_KEY=gsk_...
PROVIDER_LLM=groq

# Free offline voice via Edge-TTS (or ElevenLabs / Azure / OpenAI / Custom)
PROVIDER_TTS=edge-tts

# Free visuals via Pollinations (or Fal.ai / Replicate / DALL-E / Custom)
PROVIDER_IMAGE=pollinations
```

### 3. Generate a Video from Terminal

```bash
npm run make -- --topic "Why Did Ancient Humans Start Cooking Food?"
```

Outputs are saved to `.frameforge-files/` (or your configured directory), complete with:
* `final_video.mp4` (1080p landscape master documentary)
* `short_1.mp4`, `short_2.mp4` (Auto-extracted 9:16 vertical Shorts)
* `video_meta.json` (Optimized YouTube title, description, tags, and chapter markers)

---

## 🤖 Connect to Your Agentic IDE

FrameForge supports both **Zero-Port Local Stdio** and **Cloudflare Remote MCP**.

### Option A: Local Stdio (Recommended for Local Dev)

Add to your project or global MCP configuration (`.mcp.json` or `~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "frameforge": {
      "command": "node",
      "args": ["/absolute/path/to/FrameForg/src/mcp-server/stdio.js"],
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

Now prompt your agent in Cursor or Claude Code:
> *"Produce a 60-second documentary reel about the mystery of the Antikythera mechanism."*

---

## ☁️ Cloudflare Remote MCP (~80% Token Efficiency)

Traditional local stdio MCP servers spawn child processes that dump raw stdout, tool descriptions, and bulky JSON schemas into your IDE's active prompt window on every cycle, ballooning token costs.

FrameForge includes a **Cloudflare Workers Remote MCP Proxy** (`cloudflare-mcp/`):

```
Agentic IDE (Cursor / Claude Code)
        │
        │ Streamable HTTP POST / SSE
        ▼
[Cloudflare Workers Edge MCP]  <-- Caches tool schemas, streams responses
        │
        │ HTTP / Webhook
        ▼
[FrameForge Render Node]       <-- Heavy FFmpeg rendering happens off-IDE
```

* **~60-80% fewer prompt tokens**: IDE downloads lightweight tool schemas once; streaming SSE avoids context bloat.
* **Zero local server overhead**: Works even on low-spec laptops by offloading rendering to a remote worker or VPS.
* **Free tier ready**: Deploys to Cloudflare Workers (100,000 requests/day free).

See [`cloudflare-mcp/README.md`](cloudflare-mcp/) for 2-minute deployment instructions.

---

## 🎨 Bring Your Own Media

FrameForge is not restricted to AI-generated images. You can supply your own video clips, custom voice recordings, or third-party APIs.

### 1. Using Your Own Video Clips (B-Roll / Gameplay)
In any scene JSON or script, pass `video_path`:

```json
{
  "scene_id": 1,
  "narration": "In the depths of space, ancient stars were forming the elements of life.",
  "video_path": "/path/to/my_space_footage.mp4",
  "caption": "COSMIC ORIGINS"
}
```
* FrameForge automatically loops or trims your clip to match the audio narration duration, crops/scales it to 1080p with lanczos interpolation, and renders dynamic captions.

### 2. Using Pre-Recorded Voiceover
Pass `audio_path` in any scene definition to completely bypass TTS:

```json
{
  "scene_id": 1,
  "audio_path": "/recordings/voiceover_scene1.wav",
  "visual_description": "Vast ocean waves at sunset [CAMP]"
}
```

### 3. Custom Webhooks & Self-Hosted APIs
Connect LocalAI, Kokoro, LM Studio, Ollama, or any private endpoint — no code changes needed.

```env
# OpenAI-compatible LLM (Ollama, LM Studio, etc.)
PROVIDER_LLM=ollama
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=llama3.3

# Any HTTP LLM via webhook
PROVIDER_LLM=webhook
WEBHOOK_LLM_URL=http://localhost:11434/v1/chat/completions
WEBHOOK_LLM_HEADERS={"Content-Type":"application/json"}
WEBHOOK_LLM_RESPONSE_PATH=choices.0.message.content

# Custom TTS / Voice API (Kokoro, Coqui, etc.)
PROVIDER_TTS=webhook
WEBHOOK_TTS_URL=http://localhost:8080/v1/audio/speech
WEBHOOK_TTS_HEADERS={"Authorization":"Bearer optional_token"}
WEBHOOK_TTS_BODY_TEMPLATE={"text":"{{text}}","voice":"{{voice}}"}
WEBHOOK_TTS_RESPONSE=binary

# Custom Image Generation (ComfyUI, Automatic1111, etc.)
PROVIDER_IMAGE=webhook
WEBHOOK_IMAGE_URL=http://localhost:7860/sdapi/v1/txt2img
WEBHOOK_IMAGE_HEADERS={}
WEBHOOK_IMAGE_BODY_TEMPLATE={"prompt":"{{prompt}}","width":{{width}},"height":{{height}}}
WEBHOOK_IMAGE_RESPONSE=json_url
WEBHOOK_IMAGE_RESPONSE_PATH=images.0
```

---

## 🏗️ Architecture

```
INPUT (Topic / Manual / Agent MCP Tool Call)
  │
  ├─► 1. Research Engine: Groq / WatsonX / OpenAI / Ollama
  │      └─ Extract verified claims, common myths & modern comparisons
  │
  ├─► 2. Scriptwriter: 55-scene structured schema
  │      └─ Punchy pacing, camera directions, focal points, hook scoring
  │
  ├─► 3. Media Ingest:
  │      ├─ AI Images (Pollinations / Fal.ai / Replicate / DALL-E)
  │      └─ User Clips (MP4 / WebM / MOV with Lanczos scaling)
  │
  ├─► 4. Voiceover Synthesis:
  │      ├─ Edge-TTS / ElevenLabs / Azure Speech / OpenAI
  │      └─ User Voice (Pre-recorded WAV / MP3 / M4A)
  │
  ├─► 5. Compositing & Animation:
  │      ├─ 10 Animation presets (Slow Zoom, Pan Left/Right, Ken Burns)
  │      └─ Dynamic drawtext subtitle rendering with safe margin calculation
  │
  ├─► 6. Audio Mixer:
  │      ├─ Highpass (80Hz) + Dynamic Voice Normalization
  │      ├─ Sidechain music ducking (auto-lowers music when speaking)
  │      └─ Broadcast EBU R128 loudness normalization (-14 LUFS ± 1.5)
  │
  ├─► 7. Quality Gate:
  │      └─ Hard gates: Resolution (1080p), Codec (H.264/yuv420p), 0 black frames
  │
  ├─► 8. Shorts Extractor:
  │      └─ Silence boundary detection + 9:16 focal-point crop for TikTok/Shorts
  │
  └─► 9. Dispatch:
         └─ Telegram instant delivery / Local packaging / Webhook notification
```

---

## 📊 Quality Gates (Broadcast Standards)

Every video generated by FrameForge must pass automated inspection before delivery:

| Gate | Requirement | Action on Failure |
| :--- | :--- | :--- |
| **Resolution** | Master: 1920×1080 \| Short: 1080×1920 | Blocks delivery |
| **Encoding** | H.264, profile high, level 4.1, yuv420p | Blocks delivery |
| **Integrated Loudness** | −14 LUFS ± 1.5 LU (YouTube standard) | Blocks delivery |
| **True Peak Audio** | ≤ −0.5 dBTP | Blocks delivery |
| **Black Frames** | None > 0.5s duration | Blocks delivery |
| **Frozen Frames** | None > 0.5s duration | Blocks delivery |
| **File Integrity** | > 1 MB, valid video & audio streams | Blocks delivery |

---

## 🛠️ CLI Reference

| Command | Description |
| :--- | :--- |
| `npm run doctor` | Run pre-flight environment diagnostics |
| `npm run make -- --topic "Topic"` | Run full autonomous video pipeline locally |
| `npm run mcp:stdio` | Start local Stdio MCP server (for Cursor/Claude Code) |
| `npm run mcp` | Start local HTTP MCP server on port 3210 |
| `npm run start:worker` | Start local background queue worker |
| `npm run check-credentials` | Run regex secret-leak audit on repository logs |

---

## 🤝 Contributing

Contributions are welcome! Please ensure:
1. All changes pass `npm run doctor`.
2. FFmpeg commands preserve `-nostdin` and cross-platform font resolution.
3. PRs maintain clean separation between CLI, worker, and MCP transport.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
