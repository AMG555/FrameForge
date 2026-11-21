# Multi-Agent Workspace Instructions — FrameForge

This workspace equips agents with complete video production, procedural motion graphics, automated QA, and reverse engineering capabilities.

---

## ⚠️ ZERO AI IMAGES RULE (CODE-DRIVEN FIRST)
- **NEVER generate AI images from the beginning.**
- **Always default to FrameForge's code-driven animation tools**: 108 procedural motion styles (`list_motion_styles`, `get_motion_style_prompt`), 6 viral faceless shorts engines, Playwright canvas rendering, and kinetic typography.
- **DO NOT call AI image generation or generate diffusion pictures** unless the user explicitly prompts: "generate AI images" or "use AI image generation".

---

## 🚫 ZERO SCENE NUMBERS & ZERO UI CHROME RULE
- **NEVER render scene numbers, slide numbers, or progress counters anywhere** (e.g. NO "01 / 26", NO "1/10", NO "Scene 1", NO "Chapter 2", NO "01/04").
- **NEVER render video player status, loading spinners, buffering arcs, timeline scrub bars, playback progress lines, or duration timers** at the top, bottom, or center. This is a broadcast video, NOT a video player UI.
- **NEVER render top headers or bottom footer metadata watermarks** (e.g. NO corner topic titles, NO "MALAYALAM EXPLAINER", NO "SATELLITE: NASA / BOUNDARY: DATAMEET", NO citation stamps, NO fake UI chrome). Clean, broadcast-grade graphics only.

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

## Workspace Skills Hierarchy

1. **Procedural Motion Graphics & Animation:**
   - `motion-styles`: 108 styles scraped from `FrameForge Motion Library`. Full reference sources in `plugins/motion-styles/sources/`, ready-to-copy prompts in `plugins/motion-styles/prompts/`.
   - `cinematic`: Classic Japanese feature animation (watercolor/gouache hand-painted backgrounds, tapered ink lines, cel shading, wind physics, and procedural audiolib sound).
   - `animation`: 3D Storybook and Explainer animation (Three.js toy-like world, rounded character rigs, mitten hands, cel shading with 3 light bands, thin dark outlines, Fraunces serif typography, and tactile audio).
   - `faceless-shorts`: 6 procedural 3D/2D vertical styles with Kokoro AI voice and word-level caption alignment.
   - `ai-video-editor`: Full talking-head editor with mistake cutting, local Whisper, and 7 canvas motion-graphics styles.
   - `html-renderer`: FrameForge time-based canvas engine with 12fps organic boil, camera springs, and audio ducking.

2. **Livestream & Broadcast Clipping:**
   - `stream-clipping`: Full autonomous clipping pipeline for livestreams, debates, podcasts, news feeds, and VODs (`clip_stream`, `discover_streams`).
   - `vod-capture`: Targeted VOD section download without full video muxing, or local OBS Replay Buffer triggers (`capture_vod`, `obs_command`).
   - `clip-cut`: Reframe 16:9 to 9:16 (blur backdrop for chyrons, face-tracked crop, vertical stack) or 16:9 landscape with HarfBuzz libass subtitles and titlecards (`cut_and_reframe_clip`).
   - `clip-validate`: Automated multi-point QA gate asserting duration, streams, resolution, and audio volume (`validate_clip`).

3. **Quality & Engineering Automation (gstack):**
   - Use `gstack-review` and `gstack-qa` to verify code integrity and render pipelines.
   - Use `gstack-design-review` to inspect visual motion graphics, contrast, layout, and mobile safe zones.
   - Use `gstack-investigate` for systematic root-cause debugging of any pipeline failures.

4. **Reverse Engineering & Extraction (rea):**
   - Use `reverse-engineer-anything` and the `rea` MCP server to analyze external WebGL shaders, Three.js bundles, audio synthesis chains, and canvas effects to port them into FrameForge.

5. **FrameForge Core MCP Pipeline:**
   - 44 tools available via stdio (`src/mcp-server/stdio.js`) and HTTP (`src/mcp-server/server.js`).
   - Use `list_motion_styles` and `get_motion_style_prompt` for instant access to any of the 108 Motion graphics style prompts and codebases.

