# AI Insight Shorts: a free AI skill for faceless Shorts

Based on the free **Faceless Shorts** skill by **Motion Graphics** (youtube.com · FrameForge Motion Library): all styles, engine and scripts are theirs.
This version adds Malayalam voice and captions, OpenCode install steps and tips, by **AI Insight Spot** (YouTube).

Narrated faceless shorts (YouTube Shorts, TikTok, Reels) made 100% in code on your own computer: script, AI voice,
word-synced captions, animation, sound effects and music, rendered to MP4. No AI video, no API keys, no credits.

**Styles** (each has a style sheet, a style guide and a finished example video project)
1. **Deep Dive 3D** (flagship): Zack D. Films-like 3D "What happens if…?" explainers. Example: *What happens if you hold your breath?*
2. **Night File 3D**: unsolved mysteries and true crime in dark 3D rooms. Example: *The man who jumped out of a plane* (D.B. Cooper).
3. **Inside Out**: flat 2D x-ray explainers. Example: *What if you swallow gum?*
4. **Stick Story**: stick-figure survival steps. Example: *What if the power went out for 3 days?*
5. **Paper Atlas**: history in cut paper and maps. Example: *How one bakery burned down London*.
6. **Tall Tale 3D**: funny true stories, flat 2D cartoon people in a sunny 3D world. Example: *The girl who was mailed to grandma*.

**How it works**
script.json → Kokoro voice (local, free) → Whisper word timings (local, free) → shots drawn in code, each cut and caption
placed on its word → procedural sound + music → headless Chrome captures every frame → ffmpeg renders the MP4.
Claude checks a contact sheet of the whole video before you ever see it.
Optional: when you ask, Claude uploads the finished short to your YouTube channel through Zapier (it confirms title, visibility and category first).

**Needs:** OpenCode, Claude Code or Claude with a linked computer, Node.js 22+, ffmpeg, Google Chrome, Python 3.10+, ~1 GB for the
voice and Whisper models. Claude installs what's missing.

**Windows:** run the scripts in Git Bash (installed with Git for Windows; Claude Code uses it already).

**Install (OpenCode):** drag this zip, still zipped, into the OpenCode chat and type "Install this skill".

**Install (Claude Code):** put this folder at `~/.claude/skills/aiinsight-shorts/`, then run `bash scripts/setup.sh` (prints "All set")
and `bash scripts/selftest.sh` (prints "SELFTEST PASSED"). Start a new session and ask:
"Make a Deep Dive 3D short: what happens if you crack your knuckles?"

**Layout:** `SKILL.md` (what Claude follows) · `scripts/` (setup, selftest, new_video, voice, words, estimate) ·
`styles/<style>/` (`style-sheet.png`, `STYLE.md`, `example/` = a complete project that renders as-is).

**Licenses:** the code, stories, drawings and sound are original and free to use in your videos. Inter font: SIL Open Font
License 1.1. Installed on first use: Kokoro-82M (Apache-2.0) via kokoro-onnx (MIT), faster-whisper + Whisper small.en (MIT),
numpy, scipy.

**Languages:** English (free local voice, US or UK accents) and **Malayalam** (Microsoft Edge's free Malayalam voices, male or female, via edge-tts; needs the internet while the voice is made). Malayalam captions use your computer's Malayalam font.

**Tips from AI Insight Spot:** set the model's Effort Level to High (Max drains free limits fast), make one Short a day on free plans, and always upload as Unlisted, then check it in YouTube Studio before making it public.
