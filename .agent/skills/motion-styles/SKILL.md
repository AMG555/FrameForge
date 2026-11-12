---
name: motion-styles
description: Complete library of 62 procedural motion-graphics styles in FrameForge. Every style is a full canvas animation with synthesized sound (SFX kit), pure function of time t, and zero AI diffusion/hallucination artifacts. Use when the user wants high-energy kinetic typography, 3D explainers, Zack D. Films style animations, infographics, chalkboard, UI walkthroughs, or retro motion graphics, or wants to copy prompts for any of the 62 Motion Graphics Styles.
---

# Motion Graphics Style Library (62 Styles)

Full library of **62 procedural motion-graphics styles** in FrameForge.
Each style is written entirely in code (HTML5 Canvas, Three.js, Web Audio SFX), deterministic as a function of time `t`, and requires zero AI image generation, zero diffusion artifacts, and zero API costs.

---

## What is in this Skill

1. **`catalog.json`**: Machine-readable catalog containing all 62 style schemas, sheet rules, sound design rules, size constraints, and font configurations.
2. **`sources/<styleId>.html`**: The complete, standalone, working reference HTML code for all 62 styles. Includes the full canvas compositor, math helpers, noise generators, and synthesized Web Audio sound kit.
3. **`prompts/<styleId>.md`**: Ready-to-copy prompts formatted for Claude/Gemini/GPT, with options for direct build, storyboard first, or word-level voiceover synchronization.
4. **`LIBRARY.md`**: Full searchable index grouped by family with direct links to prompt and source files.

---

## Families Breakdown (62 Styles)

| Family | Count | Description & Top Styles |
|---|---|---|
| **Kinetic Type** | 3 | High-energy creator edits (`creator-motion`, `clean-tech`, `swiss-grid`) |
| **Hand-Drawn** | 3 | Organic chalk and marker boards (`chalk-talk`, `marker-board`, `blueprint`) |
| **Screen and UI** | 1 | Pixel-perfect app tutorials and mockups (`software-walkthrough`) |
| **Data & Explainer** | 6 | Interactive charts, timelines, and tactics (`data-story`, `timeline-rail`, `isotype`, `math-canvas`, `tactics-board`, `market-tape`) |
| **Talking Head** | 1 | Calm editorial PiP canvas for real footage (`warm-canvas`) |
| **Illustrated** | 7 | Storybook, collage, comic, and maps (`pop-info`, `paper-craft`, `zine-collage`, `comic-panels`, `parchment-map`, `evidence-board`, `storybook`) |
| **3D & Spatial** | 14 | Procedural Three.js r128 worlds (`clay-diorama`, `bio-glow`, `cosmic-scale`, `exploded-view`, `low-poly-atlas`, `size-lineup`, `data-city`, `glass-icons`, `iso-cutaway`, `globe-arcs`, `physics-toybox`, `deep-layers`, `synth-grid`, `product-turntable`) |
| **Retro & Tech** | 2 | 8-bit games and cyber consoles (`pixel-quest`, `terminal`) |
| **Shorts Formats** | 10 | Viral vertical formats (`quiz-countdown`, `top-5-countdown`, `tier-list`, `chat-story`, `versus-split`, `myth-or-fact`, `recipe-steps`, `quote-cinema`, `breaking-desk`, `podcast-clip`) |
| **Edit Overlays** | 10 | Punch captions, badges, splitters, lower thirds (`punch-captions`, `karaoke-subs`, `callout-kit`, `lower-thirds`, `headline-backdrop`, `stack-split`, `sticker-pop`, `glitch-pack`, `doc-cinema`, `vhs-camcorder`) |
| **Character Stories** | 5 | Shadow puppets, rubber hose cartoons, visual novel (`shadow-puppets`, `visual-novel`, `rubber-hose-reel`, `woodcut-tale`, `neon-line`) |

---

## MCP Tools in FrameForge

FrameForge provides native MCP tools for this library:

- **`list_motion_styles`**: List all 62 styles or filter by family (`Kinetic Type`, `3D`, `Shorts Format`, etc.).
- **`get_motion_style_prompt`**: Retrieve the ready-to-copy Claude/agent prompt for any style by `styleId`, with optional `topic`, `mode` (`'standard'` or `'vo'`), `storyboard` flag, and `includeSource` flag.

```json
// Example: List all 3D styles
list_motion_styles({ "family": "3D" })

// Example: Get full prompt with voiceover sync and custom topic
get_motion_style_prompt({
  "styleId": "creator-motion",
  "topic": "How to scale an AI startup from 0 to 10k users in 30 days",
  "mode": "vo"
})
```

---

## How to Build a Video with a Motion Style

1. **Pick a Style**: Find the style ID in `plugins/motion-styles/LIBRARY.md` or via `list_motion_styles`.
2. **Review Reference Code**: Look at `plugins/motion-styles/sources/<styleId>.html`.
3. **Copy or Inject Prompt**: Read `plugins/motion-styles/prompts/<styleId>.md` or call `get_motion_style_prompt`.
4. **Scaffold or Render in FrameForge**:
   - For vertical reels: `orientation: "portrait"`, canvas `1080x1920` (or `720x1280`).
   - For landscape explainers: `orientation: "landscape"`, canvas `1920x1080` (or `1280x720`).
   - FrameForge executes the animation deterministically using Playwright, records frame-by-frame canvas images, renders the SFX audio via Web Audio / numpy, and encodes broadcast-compliant MP4 with FFmpeg.

