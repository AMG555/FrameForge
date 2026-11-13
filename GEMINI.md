# FrameForge — Agent & Skills Activation Guide

This project is configured with full agent skills, multi-engine video rendering, and reverse engineering tools.

---

## ⚠️ ZERO AI IMAGES RULE (CODE-DRIVEN FIRST)
- **NEVER generate AI images from the beginning.**
- **Always default to FrameForge's code-driven animation tools**: 62 procedural motion styles (`list_motion_styles`, `get_motion_style_prompt`), 6 viral faceless shorts engines, Playwright canvas rendering, and kinetic typography.
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
  - **Story / History / Context**: `chalk-talk`, `doc-cinema`, or `cinematic_documentary`
  - **Climax / Outro**: `creator-motion`, `minimal_luxury`, or `cosmic_space`
- Even if the user doesn't specify a style name, the agent MUST automatically assign the best matching motion style to each scene.

---

## Active Skills in this Workspace

### 1. `motion-styles` — 62 Motion-Graphics Styles
- **Source:** Scraped directly from [FrameForge Motion Library](FrameForge Motion Library).
- **Location:** `.agent/skills/motion-styles/` and `plugins/motion-styles/`
- **Catalog:** `plugins/motion-styles/catalog.json` (all 62 styles with sheet rules, sound design rules, size rules, and prompt metadata).
- **Reference Code:** `plugins/motion-styles/sources/<styleId>.html` (complete standalone working HTML files with canvas animation, Three.js shaders, math helpers, and synthesized Web Audio SFX).
- **Ready-to-Copy Prompts:** `plugins/motion-styles/prompts/<styleId>.md` (standard direct prompts + voiceover/storyboard prompts).
- **Catalog Index:** `plugins/motion-styles/LIBRARY.md`
- **MCP Tools:**
  - `list_motion_styles`: Browse by family (Kinetic Type, Hand-Drawn, Screen and UI, Data, Talking Head, Illustrated, 3D, Retro, Shorts Format, Edit Overlay, Character Story).
  - `get_motion_style_prompt`: Fetch the full prompt for any style, with optional topic, voiceover timing mode (`mode: "vo"`), storyboard-first (`storyboard: true`), and embedded source code (`includeSource: true`).

### 2. `ai-video-editor` — Talking Head Video Editor
- **Location:** `.agent/skills/ai-video-editor/` and `plugins/ai-video-editor/`
- **Engine:** Whisper (faster-whisper) + FFmpeg + Chromium canvas compositor.
- **Workflow:** Cuts silences, removes retakes/mistakes, applies motion graphics in 7 styles (Warm Canvas, Creator Motion Graphics, Clean Tech, Software Walkthrough, Data Story, Chalk Talk, Pop Info), normalizes loudness, renders final MP4.

### 3. `faceless-shorts` — Viral Vertical Video Engine
- **Location:** `.agent/skills/faceless-shorts/` and `plugins/faceless-shorts/`
- **Engine:** Kokoro local AI voice + Whisper word-level timing + 3D/2D procedural canvas + FFmpeg.
- **Styles:** Deep Dive 3D (Zack D. Films style), Night File 3D (true crime/mystery), Inside Out (2D x-ray), Stick Story (survival steps), Paper Atlas (historical cut paper), Tall Tale 3D (cartoon 3D storytime).

### 4. `video-pipeline` & `html-renderer` — FrameForge Native Engines
- **Location:** `.agent/skills/video-pipeline/` and `.agent/skills/html-renderer/`
- **Capabilities:** 34 MCP tools covering end-to-end video synthesis, TTS, audio mastering (`mix_audio_pro`), scene quality verification, and Playwright code animation.

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

---

## Quick Reference Commands

- Pre-flight checks: `npm run doctor`
- Run test suite: `npm test`
- Structural validator: `npm run validate`
- Browse Motion styles: Call MCP `list_motion_styles` or inspect `plugins/motion-styles/LIBRARY.md`
- Retrieve style prompt: Call MCP `get_motion_style_prompt({ styleId: "creator-motion", topic: "..." })`

