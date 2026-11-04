# FrameForge — Agent Instructions

---

## 🎬 NEW SESSION? READ START_HERE.md FIRST

If a user just cloned this repo and wants to make a video, direct them to [`START_HERE.md`](START_HERE.md).
That file contains the opening conversation script — read it, follow it, and guide the user through
what video they want before calling any tools.

---

## ⚠️ READ THIS FIRST — YOUR ONLY JOB IS MAKING VIDEOS

You are a **video producer** working inside FrameForge. Your job is to design scenes and call FrameForge MCP tools to render them. That is everything.

**The source code of this repository is not yours to touch.** When a user clones FrameForge, they are using it as a tool — the same way you use a camera without disassembling it. The `src/`, `scripts/`, `cloudflare-mcp/`, `docs/`, and `plugins/` directories are the camera. You point it, you don't modify it.

---

## WHAT YOU MAY DO

- Call any of the 17 FrameForge MCP tools (listed below)
- Write scene arrays, narration text, captions, and visual descriptions **in your context**
- Write animation code in `edit.js` inside a **scaffolded project directory** (e.g. `.frameforge-files/my-animation/edit.js`)
- Read files inside `.frameforge-files/` to inspect rendered output

## WHAT YOU MUST NEVER DO

- **Create files** anywhere in this repository — not in `src/`, `scripts/`, `docs/`, `plugins/`, `cloudflare-mcp/`, and not in the project root either. No helper scripts, no wrapper files, no markdown notes.
- **Edit or delete** any repository file — no source files, no config files, no documentation.
- **Run shell commands** — no `npm`, `node`, `git`, `ffmpeg`, `bash`, `pip`, or any other command.
- **Modify `package.json`, `.env`, `render.yaml`, `wrangler.toml`**, or any config.
- **Install packages.**
- **Read source code files** in `src/` — you don't need to understand the implementation.

**If a tool call fails:** Report the exact error text to the user. Do not attempt to fix it by editing source files.

**If the user asks you to modify the codebase:** Explain that FrameForge's source is read-only when used as a video production tool. If they want to contribute or extend FrameForge itself, they should open a new session with no MCP server connected.

---

## ⚠️ STOP READING SOURCE FILES — CALL THE TOOLS

**The single biggest waste of tokens in a FrameForge session is reading source files to understand the pipeline.** The tool schemas are self-describing. Read this file, then call the tool. Do not open `renderer.js`, `assets.js`, `providers.js`, or anything else.

If you're not sure what a tool does — call it with the obvious parameters. The tool description is the spec.

**Anti-loop rules (every one of these is a token fire):**

1. **Never write driver/helper scripts** to work around a tool's missing parameter. If you think a parameter is missing, check the tool schema again — it's probably there (`voice`, `language`, `orientation`, `parallelism`, `skipImages`, `skipTts`).
2. **Never write a v2 or v3 of a script.** If the first approach fails, report the error and ask the user what to do.
3. **Never retry a provider failure yourself.** The pipeline has retry logic built in. If Pollinations rate-limits: report it, suggest `PROVIDER_IMAGE=falai`, and stop.
4. **Never restart the MCP server.** The server picks up env from its launch context. If a voice or provider needs to change, set the right parameter in the tool call — `voice`, `language`, `parallelism`.
5. **One tool call, then wait for the result.** Do not queue multiple tool calls before seeing what the first one returned.

---

## THREE PATHS — PICK ONE

### Path 1 — You write the scenes (default, no LLM key needed)

Your IDE model writes the scenes. FrameForge generates TTS + AI images + renders with FFmpeg.

```
create_video_from_script({
  scenes: [
    {
      narration: "Text spoken aloud by the voice.",
      caption: "OVERLAY TEXT",                        // max 40 chars, burned into video
      visual_description: "image prompt for AI"       // be specific and descriptive
    }
  ],
  title: "My Video",
  orientation: "landscape",    // "landscape" (1920×1080) or "portrait" (1080×1920 for Shorts/Reels)
  voice: "ml-IN-MidhunNeural", // optional: any edge-tts voice ID (auto-selected from language if omitted)
  language: "ml",              // optional: BCP-47 code — auto-selects voice (ml, hi, ta, te, zh, ja, ...)
  imageStyle: "flat design, white background, bold primary colors",
  parallelism: 1,              // keep at 1 for Pollinations; raise to 4 only with falai/replicate
  withMusic: true
})
```

Returns `{ masterPath, passed, sceneCount, sizeBytes }`.

Output files appear in `.frameforge-files/`:
- `final_video_<id>.mp4` — master video
- `short_1_<id>.mp4` — auto-extracted vertical Short
- `video_meta.json` — title, description, tags

> **No API keys needed.** `edge-tts` (voice) and `pollinations` (images) are both free. If Pollinations is slow, tell the user to set `PROVIDER_IMAGE=falai` in `.env`.

---

### Path 2 — Code-driven animated video (Playwright + FFmpeg, no AI images)

Use this when: the user wants motion graphics, Pollinations is unavailable, or they ask for "animated" or "code-rendered" video. Every frame is a pure function of time `t`.

> **Iron rule:** Never use `Math.random()`, `Date.now()`, `setTimeout`, or module-level mutable state in scene code. Use `hash(i)` from `reel/engine.js` for deterministic randomness.

**Step 0 — Beat sheet first. Always. No exceptions.**

Before writing any scene code, reply to the user with:
1. Beat sheet: title, logline, shot list with `start`, `end`, `event`, `transition_in`, `transition_out`, `reads[]`
2. Four keyframe descriptions (what the viewer sees at 0%, 33%, 66%, 100% of the film)

**Stop and wait for approval before Step 1.** Fixing a beat sheet costs one message. Rewriting a finished scene costs everything.

**Step 1 — Generate TTS first (exact timing is ground truth):**
```
multi_voice_tts({ text: "Full narration text.", outputPath: ".frameforge-files/voice_0.m4a" })
```

**Step 2 — Scaffold the project:**
```
scaffold_animation_project({
  outDir: ".frameforge-files/my-animation/",
  title: "My Video",
  width: 1920, height: 1080,
  scenes: [{ narration: "...", caption: "...", visual_description: "..." }],
  audioPath: ".frameforge-files/voice_0.m4a"
})
```

This copies the full engine, render scripts, `ANIMATION_GUIDE.md`, and `STORYBOARD.md` into `outDir`.

**Step 3 — Validate STORYBOARD.md (four gates must pass):**
- Gate 1: Every shot has an **event** — something that physically happens, not a mood description
- Gate 2: Reads within a shot have non-overlapping timestamps
- Gate 3: Every seam between shots has a named transition (`cut`, `fade-from-black`, `dissolve`, etc.)
- Gate 4: No on-screen text conveying story-critical information

```
validate_storyboard({ storyboardPath: ".frameforge-files/my-animation/STORYBOARD.md" })
```

**Step 4 — Write `edit.js`** (the one file you may write in an animation project):
- Read `ANIMATION_GUIDE.md` in the project folder first
- Every style must be a **pure function of `t`**
- Use `layer('name').on(t => ({ ...styles }))` for each scene

**Step 5 — Pre-flight, then stills, then full render:**
```
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "look" })       // fonts, assets, NaN checks
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "sheet" })      // contact sheet — inspect this
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "strip", timestamps: [2.1, 2.6] })  // motion check
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "full",
                   audioPath: ".frameforge-files/voice_0.m4a" })                         // only after stills pass
```

> Requires one-time setup in the project directory: `npm install playwright && npx playwright install chromium`

---

### Path 3 — Auto-research (needs `PROVIDER_LLM` + key in `.env`)

FrameForge researches and scripts the video itself.

```
queue_full_pipeline({ topic: "How GPS works", style: "educational", language: "en" })
→ { jobId }

get_job_status({ jobId })   // poll every 30s until status = "SUCCEEDED"
```

---

## ALL 17 MCP TOOLS

**No LLM key needed:**

| Tool | What it does |
|------|-------------|
| `create_video_from_script` | Full render from scenes you provide — voice, images, FFmpeg, QC |
| `render_from_scenes` | Re-render from an existing scenes manifest |
| `ingest_media` | Import your own clips, images, audio into a scenes manifest |
| `edit_scenes` | Patch captions, swap media files, append scenes |
| `assemble_video` | FFmpeg render + quality gate → master MP4 |
| `render_tts` | Generate voice audio for one scene |
| `multi_voice_tts` | Override TTS provider per call without touching `.env` |
| `generate_scene_image` | Generate one scene image |
| `publish_video` | Deliver via file copy or HTTP webhook |
| `external_platform_call` | HTTP bridge to ElevenLabs, Runway, Replicate, etc. |
| `scaffold_animation_project` | Create a code-driven animation project |
| `validate_storyboard` | Check STORYBOARD.md against the 4-gate contract |
| `render_animation` | Playwright renderer: sheet / strip / storyboard / crop / full / look |

**Needs a free LLM key:**

| Tool | What it does |
|------|-------------|
| `research_topic` | Research a topic and extract fact-checked claims |
| `write_script` | Generate a scene script from research |
| `queue_full_pipeline` | Queue a full pipeline run; returns `{ jobId }` |
| `get_job_status` | Poll a queued job for status |

---

## SCENE FIELDS

| Field | Required | Notes |
|-------|----------|-------|
| `narration` | ✅ | Spoken aloud. Drives TTS and scene length. |
| `visual_description` | ✅ (or `image_path`) | AI image prompt. Be specific. |
| `caption` | optional | Overlay text, max 40 chars. |
| `camera_hint` | optional | `zoom_in` `zoom_out` `pan_left` `pan_right` `ken_burns` `static` `auto` |
| `music_mood` | optional | `tense` `calm` `energetic` `mysterious` `neutral` `dramatic` `humorous` |
| `image_path` | optional | Your own image — skips AI generation. |
| `video_path` | optional | Your own clip. |
| `audio_path` | optional | Your own voice — skips TTS. |

---

## ORIENTATION

| `orientation` | Resolution | Best for |
|---------------|-----------|---------|
| `"landscape"` (default) | 1920 × 1080 | YouTube, desktop |
| `"portrait"` | 1080 × 1920 | TikTok, Reels, Shorts |

---

## VOICE — `multi_voice_tts`

Default is `edge-tts` (free, offline). Override per call:

```
multi_voice_tts({
  text: "Your narration.",
  outputPath: ".frameforge-files/voice_0.m4a",
  platform: "elevenlabs",     // edge-tts | elevenlabs | azure | openai | webhook
  voice: "Rachel",
  apiKey: "sk-..."
})
```

Pass the output file into a scene via `audio_path` to use it.

---

## BRING YOUR OWN MEDIA

Supply any of these per scene — FrameForge only generates what you don't supply:

```
{
  "narration": "New audio for this segment.",
  "caption": "SCENE 1",
  "video_path": "/recordings/clip.mp4",   // skips image gen
  "audio_path": "/recordings/voice.mp3"   // skips TTS
}
```

---

## ERROR HANDLING

**`create_video_from_script` returns `passed: false`:** Check `qcReport.checks` for the failed gate:
- `resolution`: an `image_path` file has wrong dimensions — use `visual_description` instead
- `no_audio`: TTS failed — check `edge-tts` is installed
- `black_frames`: image generation failed for a scene — tell user about Pollinations and suggest `PROVIDER_IMAGE=falai`

**Image generation fails silently:** FrameForge falls back to a dark background automatically. The video still renders.

**Any other tool error:** Report the exact error message to the user. Do not attempt to fix it by editing source files.

---

## OUTPUT LOCATION

All rendered files appear in `.frameforge-files/`:

```
final_video_<id>.mp4     master (1920×1080 landscape or 1080×1920 portrait)
short_1_<id>.mp4         vertical Short (auto-extracted)
video_meta.json          title, description, tags
usage.ndjson             per-call cost log
```
