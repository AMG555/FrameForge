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
3. **Never retry a provider failure yourself.** The pipeline has retry logic built in. If a provider fails: report it and stop.
4. **Never restart the MCP server.** The server picks up env from its launch context. If a voice or provider needs to change, set the right parameter in the tool call — `voice`, `language`, `parallelism`.
5. **One tool call, then wait for the result.** Do not queue multiple tool calls before seeing what the first one returned.

---

## THREE PATHS — PICK ONE

> **The primary path is Path 2 (code-driven animation).** Every frame is a pure function of time `t`, rendered by Playwright + FFmpeg. This is what produces the high-quality, viral-style motion graphics clips. Path 1 (FFmpeg + AI images) is the fast fallback when Playwright is unavailable or the user wants a quick draft. Path 3 (auto-research) is for unattended batch.

### Path 1 — You write the scenes (code animation & user media)

Your IDE model writes the scenes. FrameForge synthesizes TTS, binds user media (`image_path` / `video_path`) or procedural kinetic typography, and renders with FFmpeg.

```
create_video_from_script({
  scenes: [
    {
      narration: "Text spoken aloud by the voice.",
      caption: "OVERLAY TEXT",                        // max 40 chars, burned into video
      visual_description: "concept description",      // used for card styling
      image_path: "assets/photo.jpg",                 // optional: user manual image
      video_path: "assets/clip.mp4"                   // optional: user manual video clip
    }
  ],
  title: "My Video",
  orientation: "landscape",    // "landscape" (1920×1080) or "portrait" (1080×1920 for Shorts/Reels)
  voice: "ml-IN-MidhunNeural", // optional: any edge-tts voice ID (auto-selected from language if omitted)
  language: "ml",              // optional: BCP-47 code — auto-selects voice (ml, hi, ta, te, zh, ja, ...)
  parallelism: 1,
  withMusic: true
})
```

Returns `{ masterPath, passed, sceneCount, sizeBytes }`.

Output files appear in `.frameforge-files/`:
- `final_video_<id>.mp4` — master video
- `short_1_<id>.mp4` — auto-extracted vertical Short
- `video_meta.json` — title, description, tags

> **No API keys needed.** `edge-tts` (voice) runs offline and visual cards render procedurally with FFmpeg/Playwright. 100% deterministic, zero diffusion artifacts.

---

### Path 2 — Code-driven animated video (Playwright + FFmpeg, no AI images)

Use this when: the user wants motion graphics, explainer, reel, or YouTube-style video. Every frame is a pure function of time `t`.

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

**Step 5b — Closed-Loop QA Fix Protocol (mandatory after full render)**

After `full` render, run the quality gate:
```
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "quality" })
```
Returns `{ passed, overallScore, worstFrames: [{time, score, issues}], motionDelta }`.

- **`passed: true`** → continue to Step 6.
- **`passed: false`** → enter the fix loop (max 3 rounds):

```
Round N (repeat until passed or 3 rounds exhausted):
  1. Read worstFrames[] — note timestamps and issue descriptions.
  2. Open edit.js. Fix ONLY the code paths that affect those timestamps.
     Common issues and fixes:
       - "Blank frame"           → layer is returning opacity: 0 when it shouldn't; check lt bounds
       - "Stuck motion"          → two frames have identical hashes; motion formula may be constant
       - "Corner-confined"       → element x/y is outside safe zone; move to centre stage
       - "Blown frame"           → background colour too bright; switch to #0c1116–#111827 range
       - "Low contrast"          → scene is too dark; raise ambient layer brightness
  3. Run: render_animation({ mode: "strip", timestamps: [t-0.5, t+0.5] })
     for each failing timestamp to verify the fix visually.
  4. Run: render_animation({ mode: "quality" }) again.
  5. If passed: true → done. If still failing → next round.

After 3 rounds without passing: stop, report worstFrames to user, do not re-render full film.
```

**Never re-render the full film to fix a single failing timestamp.** Use `strip` on the
failing time range only. This is the Claude Code + Opus 5.5 closed-loop correction pattern:
render → score worst 3 frames → patch edit.js → re-strip → re-score → ship.

**Step 5c — Motion-blur pass (optional, high-quality reels)**

For fast morphs or kinetic reveals that show ghost copies at standard render:
```
render_animation({ projectDir: "...", mode: "full", subframes: 6, audioPath: "..." })
```
`subframes: 6` = 180° shutter — renders 6 frames per output frame, blends them. Adds ~6× render
time. Only needed when fast-moving elements look strobed. Standard renders use `subframes: 1`.

**Step 6 — Model effort guide (Opus 5.5 / Claude Code)**

| Stage | `effort` | Why |
|-------|----------|-----|
| Beat sheet + storyboard authorship | `xhigh` | New creative work — max reasoning |
| First-time scene code authorship | `xhigh` | New composition, determinism critical |
| Storyboard gate review / patch | `medium` | Analytical, not creative |
| Strip-range patch (fix failing frames) | `medium` | Targeted surgical fix |
| Encode-only / mux-only runs | `medium` | No creative decisions |

`tool_choice` must always be `auto` — Opus 5.5 does not support forced tool use.

**Step 7 — Optional: hook variants**

For reels and Shorts, make 2–3 versions with different opening hooks:
- Change only the first shot (0s–3s) in `edit.js`
- `render_animation({ mode: "stills", timestamps: [0.0, 1.5, 3.0] })` to compare openings
- Full render each variant, deliver as `hook_a.mp4`, `hook_b.mp4`, etc.

**Step 8 — Optional: unattended / spend-capped batch**
```
// run from projectDir
python scripts/video_job.py submit --spec spec.json --max-usd 2.00
// → { jobId }  — detached process, survives your session closing
python scripts/video_job.py status --id <jobId>
python scripts/video_job.py result --id <jobId>
```
Each step only starts if the running cost won't exceed `--max-usd`. Receipts go to `jobs/receipts.jsonl`.

**Step 9 — Golden stills regression test (before any refactor)**

After the video passes QC, save the 4-keyframe golden baseline:
```
render_animation({ projectDir, mode: "golden", goldenSave: true })
// → writes out/check/golden.json with SHA-256 hashes for 4 keyframes
```
Before future refactors, run the check:
```
render_animation({ projectDir, mode: "golden", goldenCheck: true })
// → fails if any keyframe hash has drifted (refactor broke determinism)
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

## ALL 27 MCP TOOLS

**Primary — code-driven animation (no LLM key, no image gen API):**

| Tool | What it does |
|------|-------------|
| `scaffold_animation_project` | Scaffold a Playwright + FFmpeg animation project (engine, render scripts, STORYBOARD.md) |
| `validate_storyboard` | Enforce the 4 hard gates before any scene code |
| `render_animation` | Playwright renderer: `sheet` / `strip` / `storyboard` / `crop` / `full` / `mux` / `kit` / `look` |
| `multi_voice_tts` | TTS per-call: `edge-tts` · `elevenlabs` · `voxforge` · `azure` · `openai` · `webhook` |
| `export_to_editor` | Send finished animation to Premiere / Resolve / CapCut / After Effects / Remotion |
| `external_platform_call` | HTTP bridge to **any** app — pass `platformUrl` directly, no env setup needed |

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

**Media ingestion (yt-dlp & Whisper):**

| Tool | What it does |
|------|-------------|
| `ingest_url` | Download video/audio from any web URL (YouTube, Vimeo, Twitter/X, TikTok, 1000+ sites) via yt-dlp |
| `transcribe_media` | Transcribe speech with Whisper — word-level timestamps (NDJSON for `cuePhrase()`), SRT subtitles, pause detection |

**Professional audio post-production:**

| Tool | What it does |
|------|-------------|
| `mix_audio_pro` | Broadcast-grade voice chain: 80Hz HPF → EQ → de-esser → compressor → reverb → sidechain duck → stereo widen → SFX timeline → two-pass EBU R128 |

**Editing & planning:**

| Tool | What it does |
|------|-------------|
| `edit_video` | Autonomous local editor — cut, trim, speed-ramp, color-grade, reframe, captions, transitions, audio mix |
| `plan_video_edit` | Plan/Approve/Render workflow — generates `edit-plan.md` + `edit.json` with rationale per cut |
| `preview_scene` | Render still frames of a scene HTML/code for visual inspection |
| `verify_scene_quality` | Closed-loop QA gate: 1–10 score on 4 axes (content, exposure, layout, motion delta) |

**Auto-research (needs a free LLM key):**

| Tool | What it does |
|------|-------------|
| `research_topic` | Research a topic and extract fact-checked claims |
| `write_script` | Generate a scene script from research |
| `queue_full_pipeline` | Queue a full pipeline run; returns `{ jobId }` |
| `get_job_status` | Poll a queued job for status |

**Upstream skills maintenance:**

| Tool | What it does |
|------|-------------|
| `sync_upstream_skills` | Check & merge updates from 9 reference repos (HyperFrames, Earshot, Remotion, OneTake, etc.). Auto-notifies when new motion craft rules, film styles, or audio presets are available. |

---

## PROFESSIONAL AUDIO WORKFLOW

### Whisper transcription → word-level caption sync

```
// Step 1: Generate TTS
multi_voice_tts({ text: "Your narration.", outputPath: ".frameforge-files/voice_0.m4a" })

// Step 2: Transcribe for exact word timestamps (requires: pip install openai-whisper)
transcribe_media({
  mediaPath: ".frameforge-files/voice_0.m4a",
  model: "base",         // tiny|base|small|medium|large
  format: "all",         // writes .ndjson (for captions()) + .srt + .json
})
// → returns: { outputs: { ndjson: "...", srt: "...", json: "..." }, pauses: [...] }

// Step 3: Load in edit.js for word-sync captions
// captions('audio/outline.txt');   ← use the ndjson output path
// cuePhrase("your words here");    ← returns exact timestamp from transcript
```

### yt-dlp media ingestion

```
// Download YouTube video for B-roll
ingest_url({ url: "https://youtube.com/watch?v=...", format: "video" })
// → returns: { localPath: "...", duration: 45.2, width: 1920, height: 1080 }

// Download audio-only (podcast, music)
ingest_url({ url: "https://soundcloud.com/...", format: "audio" })
// → returns: { localPath: "...", duration: 180.5 }

// Then pass to any other tool
edit_video({ clips: [{ video_path: localPath, ... }] })
transcribe_media({ mediaPath: localPath, format: "srt" })
```

### Professional audio mix (broadcast standard)

```
mix_audio_pro({
  voicePath: ".frameforge-files/voice_0.m4a",
  outputPath: ".frameforge-files/audio_pro.m4a",
  musicPath: "/path/to/bg-music.mp3",   // optional — will be sidechain ducked
  addReverb: false,                      // true = cinematic narrator room acoustics
  stereoWiden: true,                     // M/S expansion 1.4x on music layer
  sfxCues: [                             // earshot-pattern procedural SFX
    { name: "whoosh", time: 2.5, volume: 0.8 },  // 40ms perceptual lead applied
    { name: "impact", time: 8.0, volume: 1.0 },
    { name: "pop",    time: 12.3, volume: 0.6 },
  ],
  targetLufs: -14,   // -14 YouTube/default | -16 podcast | -23 broadcast
  // videoPath: ".frameforge-files/animation.mp4"  // optional: mux directly into video
})
// Returns: { outputPath, measuredLufs, measuredTp, passed, chain: {...} }
```

### Upstream skills auto-update

Run this at the start of any session to get the latest motion craft rules, film styles,
camera techniques, and audio presets from all 9 reference repositories:

```
sync_upstream_skills({})
// → If repos have new commits: returns updatedRepos[] and a visible update notice
// → Set SKILL_UPDATE_WEBHOOK_URL in .env for POST callback notifications
```

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

## CUSTOM APP MCP — connect any app instantly

`external_platform_call` connects to any HTTP app **without touching `.env`** — pass `platformUrl` directly:

```
// Connect any custom app or MCP-enabled tool right now
external_platform_call({
  action: "ingest",
  platformUrl: "http://localhost:8080",   // your app's base URL
  platformKey: "optional-api-key",        // omit if no auth
  files: [".frameforge-files/final.mp4"]
})

// Drive editing operations in your custom app
external_platform_call({
  action: "edit",
  platformUrl: "http://localhost:8080",
  operations: [
    { op: "cut",        at: 4.5 },
    { op: "color",      clip: 0, lut: "/luts/film.cube" },
    { op: "caption",    at: 2.0, duration: 3.0, text: "Intro", position: "bottom" },
    { op: "transition", between: [0, 1], type: "dissolve", duration: 0.5 }
  ]
})

// Use a named preset (auto-fills default paths for known apps)
external_platform_call({
  action: "render",
  platformName: "resolve",   // premiere | resolve | runway | voxforge | capcut | ...
  metadata: { exportPath: "/exports/final.mp4" }
})
```

**Your app only needs to accept POST JSON.** FrameForge sends:
- `ingest` → `multipart/form-data` with the files
- `edit` → `{ operations: [...], source: "frameforge" }`
- `render` → `{ scenes: [...], productionId: "...", ...metadata }`
- `status` → `GET /<statusPath>/<jobId>`

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
- `black_frames`: visual asset invalid — verify image_path / video_path file paths or use default code-driven visual cards

**Visual fallback:** FrameForge renders crisp code-driven animated cards automatically when no manual media is supplied. The video always renders cleanly.

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
