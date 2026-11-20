# FrameForge — Agent & Skills Activation Guide

This project is configured with full agent skills, multi-engine video rendering, and reverse engineering tools.

---

## ⚠️ ZERO AI IMAGES RULE (CODE-DRIVEN FIRST)
- **NEVER generate AI images from the beginning.**
- **Always default to FrameForge's code-driven animation tools**: 104 procedural motion styles (`list_motion_styles`, `get_motion_style_prompt`), 6 viral faceless shorts engines, Playwright canvas rendering, and kinetic typography.
- **DO NOT call AI image generation or generate diffusion pictures** unless the user explicitly prompts: "generate AI images" or "use AI image generation".

---

## 🎭 DYNAMIC PER-SCENE STYLE RULE (MULTI-STYLE VIDEOS)
- **NEVER render an entire video with a single flat or monotonous style.**
- When generating scripts or calling `create_video_from_script`, assign an appropriate `style` to each scene matching its narrative role:
  - **Hook / Opener**: `creator-motion`, `headline-backdrop`, `punch-captions`, or `breaking-desk`
  - **Concept / Architecture / Logic**: `clean-tech`, `swiss-grid`, or `cyber_tech`
  - **Data / Stats / Metrics**: `data-story`, `finance_executive`, or `chart`
  - **Comparisons / Dilemma**: `versus-split` or `versus_comparison`
  - **Processes / Step-by-Step**: `process_pipeline` or `tactics-board`
  - **Deep Dive / Mechanism**: `deep-dive`, `mechanism_physics`, or `magnification_focus`
  - **Story / History / Context**: `chalk-talk`, `doc-cinema`, `cinematic-anime`, or `cinematic_documentary`
  - **Explainer / Whimsical Tale**: `storybook-3d`, `clean-tech`, or `minimal_luxury`
  - **Climax / Outro**: `creator-motion`, `minimal_luxury`, or `cosmic_space`
- Even if the user doesn't specify a style name, the agent MUST automatically assign the best matching motion style to each scene.

---

## Active Skills in this Workspace

### 1. `motion-styles` — 104 Motion-Graphics Styles
- **Source:** Scraped directly from [FrameForge Motion Library](FrameForge Motion Library).
- **Location:** `.agent/skills/motion-styles/` and `plugins/motion-styles/`
- **Catalog:** `plugins/motion-styles/catalog.json` (all 104 styles with sheet rules, sound design rules, size rules, and prompt metadata).
- **Reference Code:** `plugins/motion-styles/sources/<styleId>.html` (complete standalone working HTML files with canvas animation, Three.js shaders, math helpers, and synthesized Web Audio SFX).
- **Ready-to-Copy Prompts:** `plugins/motion-styles/prompts/<styleId>.md` (standard direct prompts + voiceover/storyboard prompts).
- **Catalog Index:** `plugins/motion-styles/LIBRARY.md`
- **MCP Tools:**
  - `list_motion_styles`: Browse by family (Kinetic Type, Hand-Drawn, Screen and UI, Data, Talking Head, Illustrated, 3D, Retro, Shorts Format, Edit Overlay, Character Story).
  - `get_motion_style_prompt`: Fetch the full prompt for any style, with optional topic, voiceover timing mode (`mode: "vo"`), storyboard-first (`storyboard: true`), and embedded source code (`includeSource: true`).

### 2. `cinematic` — Classic Japanese Feature Animation
- **Location:** `.agent/skills/cinematic/` and `plugins/cinematic/`
- **Engine:** Pure 2D canvas procedural inking & watercolor painting engine with parallel Chromium/Playwright + FFmpeg rendering and Python audiolib sound synthesis.
- **Aesthetic:** Tapered sepia-black ink lines, watercolor/gouache sky dabs, cumulus clouds, cel shading with designed shadow shapes, paper tooth texture, and living secondary wind physics.

### 3. `animation` — 3D Storybook & Explainer Animation Engine
- **Location:** `.agent/skills/animation/` and `plugins/animation/`
- **Engine:** Three.js procedural toy world with deterministic time parameter `t`, toon cel shader (3 light bands), mitten-hand character rigs, Fraunces serif typography, and tactile procedural sound synthesis.
- **Workflow:** Solicits 4 intake parameters (Length, Topic, Style, Plan together vs straight to work), builds self-contained WebGL/HTML player, renders frame-accurate MP4 at -16 LUFS, and generates contact sheets for visual QA.

### 4. `ai-video-editor` — Talking Head Video Editor
- **Location:** `.agent/skills/ai-video-editor/` and `plugins/ai-video-editor/`
- **Engine:** Whisper (faster-whisper) + FFmpeg + Chromium canvas compositor.
- **Workflow:** Cuts silences, removes retakes/mistakes, applies motion graphics in 7 styles (Warm Canvas, Creator Motion Graphics, Clean Tech, Software Walkthrough, Data Story, Chalk Talk, Pop Info), normalizes loudness, renders final MP4.

### 5. `faceless-shorts` — Viral Vertical Video Engine
- **Location:** `.agent/skills/faceless-shorts/` and `plugins/faceless-shorts/`
- **Engine:** Kokoro local AI voice + Whisper word-level timing + 3D/2D procedural canvas + FFmpeg.
- **Styles:** Deep Dive 3D (), Night File 3D (true crime/mystery), Inside Out (2D x-ray), Stick Story (survival steps), Paper Atlas (historical cut paper), Tall Tale 3D (cartoon 3D storytime).

### 6. `video-pipeline` & `html-renderer` — FrameForge Native Engines
- **Location:** `.agent/skills/video-pipeline/` and `.agent/skills/html-renderer/`
- **Capabilities:** 37 MCP tools covering end-to-end video synthesis, TTS, audio mastering (`mix_audio_pro`), scene quality verification, and Playwright code animation.

### 5. `gstack` Suite — Automated QA, Review, & Engineering
- **Location:** `.agent/skills/gstack-*/`
- **Key Skills:**
  - `gstack-review` & `gstack-qa`: Automated code and behavioral test suites.
  - `gstack-design-review`: Visual QA for motion graphics, layout, spacing, and typography.
  - `gstack-investigate`: Root cause analysis for FFmpeg, audio mix, or render glitches.
  - `gstack-autoplan`: Multi-perspective engineering, design, and developer experience review.

### 6. `reverse-engineer-anything` (`rea`)
- **Location:** `.agent/skills/reverse-engineer-anything/`
- **MCP Server:** `rea`
- **Capabilities:** Reverse-engineer WebGL shaders, Three.js bundles, compiled media binaries, canvas render routines, and third-party motion graphics pipelines.

### 7. `stream-clipping` — Livestream & Broadcast Clipping Engine
- **Location:** `.agent/skills/stream-clipping/` and `plugins/stream-clipping/`
- **Capabilities:** Autonomous clipping for YouTube/Twitch/Kick livestreams, debates, podcasts, and broadcast news.
- **Sub-skills:** `vod-capture` (sliced download / OBS replay buffer), `clip-cut` (reframe to 9:16 or 16:9, libass subtitles, titlecards), `clip-validate` (strict QA gate).
- **Tools:** `clip_stream`, `capture_vod`, `score_stream_highlights`, `cut_and_reframe_clip`, `validate_clip`, `discover_streams`, `obs_command`.

---

## Quick Reference Commands

- Pre-flight checks: `npm run doctor`
- Run test suite: `npm test`
- Structural validator: `npm run validate`
- Browse Motion styles: Call MCP `list_motion_styles` or inspect `plugins/motion-styles/LIBRARY.md`
- Retrieve style prompt: Call MCP `get_motion_style_prompt({ styleId: "creator-motion", topic: "..." })`

