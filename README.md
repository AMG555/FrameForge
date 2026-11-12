<div align="center">

# ⚡ FrameForge

### The Universal AI Video Creation & Autonomous Editing Engine for Any Agent

**Enable ANY AI agent — terminal bots, autonomous swarms, scripts, or IDEs — to generate broadcast-quality videos and edit raw footage with a single npm command.**

[![npm version](https://img.shields.io/npm/v/@amg555/frameforge-mcp.svg?style=flat-square&color=007acc)](https://www.npmjs.com/package/@amg555/frameforge-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/)
[![MCP Spec](https://img.shields.io/badge/MCP-2024--11--05-blue.svg?style=flat-square)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/tests-661%20passing-brightgreen.svg?style=flat-square)](docs/collaboration.md)
[![Structural Gates](https://img.shields.io/badge/validation-113%20passed-success.svg?style=flat-square)](docs/collaboration.md)

[Quickstart](#quickstart) • [100% Free Path (Arena.ai)](#free-arena) • [Two Superpowers](#superpowers) • [Motion Styles](#styles) • [Faceless Shorts](#shorts) • [34 MCP Tools](#tools) • [Collaboration Guide](docs/collaboration.md)

</div>

---

<a id="what-is-frameforge"></a>
## 💡 What is FrameForge?

**FrameForge** is an open-source local video engine and **Model Context Protocol (MCP)** server that equips **any AI agent** with two complete superpowers:

1. **Autonomous Video Creation:** Generates full 1080p landscape videos and 9:16 vertical shorts from a single prompt or script.
2. **Autonomous Video Editing:** Ingests raw video/audio footage, automatically cuts silences, removes bad takes/mistakes, injects kinetic captions & B-roll, and exports polished videos or NLE timelines.

**100% Free & Local:** Runs on your machine with free offline neural voices and deterministic code-drawn graphics. Zero cloud render costs, zero GPU subscriptions, zero AI hallucinations. FrameForge defaults strictly to code-driven procedural animation — zero AI images generated unless explicitly requested.

---

<a id="quickstart"></a>
## ⚡ Quickstart: Give This 1 Prompt to Your AI Agent

No manual downloading or complex configuration needed. FrameForge auto-provisions all runtime tools (FFmpeg, neural TTS voices, Chromium browser engine) automatically.

Simply copy and paste this single prompt to your agent (Claude Code, Cursor, Windsurf, or any terminal agent):

> **"Set up FrameForge MCP from npm package `@amg555/frameforge-mcp` so you have video creation and editing tools, and verify dependencies are ready."**

Your agent configures MCP and verifies everything on its own.
*(Want to configure JSON files manually? See the [Manual MCP Setup Guide](docs/mcp-setup.md).)*

---

### Now Ask Your Agent to Create or Edit:
* **To Create:** *"Make a 45-second vertical reel explaining how GPS triangulation works with bold kinetic captions and sound effects."*
* **To Edit:** *"Edit my recording raw.mp4: cut all silences and retakes, add kinetic subtitle cards, and export the final video."*

> 💡 **Style Tip:** You can specify any of our [62 Motion Styles](plugins/motion-styles/LIBRARY.md) directly in your prompt (e.g. *"in `creator-motion` style"* or *"in `deep-dive` 3D style"*). If you don't name a style, your agent will automatically pick the best-fitting style for your topic!

---

<a id="free-arena"></a>
## 🆓 Pro-Tip: 100% Free Code-Based Video Generation (Zero Subscriptions)

### Make Broadcast-Quality AI Videos for $0 with Free Agent Platforms (Arena.ai & Web Agents)

You do **NOT** need expensive AI subscriptions or cloud GPU rentals to build stunning videos. **[arena.ai](https://arena.ai)** is a public platform featuring free autonomous agents and frontier AI capabilities for testing. Anyone can use the free agent on **[arena.ai](https://arena.ai)** (or any other free web agent, or budget-friendly agent options) to generate complete video code for $0:

📱 **Works Everywhere — Even on Mobile Phones:** You can use the free agent on `arena.ai` directly inside your iPhone or Android browser on the go. Generate full video animations anywhere, then render the master video with our single `npm` command!

```
 ┌───────────────────────────┐      ┌─────────────────────────────┐      ┌─────────────────────────────┐
 │   1. Pick Motion Style    │ ───► │ 2. Generate on arena.ai     │ ───► │    3. Render Free with npm  │
 │   62 Procedural Styles    │      │ Free web agent (or mobile)  │      │    npx @amg555/frameforge   │
 │   Ready-to-copy prompt    │      │ Pure standalone HTML5 code  │      │    1080p MP4 master ($0)    │
 └───────────────────────────┘      └─────────────────────────────┘      └─────────────────────────────┘
```

#### The 4-Step $0 Workflow:
1. **Choose a Style:** Pick any look from our [62 Procedural Motion Styles](plugins/motion-styles/LIBRARY.md) (e.g. `creator-motion`, `data-story`, `clean-tech`, `deep-dive`, `swiss-grid`).
2. **Grab the Prompt:** Open the style's prompt in [`plugins/motion-styles/prompts/`](plugins/motion-styles/prompts/) (e.g. [`creator-motion.md`](plugins/motion-styles/prompts/creator-motion.md)) and copy the prompt template.
3. **Generate Code with Free Agent (Desktop or Mobile Phone):** Open **[arena.ai](https://arena.ai)** in your browser (on PC or phone), select the free agent option, and paste the prompt + your topic (e.g. *"Explain how GPS triangulation works"*). The agent writes the complete HTML5 canvas / Three.js animation code. (You can also use any other free agent, or cheap low-cost agents if you have budget).
4. **Render Free with Our Single npm Package:** Save as `animation.html` and render into a crisp 1080p broadcast MP4 with one command (runs locally, on VPS, or in Android Termux):
   ```bash
   npx -y @amg555/frameforge-mcp frameforge-harness all --html ./animation.html --out final.mp4
   ```

#### Why Code-Based Video Beats Traditional AI Video:
* **Zero Cost ($0):** No subscriptions, no cloud rendering credits, no credit card required.
* **Mobile & Cross-Platform Friendly:** Access free agents on your smartphone in seconds via mobile browser, render anytime with our lightweight npm package.
* **100% Deterministic & Glitch-Free:** Every frame is a mathematical function of time `t`. Zero melting fingers, zero flickering backgrounds, zero random AI hallucinations.
* **True Broadcast Quality:** EBU R128 (−14 LUFS) audio mastering, procedural Web Audio SFX kits, spring physics, and organic boil.
* **Universal Search Tags (SEO):** Free code based video generation • free agent video creation • mobile AI video maker • free AI video creation without subscription • open-source text-to-video without API key • arena.ai free video agent • zero-subscription AI video editor • free alternative to Runway, Sora, HeyGen, Pika, and Remotion.

---

<a id="superpowers"></a>
## 🎬 Two Agent Superpowers: Creation & Editing

```
                                  Your AI Agent
                    (Claude Code / Cursor / Windsurf / Swarms)
                                       │
                      npx -y @amg555/frameforge-mcp
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     SUPERPOWER 1: CREATION                        SUPERPOWER 2: EDITING
  • Ideas/Scripts → Final MP4                   • Raw Footage → Polished Cut
  • 62 Procedural Motion Styles                 • Auto-cut speech pauses & silences
  • 6 Viral Faceless Shorts Engines             • Remove false starts & mistake retakes
  • Playwright time-based canvas (pure t)       • Kinetic captions, B-roll, color grading
  • Free offline voices (edge-tts)              • Export to DaVinci Resolve / Premiere
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       ▼
                     Broadcast Master MP4 (EBU R128 −14 LUFS)
```

### Superpower 1: Autonomous Video Creation
* **Agent-Scripted Flow (`create_video_from_script`):** Agent writes scene cards; FrameForge synthesizes voice, renders kinetic vector cards, ducks background audio, and encodes 1080p MP4s. No API keys required.
* **Code-Driven Canvas Animation (`render_animation`):** Every frame is a mathematical function of time `t`. Zero random jitter inside the render loop, 12fps organic boil, spring camera physics, and word-accurate cue triggers (`cuePhrase()`).
* **Viral Short Automation:** Auto-generates 9:16 vertical reels with word-synced subtitles for TikTok, YouTube Shorts, and Instagram Reels.

### Superpower 2: Autonomous Video Editing
* **Silence & Pause Cutting:** Automatically detects audio lulls using local Whisper energy levels and slices dead air with configurable pacing (natural 0.3s vs tight 0.15s).
* **Mistake & Retake Removal:** Detects false starts, repeated lines, slips, and *"wait let me re-do that"* phrases via word-level transcripts and cleanly slices out bad takes.
* **Automated Motion Overlays:** Injects motion graphics cards, lower thirds, callouts, and browser mockups on top of raw footage.
* **J-Cuts / L-Cuts & Audio Mixing:** Automatically overlaps audio transitions for cinematic flow, normalizes to EBU R128 (−14 LUFS), and ducks background beds under spoken words.
* **Export to Professional Editors (`export_to_editor`):** Generates timeline files for **DaVinci Resolve** (FCPXML/EDL), **Premiere Pro**, **After Effects**, **Remotion**, or **CapCut**.

---

<a id="styles"></a>
## 🎨 62 Procedural Motion-Graphics Styles

FrameForge bundles **62 code-drawn motion-graphics styles** covering every content genre. Every style runs entirely in code on HTML5 Canvas / Three.js r128 with synthesized Web Audio sound kits — zero AI image generation, zero diffusion artifacts.

Full catalog and ready-to-copy prompts in [`plugins/motion-styles/LIBRARY.md`](plugins/motion-styles/LIBRARY.md).

| Family | Count | Popular Styles | Best For |
|---|---|---|---|
| **Kinetic Type** | 3 | `creator-motion`, `clean-tech`, `swiss-grid` | Creator edits, business hooks, high-energy reels |
| **Hand-Drawn** | 3 | `chalk-talk`, `marker-board`, `blueprint` | Whiteboard explainers, education, technical breakdown |
| **Screen & UI** | 1 | `software-walkthrough` | App demos, SaaS onboarding, feature tutorials |
| **Data & Explainer** | 6 | `data-story`, `timeline-rail`, `isotype`, `math-canvas` | Charts, market statistics, financial trends |
| **Talking Head** | 1 | `warm-canvas` | Editorial PiP cards over creator webcam footage |
| **Illustrated** | 7 | `pop-info`, `paper-craft`, `zine-collage`, `comic-panels` | Infographics, book summaries, narrative stories |
| **3D & Spatial** | 14 | `clay-diorama`, `bio-glow`, `cosmic-scale`, `exploded-view` | Procedural Three.js 3D models, science, anatomy |
| **Retro & Tech** | 2 | `pixel-quest`, `terminal` | 8-bit gaming, developer logs, cyber consoles |
| **Shorts Formats** | 10 | `quiz-countdown`, `top-5-countdown`, `tier-list`, `versus-split` | Viral TikTok, Instagram Reels, YouTube Shorts |
| **Edit Overlays** | 10 | `punch-captions`, `karaoke-subs`, `callout-kit`, `lower-thirds` | B-roll overlays, subtitle pops, motion badges |
| **Character Stories** | 5 | `shadow-puppets`, `visual-novel`, `rubber-hose-reel` | Vector character animation, lore, folklore |

---

<a id="shorts"></a>
## 📱 Viral Faceless Shorts Engine

FrameForge includes specialized turnkey engines for vertical short-form automation (YouTube Shorts, TikTok, Instagram Reels) in [`plugins/faceless-shorts/`](plugins/faceless-shorts/):

* **Deep Dive 3D (`deep-dive`):** Zack D. Films style 3D science and anatomy explainers. Sculpted procedural human forms, glowing biological x-rays, and camera tracks.
* **Night File 3D (`night-file`):** Unsolved mysteries and true-crime cases. Noir lighting, typewriter evidence cards, and crimson subject highlights.
* **Inside Out (`inside-out`):** 2D x-ray biology and object cutaway explainers with high-contrast subtitle blocks.
* **Stick Story (`stick-story`):** Expressive stick-figure survival steps, obstacle navigation, and gold step cards.
* **Paper Atlas (`paper-atlas`):** Historical events mapped on weathered parchment, animated campaign routes, and wax seals.
* **Tall Tale 3D (`tall-tale`):** Humorous true stories with stylized 2D cartoon characters moving through a 3D procedural world.

---

<a id="tools"></a>
## 🛠️ 34 MCP Tools Reference

FrameForge registers **34 tools** compliant with the Model Context Protocol (MCP 2024-11-05 spec):

| Category | Tools (All 34 Listed) | Capabilities |
|---|---|---|
| **Video Creation (7)** | `create_video_from_script`, `assemble_video`, `render_from_scenes`, `edit_scenes`, `ingest_media`, `publish_video`, `generate_scene_image` | Full video assembly, scenes manifest, caption burning, scene graphics export |
| **Autonomous Editing (5)** | `edit_video`, `plan_video_edit`, `export_to_editor`, `detect_viral_clips`, `karaoke_subtitles` | Silence & retake cutting, viral hook scoring, kinetic subs, NLE export (DaVinci/Premiere) |
| **Motion Styles (2)** | `list_motion_styles`, `get_motion_style_prompt` | Catalog browse & prompt generation across 62 procedural styles |
| **Faceless Shorts (2)** | `list_short_styles`, `create_short` | 6 vertical formats (Zack D. 3D, true crime noir, stick figure, paper atlas) |
| **Code Animation (6)** | `scaffold_animation_project`, `validate_storyboard`, `generate_scene_code`, `preview_scene`, `render_animation`, `verify_scene_quality` | Playwright canvas rendering, 12fps organic boil, closed-loop visual QA |
| **Audio Mastering (3)** | `mix_audio_pro`, `render_tts`, `multi_voice_tts` | EBU R128 (−14 LUFS) broadcast mastering, ducking, 13-type SFX kit |
| **Media & Speech (2)** | `ingest_url`, `transcribe_media` | Fast yt-dlp downloader & local Whisper word-level transcription |
| **Research & Queue (4)** | `research_topic`, `write_script`, `queue_full_pipeline`, `get_job_status` | Deep claim extraction, fact-checking, script generation, async worker |
| **Upstream & Bridges (3)** | `sync_upstream_skills`, `check_upstream_updates`, `external_platform_call` | Technique sync from 9 frontier video repos & cloud provider bridges |

---

## 💻 Direct CLI Usage (Optional)

You can also use FrameForge straight from your terminal without an agent:

```bash
# Ingest any media from the web
npx -y @amg555/frameforge-mcp frameforge download "https://youtube.com/watch?v=..." --subtitles

# Transcribe speech with word-level timestamps via local Whisper
npx -y @amg555/frameforge-mcp frameforge transcribe ./recording.mp3 --format all

# Run interactive diagnostics check
npx -y @amg555/frameforge-mcp frameforge doctor
```

---

## 🤝 Collaboration, Architecture & Security

Looking for system architecture diagrams, security invariants, contributor workflows, or quality assurance gates?

👉 **Read the [Collaboration & Engineering Guide](docs/collaboration.md)**:
* **Architecture & Deployment:** Stdio, HTTP server, and Cloudflare Remote Workers.
* **Security Invariants:** Constant-time auth comparisons, SSRF blocklists, path traversal protection, credential redaction.
* **7-Gate Broadcast QC Standard:** Audio LUFS discipline, peak ceilings, and stream validation.
* **Upstream Synchronization:** Continuous tracking of 9 frontier video repositories.
* **Testing:** Automated test suite (661 tests) and structural validator (113 checks).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details. Built for creators and autonomous agents pushing the frontier of video production.
