---
name: video-pipeline
description: >
  Autonomous AI video production pipeline. Given a topic, this skill
  researches, fact-checks, writes the script, synthesises voice, renders
  with FFmpeg, runs quality gates, and saves the output locally or POSTs
  to any webhook — all without human intervention.
  Works in IBM Bob, Codex, opencode, Cursor, Windsurf, Claude Code,
  or any IDE that loads skills from ~/.claude/skills/ or .claude/skills/.
  Trigger phrases: "make a video about", "produce a reel on", "overnight
  batch", "queue videos", "generate video", "run the pipeline", "publish
  video". Also activates when a user pastes a topic list and says
  "make these" or "do the batch".
---

# Video Pipeline Skill

End-to-end autonomous video production. The AI proposes every creative
decision; deterministic systems (FFmpeg, TTS, image gen, MCP) execute them;
a quality gate blocks bad output before delivery.

## Architecture

```
IDE Agent (IBM Bob / Codex / opencode / Cursor / Windsurf / Claude Code)
    │
    ▼  Cloudflare Remote MCP (recommended) ─────────────────────────────
    │  https://video-mcp.YOUR_SUBDOMAIN.workers.dev/mcp
    │  17 tools: create_video_from_script · render_from_scenes
    │            ingest_media · edit_scenes · render_tts · multi_voice_tts
    │            generate_scene_image · assemble_video · publish_video
    │            research_topic · write_script · external_platform_call
    │            queue_full_pipeline · get_job_status
    │            scaffold_animation_project · validate_storyboard · render_animation
    │
    ▼  OR — Local stdio / HTTP MCP ────────────────────────────────────
    │  node src/mcp-server/stdio.js   (stdio)
    │  node src/mcp-server/server.js  (HTTP :3210)
    │
    ▼  Execution layer
    │  LLM provider:   PROVIDER_LLM=groq|openrouter|anthropic|gemini
    │                              |mistral|together|cerebras|openai
    │                              |ollama|webhook
    │  TTS provider:   PROVIDER_TTS=edge-tts|elevenlabs|azure|openai|webhook
    │  Image provider: PROVIDER_IMAGE=pollinations|falai|replicate|dalle|webhook
    │
    ▼  Optional: queue_full_pipeline
       queue_full_pipeline MCP tool → POST job to worker API (WORKER_API_URL)
```

All secrets come from environment variables — **never** hardcoded.
See `docs/env.template` for the full reference.

---

## Setup

### Option A — Cloudflare Remote MCP (Recommended)

Deploy once; works in every IDE with no local server process:

```bash
cd cloudflare-mcp
npm install
wrangler secret put WORKER_API_URL     # https://your-render-app.onrender.com
wrangler secret put MCP_AUTH_TOKEN     # random 32-byte hex
wrangler secret put INTERNAL_API_TOKEN # shared secret with render node
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

### Option B — Local stdio MCP

**IBM Bob** (`~/.bob/mcp.json`):
```json
{
  "mcpServers": {
    "frameforge": {
      "command": "node",
      "args": ["<absolute-path>/src/mcp-server/stdio.js"],
      "env": { "PROVIDER_LLM": "groq", "GROQ_API_KEY": "gsk_..." }
    }
  }
}
```

**Codex / opencode / Cursor / Windsurf / Claude Code** (`~/.claude/mcp.json` or `.mcp.json`):
```json
{
  "mcpServers": {
    "frameforge": {
      "command": "node",
      "args": ["<absolute-path>/src/mcp-server/stdio.js"],
      "env": { "PROVIDER_LLM": "groq", "GROQ_API_KEY": "${GROQ_API_KEY}" }
    }
  }
}
```

### 2. Set environment variables

Copy `docs/env.template` → `.env` and fill in. Minimum:

```bash
# LLM (pick one — Groq is free with no credit card)
PROVIDER_LLM=groq
GROQ_API_KEY=gsk_...

# TTS (edge-tts is free offline)
PROVIDER_TTS=edge-tts

# Image (pollinations is free, no key)
PROVIDER_IMAGE=pollinations

# Delivery (optional — default is 'file' which copies to N8N_FILES_DIR/published/)
# PUBLISH_WEBHOOK_URL=https://hooks.example.com/frameforge
# REVIEW_NOTIFY_URL=https://hooks.example.com/review-gate
```

Run the interactive wizard for guided setup:
```bash
npm run setup
```

---

## Workflow (step-by-step)

### Path 1 — Agent-First (FFmpeg + AI images)

**You are already running an LLM — use it.** Write the scenes yourself and hand
them to FrameForge for rendering. No `GROQ_API_KEY` or any other LLM key needed.
FrameForge only runs FFmpeg, TTS, and image generation:

```
create_video_from_script({
  scenes: [
    { narration: "WiFi sends data as radio waves...", caption: "RADIO WAVES",
      visual_description: "router emitting waves, flat illustration" },
    { narration: "Your device picks up the signal...", caption: "YOUR DEVICE",
      visual_description: "laptop receiving signal, clean diagram" }
  ],
  title: "How WiFi Works"
})
```

Then deliver it:
```
publish_video({ productionId, masterPath, channels: ["file"] })
```

> **Image generation fallback:** If the configured image provider is unavailable, FrameForge automatically falls back to a dark-background placeholder per scene — the render completes. Switch to `PROVIDER_IMAGE=falai` for a more reliable free provider.

### Path 2 — Code-Driven Animated Video (Playwright + ffmpeg, no AI images)

Use when: the user wants Remotion-style motion graphics, image gen is unavailable, or they ask for "animated video" or "make it look good". Every pixel is a pure function of time `t`.

> **Beat sheet gate:** Reply with a beat sheet and 4 keyframe descriptions first. Stop. Wait for approval before writing any scene code.

```
// 1. Synthesise voice first — audio timing is ground truth
multi_voice_tts({ text: "Narration.", outputPath: ".frameforge-files/voice_0.m4a" })

// 2. Scaffold the compositor project (copies engine + all render scripts + briefings)
scaffold_animation_project({
  outDir: ".frameforge-files/my-anim/",
  scenes: [ { narration: "...", caption: "...", visual_description: "..." } ],
  audioPath: ".frameforge-files/voice_0.m4a"
})
// → returns nextSteps[] — read ANIMATION_GUIDE.md and edit STORYBOARD.md next

// 3. Validate storyboard (four hard gates — must pass before scene code)
validate_storyboard({ storyboardPath: ".frameforge-files/my-anim/STORYBOARD.md" })

// 4. Write real animation in edit.js (pure functions of t — read ANIMATION_GUIDE.md)

// 5. Pre-flight linter
render_animation({ projectDir: ".frameforge-files/my-anim/", mode: "look" })

// 6. Review stills (at least one sheet per shot, one strip per key motion)
render_animation({ projectDir: ".frameforge-files/my-anim/", mode: "sheet" })
render_animation({ projectDir: ".frameforge-files/my-anim/", mode: "strip",
                   timestamps: [2.1, 2.6] })   // every frame of one motion
render_animation({ projectDir: ".frameforge-files/my-anim/", mode: "crop",
                   timestamps: ["9:16", 3.0] })  // mobile crop check

// 7. Full render (only after stills pass)
render_animation({ projectDir: ".frameforge-files/my-anim/", mode: "full",
                   audioPath: ".frameforge-files/voice_0.m4a" })
```

Requires one-time: `cd <outDir> && npm install playwright && npx playwright install chromium`

### Path 3 — Auto-Research (for unattended / batch runs)

Use this when FrameForge runs **without** an IDE in the loop — overnight batch,
`queue_full_pipeline`, or a standalone worker. The pipeline calls its own LLM
for research and scripting, so `PROVIDER_LLM` + the matching API key are required:

```
1. research_topic({ topic: "...", style: "educational", format: "short-form reel" })
2. write_script({ productionId, claims, topic, persona: "tech reviewer" })
3. render_from_scenes({ productionId })
4. publish_video({ productionId, masterPath, channels: ["file"] })
```

### Voice Synthesis (per call)

```
multi_voice_tts({
  text: "Narration text here",
  outputPath: "/path/in/files-dir/voice_0.m4a",
  platform: "elevenlabs",
  voice: "your_cloned_voice_id",
  apiKey: "sk_..."
})
```

### Overnight batch

```
I'm going to sleep. Make as many videos as you can before 9 AM.
Topics (queue them all):
  1. How does GPS actually work?
  2. Why planes don't fly over the Pacific in a straight line
  3. The engineering inside a modern CPU

Rules:
- Strong hook, double-verify every fact.
- After each video: run the quality gate, then publish to the output directory.
- Leave me a summary when done.
```

The skill calls MCP tools sequentially using the StateMachine to track progress.
If a stage fails it retries with exponential backoff; if it fails terminally it
marks that production FAILED and moves to the next topic.

---

## Provider reference

| Role  | Provider     | Key env var               | Notes                          |
|-------|-------------|--------------------------|-------------------------------|
| LLM   | groq        | `GROQ_API_KEY`            | Default. Fast, free tier.      |
| LLM   | openrouter  | `OPENROUTER_API_KEY`      | Any model via one key          |
| LLM   | anthropic   | `ANTHROPIC_API_KEY`       | Claude Sonnet/Haiku/Opus       |
| LLM   | gemini      | `GEMINI_API_KEY`          | Gemini 2.0 Flash / 2.5 Pro     |
| LLM   | cerebras    | `CEREBRAS_API_KEY`        | 2000+ tok/s Llama              |
| LLM   | openai      | `OPENAI_API_KEY`          | GPT-4o / o1                    |
| LLM   | ollama      | _(none)_                  | Local, OLLAMA_BASE_URL         |
| TTS   | edge-tts    | _(none)_                  | Free, offline, 300+ voices     |
| TTS   | elevenlabs  | `ELEVENLABS_API_KEY`      | Voice cloning                  |
| TTS   | azure       | `AZURE_SPEECH_KEY`        | Enterprise                     |
| TTS   | openai      | `OPENAI_API_KEY`          | High quality                   |
| Image | pollinations| _(none)_                  | Free, no key                   |
| Image | falai       | `FAL_API_KEY`             | Fast FLUX                      |
| Image | replicate   | `REPLICATE_API_TOKEN`     | Flexible                       |
| Image | dalle       | `OPENAI_API_KEY`          | DALL-E 3                       |

---

## Quality gates (hard — will block delivery)

| Gate                | Threshold            |
|---------------------|----------------------|
| File size           | > 1 MB               |
| Video stream        | present              |
| Resolution (master) | 1920×1080            |
| Resolution (short)  | 1080×1920            |
| Codec               | H.264                |
| Pixel format        | yuv420p              |
| Frame rate          | 24–30 fps            |
| Integrated loudness | −14 ±1.5 LUFS        |
| True peak           | ≤ −0.5 dBTP          |
| Black frames        | none > 0.5 s         |
| Frozen frames       | none > 0.5 s         |

---

## Key files

```
src/mcp-server/server.js          MCP HTTP server (17 tools, port 3210)
src/mcp-server/stdio.js           MCP stdio server (17 tools)
cloudflare-mcp/src/index.js       Cloudflare Workers Remote MCP proxy
src/pipeline/providers.js         LLM / TTS / Image abstraction (env-var-switchable providers)
src/pipeline/state-machine.js     File + PostgreSQL production state
src/pipeline/retry-policy.js      Exponential backoff, stage timeouts
src/pipeline/telemetry.js         NDJSON cost tracking
src/quality-gate/gate.js          9 hard gates
src/audio-mixer/mixer.js          Sidechain ducking, LUFS normalisation
src/shorts-extractor/extractor.js Silence-based 9:16 crop for Shorts
src/fact-checker/checker.js       Claim risk classification + evidence gates
src/video-renderer/renderer.js    Scene render + master assembly
src/worker/server-render-free.js  Render-optimised worker API (Render free)
src/worker/server.js              Full worker API
docs/env.template                 Environment variable reference
```
