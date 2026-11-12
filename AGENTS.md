# Multi-Agent Workspace Instructions — FrameForge

This workspace equips agents with complete video production, procedural motion graphics, automated QA, and reverse engineering capabilities.

---

## ⚠️ ZERO AI IMAGES RULE (CODE-DRIVEN FIRST)
- **NEVER generate AI images from the beginning.**
- **Always default to FrameForge's code-driven animation tools**: 62 procedural motion styles (`list_motion_styles`, `get_motion_style_prompt`), 6 viral faceless shorts engines, Playwright canvas rendering, and kinetic typography.
- **DO NOT call AI image generation or generate diffusion pictures** unless the user explicitly prompts: "generate AI images" or "use AI image generation".

---

## Workspace Skills Hierarchy

1. **Procedural Motion Graphics:**
   - `motion-styles`: 62 styles scraped from `FrameForge Motion Library`. Full reference sources in `plugins/motion-styles/sources/`, ready-to-copy prompts in `plugins/motion-styles/prompts/`.
   - `faceless-shorts`: 6 procedural 3D/2D vertical styles with Kokoro AI voice and word-level caption alignment.
   - `ai-video-editor`: Full talking-head editor with mistake cutting, local Whisper, and 7 canvas motion-graphics styles.
   - `html-renderer`: FrameForge time-based canvas engine with 12fps organic boil, camera springs, and audio ducking.

2. **Quality & Engineering Automation (gstack):**
   - Use `gstack-review` and `gstack-qa` to verify code integrity and render pipelines.
   - Use `gstack-design-review` to inspect visual motion graphics, contrast, layout, and mobile safe zones.
   - Use `gstack-investigate` for systematic root-cause debugging of any pipeline failures.

3. **Reverse Engineering & Extraction (rea):**
   - Use `reverse-engineer-anything` and the `rea` MCP server to analyze external WebGL shaders, Three.js bundles, audio synthesis chains, and canvas effects to port them into FrameForge.

4. **FrameForge Core MCP Pipeline:**
   - 34 tools available via stdio (`src/mcp-server/stdio.js`) and HTTP (`src/mcp-server/server.js`).
   - Use `list_motion_styles` and `get_motion_style_prompt` for instant access to any of the 62 Motion graphics style prompts and codebases.

