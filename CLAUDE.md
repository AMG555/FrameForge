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

> **The primary path is Path 2 (code-driven animation).** Every frame is a pure function of time `t`, rendered by Playwright + FFmpeg. This is what produces the high-quality, viral-style motion graphics clips. Path 1 (FFmpeg + AI images) is the fast fallback when Playwright is unavailable or the user wants a quick draft. Path 3 (auto-research) is for unattended batch.

### Path 1 — You write the scenes + AI images (quick draft)

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

Use this when: the user wants motion graphics, Pollinations is unavailable, or they ask for "animated", "code-rendered", "explainer", "reel", or "YouTube-style" video. Every frame is a pure function of time `t`.

> **Iron rule:** Never use `Math.random()`, `Date.now()`, `setTimeout`, or module-level mutable state in scene code. Use `hash(i)` from `reel/engine.js` for deterministic randomness.

**Pick a format first:**
- **Reel / Short / TikTok** → `width: 1080, height: 1920` (portrait 9:16)
- **YouTube / Explainer** → `width: 1920, height: 1080` (landscape 16:9)

**Step 0 — Beat sheet first. Always. No exceptions.**

Before writing any scene code, reply to the user with:
1. Beat sheet: title, logline, shot list with `start`, `end`, `event`, `transition_in`, `transition_out`, `reads[]`
2. Four keyframe descriptions (what the viewer sees at 0%, 33%, 66%, 100% of the film)

**Stop and wait for approval before Step 1.** Fixing a beat sheet costs one message. Rewriting a finished scene costs everything.

**Step 1 — Generate TTS and transcription (exact timing is ground truth):**
```
multi_voice_tts({ text: "Full narration text.", outputPath: ".frameforge-files/voice_0.m4a" })
```
Then transcribe for word-level timestamps (required for `cuePhrase()` sync):
```
// run in projectDir after scaffold: python scripts/transcribe.py .frameforge-files/voice_0.m4a
// → produces voice_0.captions.json with per-word start/end times
```

**Step 2 — Scaffold the project:**
```
scaffold_animation_project({
  outDir: ".frameforge-files/my-animation/",
  title: "My Video",
  width: 1920, height: 1080,   // or 1080×1920 for portrait reel
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
- Sync animation to narration using `cuePhrase('the exact words spoken')` — this reads `voice_0.captions.json` and returns the frame when those words start. **The build fails if the phrase isn't found**, so re-recording VO can never silently desync the animation.

**Step 5 — Pre-flight, then stills, then full render:**
```
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "look" })       // fonts, assets, NaN checks
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "sheet" })      // contact sheet — inspect this
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "strip", timestamps: [2.1, 2.6] })  // motion check
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "crop", timestamps: ["9:16", 3.0] })  // mobile check
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "full",
                   audioPath: ".frameforge-files/voice_0.m4a" })                         // only after stills pass
```

**Still review budget (minimum, before full render):**
- At least one `sheet` per shot
- One `strip` per key motion or transition
- One `crop` per story-carrying face or detail

**Step 6 — Optional: hook variants**

For reels and Shorts, make 2–3 versions with different opening hooks:
- Change only the first shot (0s–3s) in `edit.js`
- `render_animation({ mode: "stills", timestamps: [0.0, 1.5, 3.0] })` to compare openings
- Full render each variant, deliver as `hook_a.mp4`, `hook_b.mp4`, etc.

**Step 7 — Optional: unattended / spend-capped batch**
```
// run from projectDir
python scripts/video_job.py submit --spec spec.json --max-usd 2.00
// → { jobId }  — detached process, survives your session closing
python scripts/video_job.py status --id <jobId>
python scripts/video_job.py result --id <jobId>
```
Each step only starts if the running cost won't exceed `--max-usd`. Receipts go to `jobs/receipts.jsonl`.

**Step 8 — Golden stills regression test (before any refactor)**

After the video passes QC, save the test stills:
```
render_animation({ projectDir, mode: "storyboard" })  // 4 keyframes, file to out/storyboard.jpg
// → copy out/storyboard.jpg to test/golden/storyboard.jpg
```
Before future refactors, re-run and compare. If pixels shift, the refactor broke determinism.

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

## ALL 18 MCP TOOLS

**Primary — code-driven animation (no LLM key, no image gen API):**

| Tool | What it does |
|------|-------------|
| `scaffold_animation_project` | Scaffold a Playwright + FFmpeg animation project (engine, render scripts, STORYBOARD.md) |
| `validate_storyboard` | Enforce the 4 hard gates before any scene code |
| `render_animation` | Playwright renderer: `sheet` / `strip` / `storyboard` / `crop` / `full` / `mux` / `kit` / `look` |
| `multi_voice_tts` | TTS per-call: `edge-tts` · `elevenlabs` · `voxforge` · `azure` · `openai` · `webhook` |
| `export_to_editor` | Send finished animation to Premiere / Resolve / CapCut / After Effects / Remotion |
| `external_platform_call` | HTTP bridge to VoxForge, Runway, Kling, Pika, or any platform |

**Secondary — FFmpeg + AI images (fast draft, no Playwright needed):**

| Tool | What it does |
|------|-------------|
| `create_video_from_script` | Full render from scenes you provide — voice, images, FFmpeg, QC |
| `render_from_scenes` | Re-render from an existing scenes manifest |
| `ingest_media` | Import your own clips, images, audio into a scenes manifest |
| `edit_scenes` | Patch captions, swap media files, append scenes |
| `assemble_video` | FFmpeg render + quality gate → master MP4 |
| `render_tts` | Generate voice audio for one scene |
| `generate_scene_image` | Generate one scene image |
| `publish_video` | Deliver via file copy or HTTP webhook |

**Auto-research (needs a free LLM key):**

| Tool | What it does |
|------|-------------|
| `research_topic` | Research a topic and extract fact-checked claims |
| `write_script` | Generate a scene script from research |
| `queue_full_pipeline` | Queue a full pipeline run; returns `{ jobId }` |
| `get_job_status` | Poll a queued job for status |

---

## VOICE — VoxForge custom audio

`multi_voice_tts` with `platform: "voxforge"` routes to your VoxForge instance:

```
multi_voice_tts({
  text: "Your narration.",
  outputPath: ".frameforge-files/voice_0.m4a",
  platform: "voxforge",
  voice: "my-cloned-voice-id",   // speaker ID from VoxForge
  apiKey: "vf-..."               // or set VOXFORGE_KEY in .env
})
```

Set in `.env` for all calls:
```
PROVIDER_TTS=voxforge
VOXFORGE_URL=https://api.voxforge.io    # or your self-hosted URL
VOXFORGE_KEY=vf-...
VOXFORGE_VOICE=my-cloned-voice-id
```

---

## EDITOR BRIDGES — import and edit in external apps

`export_to_editor` supports four actions: **import**, **edit**, **render**, **status**.

### Import a finished animation

```
// Auto-generates EDL and imports MP4 + EDL into DaVinci Resolve
export_to_editor({ editor: "resolve", action: "import", projectDir: ".frameforge-files/my-anim/" })

// Premiere Pro (requires CEP companion server)
export_to_editor({ editor: "premiere", action: "import", projectDir: "..." })

// Explicit video path (no projectDir needed)
export_to_editor({ editor: "resolve", action: "import", videoPath: "/path/to/output.mp4" })
```

### Apply editing operations

```
export_to_editor({
  editor: "resolve",
  action: "edit",
  timelineName: "MyFilm",
  operations: [
    { op: "cut",        at: 4.5 },
    { op: "transition", between: [0, 1], type: "dissolve", duration: 0.5 },
    { op: "color",      clip: 0, lut: "/path/to/film.cube" },
    { op: "caption",    at: 2.0, duration: 3.0, text: "Chapter 1", position: "bottom" },
    { op: "trim",       clip: 1, startDelta: 0.3 },
    { op: "speed",      clip: 2, factor: 0.5 },
    { op: "mute",       clip: 3 },
    { op: "swap",       clip: 0, newPath: "/new/take.mp4" }
  ]
})
```

### Trigger the editor's own render/export

```
export_to_editor({ editor: "resolve", action: "render", exportPath: "/exports/final.mp4" })
// → returns { jobId }

export_to_editor({ editor: "resolve", action: "status", jobId: "..." })
// → returns { status, outputUrl }
```

### What's supported per editor

| Editor | import | edit ops | render | Notes |
|--------|--------|----------|--------|-------|
| `resolve` | ✅ | ✅ | ✅ | Built-in REST API (Resolve 18.6+). Enable in Preferences → System → General → "IP Remote Control". No bridge install needed. |
| `premiere` | ✅ | ✅ | ✅ | Requires CEP companion panel. See `docs/editor-bridges/premiere.md`. |
| `aftereffects` | ✅ | ✅ | ✅ | Requires AE REST bridge. See `docs/editor-bridges/aftereffects.md`. |
| `remotion` | ✅ | ✅ | ✅ | Remotion is code — operations patch composition props + trigger CLI render. No bridge. |
| `capcut` | ✅ | ❌ | ✅ | No public desktop edit API. Import + export only. |
| `custom` | ✅ | ✅ | ✅ | You define what the endpoint handles. |

**Override ports:** `RESOLVE_BRIDGE_URL`, `PREMIERE_BRIDGE_URL`, `CAPCUT_BRIDGE_URL`, `AE_BRIDGE_URL`

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
