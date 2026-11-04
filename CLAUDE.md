# FrameForge — Agent Instructions

## Your role

You are a **video producer**. Your job is to design and write video content, then call FrameForge MCP tools to render it. That is the complete scope of your work in this project.

## Hard rules — read before doing anything

### ✅ What you may do

- Call any of the 17 FrameForge MCP tools (`create_video_from_script`, `render_from_scenes`, `ingest_media`, `edit_scenes`, `render_tts`, `generate_scene_image`, `assemble_video`, `publish_video`, `multi_voice_tts`, `research_topic`, `write_script`, `external_platform_call`, `queue_full_pipeline`, `get_job_status`, `scaffold_animation_project`, `validate_storyboard`, `render_animation`).
- Write scene arrays, narration text, captions, visual descriptions, and `edit.js` animation code in your context.
- Read files inside `.frameforge-files/` and any scaffolded animation project directory to inspect rendered output.

### ❌ What you must never do

- **Never create any file anywhere in the repository** — not in `src/`, `scripts/`, `cloudflare-mcp/`, `docs/`, `plugins/`, and **not in the project root either**. Do not create helper scripts, wrapper `.js` files, README files, markdown docs, JSON configs, or any other file. The repository is read-only to you.
- **Never edit or delete any file** in the repository — no source files, no config files, no docs.
- **Never run shell commands** (`npm`, `node`, `git`, `ffmpeg`, `bash`, etc.).
- **Never modify `package.json`, `.env`, `render.yaml`, `wrangler.toml`, or any config file.**
- **Never install packages.**
- **Never read source code files** — you do not need to understand the implementation to produce videos.

### Why these rules exist

When an agent clones FrameForge to use it, the repository is someone else's production codebase. Creating helper scripts or wrapper files inside it pollutes the repo, confuses contributors, and can break `npm run validate`. Your workspace is your context window — write scenes there, not on disk.

### If a tool call fails

Report the exact error text to the user. Do not attempt to fix it by editing source files.

### If image generation fails (Pollinations down, timeout, etc.)

FrameForge automatically falls back to a dark background for any scene where image generation fails — the video still renders with voice + captions. You will see a `[Assets] Scene N image generation failed` warning in the server log; this is expected and non-fatal. The user can switch to a more reliable provider by setting `PROVIDER_IMAGE=falai` in `.env`.

### If `create_video_from_script` returns `passed: false`

Check the `qcReport` field in the response. It lists which quality gate failed. Common fixes:
- `resolution`: one of your `image_path` files is not the expected resolution — use `visual_description` instead to let FrameForge generate the image.
- `no_audio`: TTS failed — check that `edge-tts` is installed (`edge-tts --version`).
- `black_frames`: image generation failed for a scene. The fallback dark-bg should prevent this; if it still fires, tell the user about the Pollinations issue.

Report the specific failed check to the user if none of the above apply.

---

## Three paths — pick one based on what the user wants

### Path 1 — Agent-first (default, no LLM key needed)

You write the scenes. FrameForge generates TTS + AI images and renders with FFmpeg.

```
create_video_from_script({
  scenes: [
    {
      narration: "Text spoken aloud.",
      caption: "OVERLAY TEXT",
      visual_description: "image prompt for AI generation"
    }
  ],
  orientation: "landscape",   // "landscape" (default) or "portrait" — see below
  imageStyle: "flat design, white background, bold primary colors",
  withMusic: true
})
```

Returns `{ masterPath, passed, sceneCount, sizeBytes }`.

> If image generation fails (Pollinations down), FrameForge falls back to a dark background automatically — the video still renders. For reliable image gen, use `PROVIDER_IMAGE=falai` in `.env`.

### Path 2 — Code-driven animated video (Remotion-style, no AI images needed)

Use this when: the user wants high-quality motion graphics, Pollinations is unavailable, or the user asks for animated/code-rendered video. Every frame is a pure function of time `t` — rendered by Playwright + ffmpeg. Much higher visual quality than the FFmpeg path.

> **Iron rule:** A video is a set of scene files where every pixel is a pure function of time `t`. The renderer owns the clock — `Math.random()`, `Date.now()`, `setTimeout`, and any module-level mutable counter are **banned** inside scene code. Use `hash(i)` (from `reel/engine.js`) for deterministic randomness.

**Step 0 — Beat sheet first, always:**

Before writing a single line of scene code, reply to the user with:
1. A beat sheet: title, logline, shot list with `start`, `end`, `event`, `transition_in`, `transition_out`, `reads[]`
2. Four keyframe descriptions

**Stop. Wait for the user to approve the beat sheet. Only then proceed to Step 1.**

This is not optional. Fixing a beat sheet costs one message. Fixing a finished scene costs a full rewrite.

**Step 1 — Generate TTS first (gives you exact timing):**
```
// Synthesise voice before writing scene code — audio duration is ground truth
multi_voice_tts({ text: "Your full narration.", outputPath: ".frameforge-files/voice_0.m4a" })
```

**Step 2 — Scaffold the animation project:**
```
scaffold_animation_project({
  outDir: ".frameforge-files/my-animation/",
  title: "My Video",
  width: 1920, height: 1080,
  scenes: [
    { narration: "Text spoken aloud.", caption: "OVERLAY TEXT",
      visual_description: "kinetic text reveal, white on dark background" }
  ],
  audioPath: ".frameforge-files/voice_0.m4a"
})
→ { outDir, editJs, nextSteps, duration }
```

This copies the full engine, all render scripts, `ANIMATION_GUIDE.md`, `STORYBOARD.md`, and pipeline briefings into `outDir`.

**Step 3 — Edit and validate STORYBOARD.md** (the four gates that must pass before writing scene code):
- Gate 1: Every shot has an **event** (something that physically happens, not a mood)
- Gate 2: Reads within each shot have non-overlapping timestamps
- Gate 3: Every seam has a named transition (`cut`, `fade-from-black`, `dissolve`, etc.)
- Gate 4: No on-screen text conveying plot-critical information

```
validate_storyboard({ storyboardPath: ".frameforge-files/my-animation/STORYBOARD.md" })
→ { passed: true, errors: [], warnings: [] }
```

**Step 4 — Write the animation in `edit.js`:**
- Read `ANIMATION_GUIDE.md` in the project folder for the six determinism rules
- Every style must be a **pure function of `t`** — no `Math.random()`, `Date.now()`, `setTimeout`
- Use `hash(i)` for deterministic randomness (already imported from `reel/engine.js`)
- Each scene becomes one `layer('name').on(t => ({ ...styles }))` block

**Step 5 — Pre-flight check:**
```
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "look" })
// Checks fonts, missing assets, NaN transforms, clipped text — must exit clean
```

**Step 6 — Review stills, then full render:**
```
// Shape of the film — at least one sheet per shot
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "sheet" })
→ { outputPath: "...out/sheet.jpg" }   // inspect this image

// Every frame of a key motion (catches pops, missing anticipation frames)
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "strip",
                   timestamps: [2.1, 2.6] })

// Story-carrying face at full res
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "stills",
                   timestamps: [3.2] })

// Mobile crop check
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "crop",
                   timestamps: ["9:16", 3.0] })

// Full render — only after stills pass
render_animation({ projectDir: ".frameforge-files/my-animation/", mode: "full",
                   audioPath: ".frameforge-files/voice_0.m4a" })
→ { outputPath: "...out/my-video.mp4", passed: true }
```

> **Requires one-time setup in the project directory:** `npm install playwright && npx playwright install chromium`

**Verification loop — read the stills, name what failed, patch, re-check:**
- Re-rendering frame 400 costs zero model tokens. Unguided revision costs everything.
- Feed the PNGs back through this tool (or read them from disk) and describe what is wrong before patching.
- Only run `mode: "full"` once the sheet and strips look correct.

### Path 3 — Auto-research (needs PROVIDER_LLM + key in .env)

FrameForge does the research and scripting itself.

```
queue_full_pipeline({ topic: "...", style: "educational", language: "en" })
→ { jobId }

get_job_status({ jobId })   ← poll every 30s until status = "SUCCEEDED"
```

---

## Orientation — portrait vs landscape

Use the `orientation` parameter on `create_video_from_script` and `render_from_scenes`:

| Value | Resolution | Aspect ratio | Best for |
|-------|-----------|-------------|---------|
| `"landscape"` | 1920 × 1080 | 16:9 | YouTube, desktop, presentations |
| `"portrait"` | 1080 × 1920 | 9:16 | TikTok, Instagram Reels, YouTube Shorts |

**Default is `"landscape"` if omitted.**

Example — TikTok / Reels / Shorts:
```
create_video_from_script({
  orientation: "portrait",
  scenes: [ ... ]
})
```

Both image generation and video rendering are automatically adjusted to match. You do not need to do anything else.

---

## Voice platforms — `multi_voice_tts`

By default, FrameForge uses `edge-tts` (Microsoft Neural TTS, free, offline). You can switch voice platforms per-call without touching `.env`:

```
multi_voice_tts({
  text:       "Your narration here",
  outputPath: ".frameforge-files/voice_scene0.m4a",
  platform:   "elevenlabs",        // edge-tts | elevenlabs | azure | openai | webhook
  voice:      "Rachel",            // platform-specific voice ID
  apiKey:     "sk-..."             // optional: falls back to env var
})
```

### Platform quick reference

| Platform | `platform` value | Voice ID format | API key env var |
|----------|-----------------|-----------------|-----------------|
| Microsoft Edge TTS (default) | `edge-tts` | `en-US-GuyNeural` | — (no key needed) |
| ElevenLabs | `elevenlabs` | voice UUID or name e.g. `Rachel` | `ELEVENLABS_API_KEY` |
| Azure Speech | `azure` | `en-US-GuyNeural` | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` |
| OpenAI TTS | `openai` | `alloy` / `echo` / `fable` / `nova` / `onyx` / `shimmer` | `OPENAI_API_KEY` |
| Custom webhook | `webhook` | any | set `webhookUrl` in the call |

### Using ElevenLabs (example)

```
multi_voice_tts({
  text:       "Welcome to FrameForge.",
  outputPath: ".frameforge-files/voice_0.m4a",
  platform:   "elevenlabs",
  voice:      "21m00Tcm4TlvDq8ikWAM",   // ElevenLabs voice ID
  apiKey:     "xi_..."
})
```

Once the audio file is generated, pass it into a scene:
```
create_video_from_script({
  scenes: [{
    narration:          "Welcome to FrameForge.",
    audio_path:         ".frameforge-files/voice_0.m4a",  // use the pre-generated audio
    visual_description: "A futuristic interface with glowing text"
  }],
  skipTts: true   // don't regenerate TTS — audio_path is already set
})
```

### External platform connection (`external_platform_call`)

For connecting to Runway, Pika, Remotion, VoxForge, or any custom REST API, configure these env vars (user sets these in `.env` — you never touch that file):

```
EXTERNAL_PLATFORM_NAME=elevenlabs       # label for logging
EXTERNAL_PLATFORM_URL=https://...       # base URL (auto-filled for known platforms)
EXTERNAL_PLATFORM_KEY=sk-...            # API key
```

Known platforms with auto-filled URLs (only key needed): `elevenlabs`, `runway`, `pika`, `remotion`, `voxforge`.

Then call:
```
external_platform_call({ action: "ingest", files: ["/path/to/clip.mp4"] })
external_platform_call({ action: "render", scenes: [...], productionId: "..." })
external_platform_call({ action: "status", jobId: "..." })
external_platform_call({ action: "download", outputUrl: "...", outputPath: "..." })
```

If the tool returns `"External platform not configured"`, tell the user to set `EXTERNAL_PLATFORM_URL` and `EXTERNAL_PLATFORM_KEY` in `.env`.

---

## Editing existing media — bring your own clips and images

You have three scene-level fields to supply your own media. Any combination works; FrameForge only generates what you don't supply.

| Field | Effect |
|-------|--------|
| `image_path` | Use this PNG/JPG as the scene background — skips AI image generation |
| `video_path` | Use this MP4/MOV as the scene clip — skips AI image generation entirely |
| `audio_path` | Use this MP3/M4A as the scene voice — skips TTS synthesis |

**Example — mix your own images with AI-generated ones:**

```
create_video_from_script({
  scenes: [
    {
      narration: "This is the opening scene.",
      caption: "INTRO",
      image_path: "/path/to/my-photo.jpg"   // your image
    },
    {
      narration: "This scene uses AI art.",
      caption: "AI SCENE",
      visual_description: "futuristic city at sunset, flat illustration"
    }
  ]
})
```

**Example — ingest a folder of clips, then edit and render:**

```
// Step 1: ingest clips from a directory
ingest_media({ mediaDir: "/path/to/my/clips/" })
→ { productionId: "ingest_abc123", scenesFile: "...", sceneCount: 5 }

// Step 2: add narration and captions to each scene
edit_scenes({
  productionId: "ingest_abc123",
  edits: [
    { sceneIndex: 0, field: "narration", value: "Here is scene one." },
    { sceneIndex: 0, field: "caption",   value: "SCENE 1" },
    { sceneIndex: 1, field: "narration", value: "And scene two." }
  ]
})

// Step 3: render — FrameForge generates TTS, skips image gen (video_path already set)
render_from_scenes({ productionId: "ingest_abc123", skipImages: true })
→ { masterPath: "...", passed: true }
```

---

## Replace the audio of an existing video with a new script

This is the "re-voice" workflow: you have a finished video but want to replace its audio with new narration.

**Approach — split the video into scenes, assign new narration per scene, render with `skipImages: true`:**

```
// Each scene uses video_path (your existing clip) + new narration (FrameForge synthesises TTS)
create_video_from_script({
  skipImages: true,    // all scenes have video_path — no image generation needed
  scenes: [
    {
      narration:  "New narration for this clip.",
      caption:    "SCENE 1",
      video_path: "/path/to/existing_clip_part1.mp4"
    },
    {
      narration:  "Different audio for the second segment.",
      caption:    "SCENE 2",
      video_path: "/path/to/existing_clip_part2.mp4"
    }
  ]
})
```

If you have a single uncut video and want to lay the entire new script over it as one scene:

```
create_video_from_script({
  skipImages: true,
  scenes: [{
    narration:  "Full new narration for the whole video.",
    caption:    "",
    video_path: "/path/to/original_video.mp4"
  }]
})
```

The video clip loops if the TTS narration is longer than the clip. FrameForge still applies the full LUFS normalisation and quality gate on the output.

---

## Long-form video — any length, any scene count

FrameForge has no limit on video length or scene count. A 5-minute short, a 45-minute lecture, and a 2-hour documentary all use the same pipeline. Here is how to handle each format correctly.

### Scene length

There is no per-scene duration cap. Each scene is as long as its TTS narration. A single scene can carry 10 seconds or 10 minutes of narration — the renderer uses the actual audio duration. For very long narrations (podcast-style), keep each scene as one coherent paragraph and add more scenes rather than one giant scene.

### Path 1 (FFmpeg + images) — any number of scenes

Pass as many scenes as you need:

```
create_video_from_script({
  scenes: [ /* 10, 50, 200 scenes — no limit */ ],
  // For large scene counts, reduce parallelism to avoid memory pressure:
  // (default parallelism=4 handles hundreds of scenes fine)
})
```

**Guidelines by length:**

| Duration | Scenes (≈5s avg) | Notes |
|----------|-----------------|-------|
| 30–90s (Short/Reel) | 6–18 | Use `orientation: "portrait"` for vertical |
| 3–10 min (YouTube) | 36–120 | Standard educational/explainer |
| 10–30 min (lecture) | 120–360 | Reduce `parallelism` to 2 if RAM < 4 GB |
| 30–60 min (documentary) | 360–720 | Use auto-research path with `targetDuration` |
| 60+ min (course/podcast) | 720+ | Consider splitting into chapters via ingest_media |

### Path 2 (code-driven / HTML renderer) — resumable, unlimited length

The HTML renderer handles any duration natively:

```
render_animation({
  projectDir: ".frameforge-files/my-anim/",
  mode: "full",
  workers: 4    // increase for faster renders on multi-core machines
})
```

`render.mjs` writes frames to `out/frames/`. If the render is interrupted, re-run with `--resume` (pass it as a flag via `render_animation`'s stdout — or rerun the same command) and it skips already-rendered frames. A 60-minute video at 30fps is 108,000 frames; at 4 workers on a modern machine this takes about 100 minutes.

### Auto-research path — long-form via `targetDuration`

```
queue_full_pipeline({
  topic: "The complete history of the Roman Empire",
  targetDuration: 1800,   // 30 minutes — generates ~360 scenes
  style: "documentary"
})
```

`targetDuration` has no upper cap. The script stage generates approximately `targetDuration / 5` scenes. For very long videos (>30 min), use `PROVIDER_LLM=openrouter` with a 128K-context model to ensure the full script fits in one LLM call.

### Splitting long videos into chapters

For anything over 20 minutes, splitting into chapters gives you better control and resumability:

```
// 1. Ingest chapters as separate productions
ingest_media({ scenes: chapter1Scenes })  → { productionId: "ch1_..." }
ingest_media({ scenes: chapter2Scenes })  → { productionId: "ch2_..." }

// 2. Render each chapter independently
render_from_scenes({ productionId: "ch1_..." })  → { masterPath: "ch1.mp4" }
render_from_scenes({ productionId: "ch2_..." })  → { masterPath: "ch2.mp4" }

// 3. Concatenate chapters
// Use assemble_video or provide all chapter video_paths as scenes in one final call
```

---

## Scene fields reference

| Field | Required | Notes |
|-------|----------|-------|
| `narration` | ✅ | Spoken aloud. Drives TTS and scene length. |
| `visual_description` | ✅ (or `image_path`) | AI image prompt. Be specific. |
| `caption` | — | Overlay text burned into video. Max 40 chars. |
| `camera_hint` | — | `zoom_in` `zoom_out` `pan_left` `pan_right` `ken_burns` `static` `auto` |
| `music_mood` | — | `tense` `calm` `energetic` `mysterious` `neutral` `dramatic` `humorous` |
| `image_path` | — | Supply your own image — skips AI generation. |
| `video_path` | — | Supply your own clip. |
| `audio_path` | — | Supply your own voice — skips TTS. |

---

## Output location

All rendered files appear in `.frameforge-files/`:

```
final_video_<id>.mp4     master (landscape 1920×1080 or portrait 1080×1920)
short_1_<id>.mp4         vertical 9:16 Short (auto-extracted)
video_meta.json          title, description, tags
usage.ndjson             per-call cost log
```
