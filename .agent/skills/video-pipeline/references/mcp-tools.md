# MCP Tool Reference

FrameForge exposes **28 tools** on the HTTP MCP server (`http://localhost:3210`)
and via the Cloudflare Remote MCP proxy. Any MCP-compatible client works:
IBM Bob, Claude Code, Codex, opencode, Cursor, Windsurf, Kiro, Copilot.

---

## Agent-first path (recommended)

The IDE writes the scenes array; FrameForge renders it.

### create_video_from_script

```json
{
  "scenes": [
    {
      "narration": "WiFi sends data as invisible radio waves.",
      "caption": "RADIO WAVES",
      "visual_description": "router emitting waves, flat illustration",
      "camera_hint": "slow_zoom_in",
      "music_mood": "calm"
    }
  ],
  "title": "How WiFi Works",
  "skipImages": false,
  "withMusic": true
}
```

Returns: `{ productionId, masterPath, passed, sizeBytes, sceneCount }`

---

## Full pipeline path

### research_topic

```json
{ "topic": "How does GPS work?", "claimCount": 10, "style": "educational" }
```

### write_script

```json
{
  "productionId": "prod-001",
  "claims": ["..."],
  "topic": "How does GPS work?",
  "persona": "tech explainer",
  "sceneCount": 15
}
```

Returns: `{ productionId, scenes, title, description, tags, sceneCount }`

### generate_scene_image

```json
{
  "productionId": "prod-001",
  "sceneIndex": 0,
  "visualDescription": "router emitting waves, flat illustration",
  "imagePath": "/optional/custom/image.png"
}
```

Registers or generates code-driven visual card for one scene.

### render_tts

```json
{
  "productionId": "prod-001",
  "sceneIndex": 0,
  "text": "WiFi sends data as invisible radio waves.",
  "voice": "en-US-GuyNeural"
}
```

Converts scene narration text to audio using configured TTS provider.

### assemble_video

```json
{
  "productionId": "prod-001",
  "sceneCount": 15,
  "withMusic": true,
  "musicVolume": 0.07
}
```

Assembles rendered scenes into final MP4 and validates quality gate.

### render_from_scenes

```json
{ "productionId": "prod-001", "skipImages": false, "withMusic": true }
```

### publish_video

```json
{
  "productionId": "prod-001",
  "masterPath": "/path/to/final_video.mp4",
  "channels": ["file"],
  "outputDir": "/path/to/output"
}
```

Channels:
- `file` — copy master + shorts to `outputDir` (or `N8N_FILES_DIR/published/`)
- `webhook` — POST JSON summary to `PUBLISH_WEBHOOK_URL`

---

## Edit path

### ingest_media

```json
{ "files": ["/path/to/clip1.mp4", "/path/to/clip2.mp4"], "title": "My Video" }
```

### edit_scenes

```json
{
  "productionId": "prod-001",
  "edits": [{ "sceneIndex": 0, "field": "caption", "value": "NEW CAPTION" }]
}
```

---

## TTS

### multi_voice_tts

```json
{
  "text": "The text to speak aloud.",
  "outputPath": "/files-dir/voice_0.m4a",
  "platform": "elevenlabs",
  "voice": "your_cloned_voice_id",
  "apiKey": "sk_..."
}
```

---

## Async job control

### queue_full_pipeline

```json
{
  "topic": "Why planes avoid straight lines",
  "style": "educational",
  "channels": ["file"]
}
```

Returns `{ jobId, status }` immediately. Poll `get_job_status` for completion.

### get_job_status

```json
{ "jobId": "job_1234567890_abc123" }
```

Returns `{ status: "RUNNING"|"SUCCEEDED"|"FAILED", result, error }`

---

## External platform

### external_platform_call

```json
{ "action": "ingest", "files": ["/path/to/clip.mp4"] }
```

Actions: `ingest` | `render` | `status` | `download`.
Configure with `EXTERNAL_PLATFORM_URL` + `EXTERNAL_PLATFORM_KEY` in `.env`.

---

## Media ingestion (yt-dlp & Whisper)

### ingest_url — Download from any web URL

```json
{
  "url": "https://youtube.com/watch?v=...",
  "format": "video",
  "outputDir": ".frameforge-files/downloads/"
}
```

Requires `yt-dlp` in PATH. Supports 1000+ sites. Returns `{ localPath, duration, width, height }`.

### transcribe_media — Whisper word-level timestamps

```json
{
  "mediaPath": ".frameforge-files/voice_0.m4a",
  "model": "base",
  "format": "all",
  "language": "en"
}
```

Returns `{ outputs: { ndjson, srt, json }, pauses, wordCount }`. NDJSON feeds `captions()` in engine.js.

---

## Professional audio post-production

### mix_audio_pro — 15+ year sound engineer chain

```json
{
  "voicePath": ".frameforge-files/voice_0.m4a",
  "outputPath": ".frameforge-files/audio_pro.m4a",
  "musicPath": "/path/to/bg-music.mp3",
  "platform": "youtube",
  "roomProfile": "cinematic",
  "noiseGate": true,
  "stereoWiden": true,
  "sfxCues": [
    { "name": "whoosh",   "time": 2.5,  "volume": 0.8 },
    { "name": "impact",   "time": 8.0,  "volume": 1.0 },
    { "name": "riser",    "time": 18.0, "volume": 0.7 },
    { "name": "deep_boom","time": 30.0, "volume": 0.9 },
    { "name": "sparkle",  "time": 35.2, "volume": 0.4 }
  ]
}
```

Chain: noise gate → 80Hz HPF → presence EQ → de-esser → compressor → room acoustics → sidechain duck → stereo widen → SFX → EBU R128 loudnorm.
SFX types: whoosh | impact | pop | click | riser | chime | buzz | tick | swish | punch | sparkle | deep_boom | transition
Room profiles: studio_dry | broadcast | cinematic | concert_hall | intimate
Platform presets: youtube (-14 LUFS) | podcast (-16) | broadcast (-23) | netflix (-27) | instagram (-14)

---

## Video editing & planning

### plan_video_edit — Plan/Approve/Render

```json
{
  "footage": ["/path/clip1.mp4", "/path/clip2.mp4"],
  "goal": "Create a cinematic product showcase",
  "style": "cinematic_anamorphic",
  "target_duration": 60,
  "audio_path": ".frameforge-files/voice_0.m4a",
  "music_path": "/path/to/bg.mp3"
}
```

Style options include all lemo-opuscar film styles:
`cinematic` | `fast_paced` | `documentary` | `vintage` | `cyberpunk` | `vibrant`
`editorial_collage` | `retro_vhs` | `anime_action` | `sci_fi_hud` | `lofi_chill` | `minimal_monochrome`
`cinematic_anamorphic` | `broadcast_news` | `blueprint_3d` | `film_16mm` | `product_obsidian` | `retro_vhs_80s`

Returns: `{ planPath, editJsonPath, planMarkdown, editConfig }`.

### edit_video — Execute planned cuts and color grading

```json
{
  "edit_file": ".frameforge-files/edit.json",
  "footage": ["/path/clip1.mp4", "/path/clip2.mp4"],
  "output_path": ".frameforge-files/final_cut.mp4",
  "cuts": [
    { "clip": 0, "start": 0, "end": 4.5, "speed": 1.0, "color_grade": "cinematic", "transition": "fade" }
  ],
  "audio_path": ".frameforge-files/voice_0.m4a",
  "music_path": "/path/to/bg.mp3",
  "color_grade": "cinematic",
  "auto_fit": true
}
```

Renders frame-exact edits with FFmpeg filtergraphs, J/L-cuts, pan/zoom camera moves, and color grading.

### export_to_editor — Export to Premiere Pro / DaVinci Resolve

```json
{
  "project_dir": ".frameforge-files/project",
  "format": "edl",
  "output_path": ".frameforge-files/project/timeline.edl",
  "title": "FrameForge Timeline"
}
```

Formats: `edl` (CMX 3600), `fcpxml` (Final Cut Pro / DaVinci), `otio` (OpenTimelineIO).

---

## Code-driven HTML animation (Claude Opus 5.5 pure-function-of-t)

### scaffold_animation_project

```json
{
  "outDir": "./my-animation",
  "title": "Why Planets Orbit",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "scenes": [
    { "narration": "Gravity curves spacetime.", "caption": "SPACETIME CURVATURE" }
  ]
}
```

Scaffolds a zero-diffusion HTML compositor project (`index.html`, `reel/engine.js`, `edit.js`, `scripts/render.mjs`).

### validate_storyboard

```json
{ "storyboardPath": "./my-animation/STORYBOARD.md" }
```

Validates storyboard against 4 hard gates: event timestamps, non-overlapping reads, named transitions, no on-screen text slop.

### generate_scene_code

```json
{
  "visual_description": "Sun bending gravity grid with orbiting Earth particle trail",
  "caption": "SPACETIME CURVATURE",
  "style": "cosmic_space",
  "duration": 4.0
}
```

Generates pure mathematical `window.seek(t)` canvas animation code.

### preview_scene

```json
{
  "html": "<html>...</html>",
  "duration": 4.0,
  "timestamps": [0.1, 2.0, 3.9]
}
```

Renders headless Chromium still frames (PNGs) to let the agent visually inspect layout, typography, and colors before rendering.

### verify_scene_quality

```json
{
  "htmlPath": "./my-animation/scene_1.html",
  "duration": 4.0,
  "sampleRate": 2
}
```

Closed-loop QA grading (1–10 score): content presence, exposure, layout balance, motion delta. Returns worst frames for automated patch loop.

### render_animation

```json
{
  "projectDir": "./my-animation",
  "mode": "full"
}
```

Modes: `full` (renders MP4), `sheet` (contact sheet), `stills` (specific frames), `strip` (motion strip), `look` (pre-render linter), `quality` (QA gate), `golden` (regression diff).
Returns `{ success, videoPath, sfxEvents }`.


### sync_upstream_skills — Fetch new commits from 9 reference repos

```json
{ "silent": false }
```

Makes GitHub API requests. Returns `{ updatedRepos, perCategoryUpdates, lastSync }`.
Each category update includes: `repo`, `sha`, `desc`, `userImpact`, `capabilities[]`.

Tracked repos: HyperFrames, lemo-opuscar, OneTake, gbro-collage-broll, remotion-dev/skills,
earshot, ClaudeAnimationBase, claude-remotion-skill, ffmpeg-skill.

### check_upstream_updates — Fast offline manifest read

```json
{}
```

No network requests — reads the local manifest only. Returns:
```json
{
  "lastSync": "2026-11-11T20:00:00Z",
  "manifestVersion": "2.7.11",
  "totalRepos": 11,
  "syncedCount": 11,
  "repos": [
    {
      "id": "hyperframes",
      "repo": "heygen-com/hyperframes",
      "category": "compositor",
      "sha": "a1b2c3d",
      "lastChecked": "...",
      "userImpact": "New compositor patterns or GSAP animation primitives available"
    }
  ],
  "hint": "Run sync_upstream_skills to fetch latest commits from GitHub."
}
```

Call this to show users their current sync status without making any API calls.

---

## Calling from any IDE

Any IDE that supports MCP calls these tools via JSON-RPC:

```json
POST http://localhost:3210
{
  "method": "tools/call",
  "params": {
    "name": "create_video_from_script",
    "arguments": { "scenes": [...] }
  },
  "id": 1
}
```
