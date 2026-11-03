# FrameForge User Guide

Practical walk-throughs for every common task. Start with [Setup](#1-setup) if you are new, or jump directly to the scenario you need.

---

## Contents

1. [Setup](#1-setup)
2. [Make your first video](#2-make-your-first-video)
3. [Use FrameForge from your IDE](#3-use-frameforge-from-your-ide)
4. [Write scenes manually (agent-first path)](#4-write-scenes-manually-agent-first-path)
5. [Use your own footage, images, or voice](#5-use-your-own-footage-images-or-voice)
6. [Change the TTS voice or provider](#6-change-the-tts-voice-or-provider)
7. [Change the image style](#7-change-the-image-style)
8. [Resume a failed or interrupted job](#8-resume-a-failed-or-interrupted-job)
9. [Queue a job and poll for completion](#9-queue-a-job-and-poll-for-completion)
10. [Make vertical Shorts](#10-make-vertical-shorts)
11. [Deliver via webhook instead of file copy](#11-deliver-via-webhook-instead-of-file-copy)
12. [Deploy to Render free tier + local render](#12-deploy-to-render-free-tier--local-render)
13. [Run fully locally (no cloud)](#13-run-fully-locally-no-cloud)
14. [Troubleshoot common errors](#14-troubleshoot-common-errors)

---

## 1. Setup

### Which path are you on?

FrameForge has two distinct usage paths. Pick one before setting up your `.env`:

| Path | How it works | LLM key needed? |
|------|--------------|-----------------|
| **Agent-first (Path 1)** | Your IDE agent writes the scenes; FrameForge renders them. Tools: `create_video_from_script`, `render_from_scenes`, `ingest_media`, etc. | ❌ No — TTS + image only |
| **Auto-research (Path 2)** | FrameForge researches a topic, writes the script, and renders autonomously. Tools: `research_topic`, `write_script`, `queue_full_pipeline`. | ✅ Yes |

Most IDE users are on **Path 1** and need no LLM API key.

### Prerequisites

| Dependency | Check | Install |
|------------|-------|---------|
| Node.js ≥ 18 | `node --version` | [nodejs.org](https://nodejs.org) |
| FFmpeg ≥ 5 | `ffmpeg -version` | `brew install ffmpeg` / `apt install ffmpeg` |
| edge-tts | `edge-tts --version` | `pip install edge-tts` |

### Install

```bash
git clone https://github.com/AMG555/FrameForge.git
cd FrameForge
npm run doctor      # pre-flight check — lists exactly what's missing
npm run setup       # interactive wizard — writes your .env (~2 min)
```

### Minimum .env — Path 1 (agent-first, no LLM key)

```env
PROVIDER_TTS=edge-tts        # free offline TTS — no account needed
PROVIDER_IMAGE=pollinations  # free image gen — no account needed
```

### Minimum .env — Path 2 (auto-research, LLM key required)

```env
PROVIDER_LLM=groq
GROQ_API_KEY=gsk_...         # free — console.groq.com
PROVIDER_TTS=edge-tts
PROVIDER_IMAGE=pollinations
```

Other free LLM options: `PROVIDER_LLM=gemini` + `GEMINI_API_KEY`, or `PROVIDER_LLM=ollama` (fully local, no key).

### Verify

```bash
npm run doctor   # all items should show ✔
```

---

## 2. Make your first video

```bash
npm run make -- --topic "How does GPS actually work?"
```

Output in `.frameforge-files/` (or `N8N_FILES_DIR` if set):

```
final_video_<id>.mp4    1080p landscape master
short_1_<id>.mp4        auto-extracted 9:16 vertical Short
video_meta.json         title, description, tags, chapter markers
usage.ndjson            per-call cost log (USD estimates per API call)
```

### Common flags

```bash
npm run make -- \
  --topic "The history of the internet" \
  --style documentary \         # educational | comedic | documentary | vlog | tutorial
  --format "YouTube video" \    # YouTube video | YouTube short | Instagram reel | explainer
  --language fr \               # BCP-47 code (en, fr, es, de, ja, …)
  --no-shorts \                 # skip the 9:16 vertical crop step
  --no-publish \                # render only — skip file delivery
  --channels file,webhook       # deliver via file copy AND webhook
```

---

## 3. Use FrameForge from your IDE

FrameForge exposes 14 MCP tools. Connect your IDE once, then call tools naturally in conversation.

### Cloudflare Remote MCP (recommended — works with every IDE)

**Deploy once:**

```bash
cd cloudflare-mcp
npm install
wrangler secret put WORKER_API_URL      # https://your-app.onrender.com
wrangler secret put MCP_AUTH_TOKEN      # any random 32-byte hex
wrangler secret put INTERNAL_API_TOKEN  # different 32-byte hex
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

This same block works in IBM Bob, Codex, opencode, Cursor, Windsurf, Claude Code, and any MCP-capable tool.

### Local stdio (no cloud account needed)

**Path 1 — agent-first (no LLM key needed):**

```json
{
  "mcpServers": {
    "frameforge": {
      "command": "node",
      "args": ["/absolute/path/to/FrameForge/src/mcp-server/stdio.js"],
      "env": {
        "PROVIDER_TTS": "edge-tts",
        "PROVIDER_IMAGE": "pollinations"
      }
    }
  }
}
```

**Path 2 — add these if you use `research_topic`, `write_script`, or `queue_full_pipeline`:**

```json
{
  "env": {
    "PROVIDER_TTS": "edge-tts",
    "PROVIDER_IMAGE": "pollinations",
    "PROVIDER_LLM": "groq",
    "GROQ_API_KEY": "gsk_..."
  }
}
```

---

## 4. Write scenes manually (agent-first path)

The primary path for IDE agents. **You write the scenes. FrameForge renders them.** No internal LLM, no research stage — runs faster and costs nothing in LLM tokens.

```
create_video_from_script({
  scenes: [
    {
      narration: "WiFi sends data as invisible radio waves at 2.4 or 5 GHz.",
      caption: "RADIO WAVES",
      visual_description: "router emitting concentric circular waves, flat design, bold primary colors"
    },
    {
      narration: "Your device picks up the signal and decodes the packets in milliseconds.",
      caption: "YOUR DEVICE",
      visual_description: "laptop with signal bars, white background, minimal illustration"
    },
    {
      narration: "The router connects to the internet via a physical cable — the last physical hop.",
      caption: "THE CABLE",
      visual_description: "ethernet cable plugging into a modem, photorealistic closeup"
    }
  ],
  imageStyle: "flat design, white background, bold primary colors",
  withMusic: true
})
```

Returns: `{ masterPath, passed, sceneCount, sizeBytes }`

### Scene fields

| Field | Required | Description |
|-------|----------|-------------|
| `narration` | ✅ | Text spoken aloud. Drives TTS and pacing. |
| `caption` | — | Overlay text burned into the video (max 40 chars, auto-uppercased). |
| `visual_description` | ✅ (or supply `image_path`/`video_path`) | Used as the AI image prompt. |
| `camera_hint` | — | `zoom_in` `zoom_out` `pan_left` `pan_right` `tilt_up` `tilt_down` `ken_burns` `static` `auto` |
| `music_mood` | — | `tense` `calm` `energetic` `mysterious` `neutral` `dramatic` `humorous` |
| `image_path` | — | Supply your own image — skips AI generation for this scene. |
| `video_path` | — | Supply your own clip — skips image generation for this scene. |
| `audio_path` | — | Supply your own voice — skips TTS for this scene. |

---

## 5. Use your own footage, images, or voice

Any combination of `image_path`, `video_path`, `audio_path` works per scene. FrameForge generates only what you don't supply.

### All your own media (render-only)

```
create_video_from_script({
  scenes: [
    {
      narration: "Introduction.",
      image_path: "/recordings/slide1.jpg",
      audio_path: "/recordings/voice1.mp3"
    },
    {
      narration: "The algorithm in action.",
      video_path: "/recordings/screen_capture.mp4",
      audio_path: "/recordings/voice2.mp3"
    }
  ],
  skipImages: true,
  skipTts: true
})
```

### Mix AI + your own

```
{
  narration: "Here is the product in use.",
  visual_description: "clean white studio background",   ← AI generates the background
  video_path: "/recordings/product_demo.mp4"             ← your clip plays over it
}
```

### Ingest a media folder first

```
ingest_media({ directory: "/recordings/my-project/" })
→ { productionId, scenes[] }   ← pre-filled scene manifest

edit_scenes({ productionId, patches: [{ index: 0, narration: "Updated narration." }] })

render_from_scenes({ productionId, skipImages: true, skipTts: false })
```

---

## 6. Change the TTS voice or provider

### Per-call override (no .env change)

```
multi_voice_tts({
  text: "This is a test of the ElevenLabs voice.",
  voice: "Rachel",
  platform: "elevenlabs",
  productionId: "test_001",
  sceneIndex: 0
})
```

Supported `platform` values: `edge-tts` · `elevenlabs` · `azure` · `openai` · `webhook`

### Default for all videos

Set in `.env`:

```env
PROVIDER_TTS=elevenlabs
ELEVENLABS_API_KEY=sk_...
TTS_VOICE=Rachel            # optional — provider default used if omitted
TTS_RATE=-5%                # speech rate for edge-tts (default -5%)
```

### Available edge-tts voices

```bash
edge-tts --list-voices
```

Common English voices: `en-US-GuyNeural` (male) · `en-US-JennyNeural` (female) · `en-GB-RyanNeural` · `en-AU-NatashaNeural`

---

## 7. Change the image style

### Per-video

```
create_video_from_script({
  scenes: [...],
  imageStyle: "photorealistic, cinematic lighting, 4K"
})
```

### Per-scene

Override `visual_description` to include style inline:

```json
{
  "narration": "A breakthrough in quantum computing.",
  "visual_description": "quantum computer chip, photorealistic closeup, blue glow, dark background"
}
```

### Default for all videos

```env
# No env var for imageStyle — pass it as a tool parameter or CLI flag
npm run make -- --topic "..." --image-style "watercolour, soft pastels"
```

Style examples that work well:
- `flat design, white background, bold primary colors` (default)
- `photorealistic, cinematic, dramatic lighting`
- `anime illustration, vibrant colors, clean lines`
- `watercolour sketch, pastel tones, hand-drawn feel`
- `minimalist, black and white line art`
- `retro 80s synthwave, neon purple and cyan`

---

## 8. Resume a failed or interrupted job

FrameForge uses a content-addressed artifact manifest. If a run fails partway through, re-running with the same `productionId` and identical narration text automatically skips already-completed scenes.

### From the CLI

```bash
# Re-run with the same topic — FrameForge detects the existing productionId
# and resumes from where it stopped
npm run make -- --topic "How GPS works"
```

### From the MCP tools

```
# If you have the productionId:
render_from_scenes({
  productionId: "prod_abc123",
  skipImages: false,   # set true if images already exist
  skipTts: false       # set true if TTS already exists
})
```

### What gets skipped

Any scene whose image + voice files already exist on disk is skipped automatically — even across separate runs. Only failed or missing scenes are re-generated.

---

## 9. Queue a job and poll for completion

Use `queue_full_pipeline` when you want the pipeline to run in the background while your IDE does other things.

```
# Step 1 — queue
queue_full_pipeline({
  topic: "The history of the internet",
  style: "documentary",
  format: "YouTube video",
  language: "en"
})
→ { jobId: "job_xyz789", status: "QUEUED" }

# Step 2 — poll every 30 seconds until SUCCEEDED
get_job_status({ jobId: "job_xyz789" })
→ { status: "RUNNING", stage: "Assets" }

get_job_status({ jobId: "job_xyz789" })
→ { status: "SUCCEEDED", result: { masterPath: "...", sceneCount: 8 } }
```

Possible `status` values: `QUEUED` · `RUNNING` · `SUCCEEDED` · `FAILED`

If `status` is `FAILED`, `result.error` contains the error message and the last completed `stage`.

---

## 10. Make vertical Shorts

Shorts are extracted automatically from every video. A silence-detection algorithm finds natural cut points, and a focal-point-aware crop reframes the 1920×1080 master to 1080×1920 without cutting off faces or on-screen text.

### From the CLI

```bash
npm run make -- --topic "..."
# short_1_<id>.mp4, short_2_<id>.mp4 … appear alongside the master
```

### Skip Shorts

```bash
npm run make -- --topic "..." --no-shorts
```

### Control focal point per scene

Set `focal_point.x` and `focal_point.y` (0.0 = left/top, 1.0 = right/bottom) in each scene to tell the extractor where the important content is:

```json
{
  "narration": "The red button is on the right side of the panel.",
  "visual_description": "control panel with large red button on right",
  "focal_point": { "x": 0.8, "y": 0.5 }
}
```

---

## 11. Deliver via webhook instead of file copy

Set `PUBLISH_WEBHOOK_URL` in `.env`:

```env
PUBLISH_WEBHOOK_URL=https://your-server.com/frameforge-webhook
```

FrameForge will POST a JSON summary to this URL after every successful render:

```json
{
  "productionId": "prod_abc123",
  "masterPath": "/files/final_video_abc123.mp4",
  "shorts": ["/files/short_1_abc123.mp4"],
  "title": "How GPS Works",
  "tags": ["gps", "technology", "explainer"],
  "qcPassed": true,
  "totalWords": 412
}
```

Use `--channels webhook` to send only to the webhook (skip file copy), or `--channels file,webhook` for both.

---

## 12. Deploy to Render free tier + local render

This is the recommended production setup: lightweight network-bound work (LLM, TTS, image APIs) runs on the Render free tier (512 MB RAM), and FFmpeg rendering is delegated to your local machine, Pi, or VPS.

### Step 1 — Deploy the API worker to Render

1. Fork the repo and connect it to Render.
2. Use [`render.yaml`](../render.yaml) — it configures the `start:worker:render` command automatically.
3. Set these environment variables in Render's dashboard:

```env
PROVIDER_TTS=edge-tts
PROVIDER_IMAGE=pollinations
INTERNAL_API_TOKEN=<random 32-byte hex>
RENDER_MODE=api_only
# Only needed if you use research_topic / write_script / queue_full_pipeline:
# PROVIDER_LLM=groq
# GROQ_API_KEY=gsk_...
```

### Step 2 — Run the local render worker

On your machine (or Pi, or VPS with FFmpeg):

```bash
LOCAL_RENDER_URL=       # leave empty — this IS the local render worker
INTERNAL_API_TOKEN=<same token as Render>
WORKER_PORT=3211
RENDER_MODE=full

npm run start:local-render
```

### Step 3 — Point Render at your local worker

Set `LOCAL_RENDER_URL` in Render's environment:

```env
LOCAL_RENDER_URL=http://YOUR_LOCAL_IP:3211
# or via Tailscale: https://yourpi.tailnet.ts.net:3211
```

### Step 4 — Deploy the Cloudflare MCP proxy

```bash
cd cloudflare-mcp
wrangler secret put WORKER_API_URL      # https://your-app.onrender.com
wrangler secret put MCP_AUTH_TOKEN
wrangler secret put INTERNAL_API_TOKEN
wrangler deploy
```

See [`docs/deployment.md`](deployment.md) for the full step-by-step including Tailscale, PostgreSQL state, and credential rotation.

---

## 13. Run fully locally (no cloud)

Everything runs on your machine. No Render, no Cloudflare, no external accounts beyond a free API key.

```bash
# Terminal 1 — MCP server
npm start          # HTTP MCP on port 3210

# Terminal 2 — (optional) background queue worker
npm run start:worker   # worker on port 3211

# Or: stdio MCP — no ports, direct IDE integration
npm run mcp:stdio
```

Minimum free `.env` — **Path 1 (agent-first, no LLM key):**

```env
PROVIDER_TTS=edge-tts
PROVIDER_IMAGE=pollinations
N8N_FILES_DIR=./output    # where videos are saved
```

Add these only if you use `research_topic`, `write_script`, or `queue_full_pipeline` (**Path 2**):

```env
PROVIDER_LLM=groq
GROQ_API_KEY=gsk_...      # free — console.groq.com
# Alternatives: PROVIDER_LLM=gemini + GEMINI_API_KEY, or PROVIDER_LLM=ollama (no key)
```

---

## 14. Troubleshoot common errors

### `Too few scenes assembled: 0`

The renderer found no `scene_N_out.mp4` files in `video_tmp/`. Usually means the render step was skipped or all scenes failed. Check `usage.ndjson` for error entries and re-run — the manifest will skip completed scenes.

### `Concat failed: ...`

FFmpeg is missing or outdated. Run `ffmpeg -version` — need ≥ 5.0. On macOS: `brew upgrade ffmpeg`.

### `LLM provider error: 401`

API key is wrong or expired. Run `npm run setup` to re-enter it, or set the key directly in `.env`.

### `TTS synthesis failed`

- `edge-tts`: run `pip install --upgrade edge-tts` — the voice list changes periodically.
- `elevenlabs`: check `ELEVENLABS_API_KEY` and your monthly character quota.
- `azure`: check `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`.

### `Quality gate failed: LUFS out of range`

The audio is too quiet or too loud. Usually a TTS voice with an unusual level. Try a different voice (`TTS_VOICE=en-US-GuyNeural`), or disable the LUFS gate temporarily by setting `SKIP_LUFS_GATE=1` (not recommended for production).

### `LLM Provider: no API key found` in doctor

This warning only matters if you use the auto-research tools (`research_topic`, `write_script`, `queue_full_pipeline`). For the agent-first path (`create_video_from_script`), ignore it.

If you do need it, run `npm run setup` to add the key, or set it manually in `.env`:

```env
PROVIDER_LLM=groq
GROQ_API_KEY=gsk_...
```

Free LLM options: Groq (`GROQ_API_KEY`), Gemini (`GEMINI_API_KEY`), Cerebras (`CEREBRAS_API_KEY`), or `PROVIDER_LLM=ollama` (fully local, no key).

### `Cannot write to working dir`

The `N8N_FILES_DIR` path doesn't exist or isn't writable. Create it:

```bash
mkdir -p ~/.frameforge-files
N8N_FILES_DIR=~/.frameforge-files npm run make -- --topic "test"
```

### Video renders but quality gate fails on a specific check

Run `ffprobe` on the output to inspect:

```bash
ffprobe -v quiet -print_format json -show_streams final_video_<id>.mp4
```

Common fixes:
- **Resolution wrong**: check that all `image_path` files are 1920×1080 or let FrameForge generate images.
- **No audio stream**: ensure every scene has either `audio_path` or a working TTS provider.
- **Black frames**: a scene with a missing or corrupt image file renders as black — check image generation logs.

---

## Quick reference

| Goal | Command / Tool |
|------|----------------|
| Pre-flight check | `npm run doctor` |
| Setup keys | `npm run setup` |
| Make a video (CLI) | `npm run make -- --topic "..."` |
| Make a video (IDE) | `create_video_from_script({ scenes: [...] })` |
| Full pipeline (IDE) | `research_topic` → `write_script` → `render_from_scenes` |
| Queue + poll | `queue_full_pipeline` → `get_job_status` |
| Change TTS voice | `multi_voice_tts({ platform, voice, ... })` |
| Resume a job | Re-run with same `productionId` |
| Check env template | `docs/env.template` |
| Deployment guide | `docs/deployment.md` |
| HTML renderer guide | `plugins/video-pipeline/skills/html-renderer/SKILL.md` |
