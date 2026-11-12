# Changelog

All notable changes to FrameForge are documented here.

---

## [2.7.7] — 2026-11-12

### Changed
- Slimmed npm tarball distribution: excluded `.agent/` cache and vendor artifacts via `.npmignore` (size reduced from 48MB to 28MB).
- Upgraded version manifests across core MCP server and sync engine to v2.7.7.

---

## [2.7.6] — 2026-11-12

### Added
- **Tools 33–34: `list_motion_styles` + `get_motion_style_prompt`** — catalog all 62 Motion Graphics Styles from FrameForge Motion Library, retrieve the full Claude prompt for any style by id.
- **`plugins/motion-styles/catalog.json`** — 62 Motion graphics style entries (id, name, family, look, how, fonts, demo, replace, keep, sizes, voLine, sheet, sound, full, voMix).
- **`plugins/faceless-shorts/`** — faceless-shorts v7 (YouTube upload via Zapier, updated aiinsight-shorts fork).
- **`plugins/ai-video-editor/`** — ai-video-editor v2 (7-style talking-head editor: Warm Canvas, Creator Motion Graphics, Clean Tech, Software Walkthrough, Data Story, Chalk Talk, Pop Info; Python/faster-whisper/Playwright pipeline).

### Fixed
- **Gradient-only output (critical)**: Root cause was a `ReferenceError` (`effectiveShowCaptions`/`effectiveShowAnchor` were in scope of `renderScene` but not passed into `_renderCodeAnimationScene`). The browser harness silently threw, fell through to the ffmpeg gradient fallback, producing plain color scenes on every render. Fixed in commit `8d2c41f` — all scenes now render as full-canvas animated HTML.
- **Portrait render crop**: `--width`/`--height` flags were missing from the harness `frames` subprocess call; portrait scenes defaulted to 1920×1080 landscape crop. Fixed.
- **SFX missing**: `sound_effects` collected in scenes but never wired through `assets.js → render.js → renderer.js → mixer.js`. Full pipeline now connected.

### Changed
- `package.json` version `2.7.5 → 2.7.6`, description updated to `34 MCP tools`.
- `SERVER_INFO.version` bumped to `2.7.6`.

---

## [2.7.4] — 2026-11-12

### Fixed
- **Direct Canvas DataURL Frame Extraction**: Implemented `window.renderAt(t, mime, q)` and synchronous `canvas.toDataURL()` extraction in `src/harness/lib/capture.mjs` and `src/video-renderer/scene-animator.js`. Completely avoids Chromium CDP `Page.captureScreenshot` compositor locks on Windows, eliminating frame capture crashes and timeouts.
- **Fixed Canvas State Matrix Drift**: Restored missing `ctx.restore()` in `src/video-renderer/scene-animator.js` (`doodle_map_migration`), keeping canvas transform stack depth strictly balanced at 0 across all render frames.
- **Eliminated Rotating Black Center Fallback Artifact**: Replaced harsh radial gradient with smooth linear ambient gradient and guaranteed title/caption text overlay in `src/video-renderer/renderer.js` fallback path.
- **Worker Concurrency & Reliability**: Added 3-attempt retry backoff and size validation in `src/harness/lib/jobs.mjs`. Set default worker concurrency to 2 to eliminate Windows paging file / RAM memory spikes.
- **Zero-Token Local Render Guarantee**: Confirmed zero LLM token consumption across all code-driven animation, media ingest, edit-only, and video assembly workflows.

---

## [2.7.3] — 2026-11-12

### Added
- **Scaffolding update**: `new-project.mjs` now imports `beatAt`, `snapToBeat`, `OM`, `ROOM_SFX`, `event`, `seg` in the generated `edit.js` template; copies `mix_audio_pro.py` into every new project; `npm run mix` uses the professional chain by default.
- **`orchestrator.md`** updated: step 10 now runs `mix_audio_pro.py --sfx-events` after `render.mjs full`, consuming `out/sfx-events.json` from `window.__events()` automatically.
- **`ANIMATION_GUIDE.md`** step 4 updated to `mix_audio_pro.py --sfx-events`.
- **`procedural-sfx.md`**: added `event()` / `window.__events()` usage examples.
- **4 new `deep-validate.js` checks** covering scaffolder import correctness and pro chain copy.
- **Full Reference Documentation for all 28 MCP Tools**: Complete parameter schemas and usage examples in `mcp-tools.md`.

### Changed
- `mix_audio_pro.py` v2.7.3 fully synced with `mixer.js`: 13-type SFX map, 5 room profiles, `PLATFORM_LUFS`, noise gate, mud notch, `sfx-events.json` auto-read, `computed:` room format.

### Fixed
- **Cloudflare Remote Worker alignment**: Synchronized tool count and server versioning.
- **Upstream sync User-Agent and pending update handling**: Cleaned up update caching and banner presentation across CLI and MCP endpoints.

---

## [2.7.4] — 2026-11-12

### Fixed
- **Direct Canvas DataURL Frame Extraction**: Implemented `window.renderAt(t, mime, q)` and synchronous `canvas.toDataURL()` extraction in `src/harness/lib/capture.mjs` and `src/video-renderer/scene-animator.js`. Completely avoids Chromium CDP `Page.captureScreenshot` compositor locks on Windows, eliminating frame capture crashes and timeouts.
- **Fixed Canvas State Matrix Drift**: Restored missing `ctx.restore()` in `src/video-renderer/scene-animator.js` (`doodle_map_migration`), keeping canvas transform stack depth strictly balanced at 0 across all render frames.
- **Eliminated Rotating Black Center Fallback Artifact**: Replaced harsh radial gradient with smooth linear ambient gradient and guaranteed title/caption text overlay in `src/video-renderer/renderer.js` fallback path.
- **Worker Concurrency & Reliability**: Added 3-attempt retry backoff and size validation in `src/harness/lib/jobs.mjs`. Set default worker concurrency to 2 to eliminate Windows paging file / RAM memory spikes.
- **Zero-Token Local Render Guarantee**: Confirmed zero LLM token consumption across all code-driven animation, media ingest, edit-only, and video assembly workflows.

---

## [2.7.3] — 2026-11-12

### Added
- **`mix_audio_pro.py` v2.7.3** — synced fully with `mixer.js` audio chain:
  - 13-type SFX map (was 5): all of whoosh/swish/impact/deep_boom/punch/pop/click/riser/chime/buzz/tick/sparkle/transition.
  - 5 named room profiles: `studio_dry`, `broadcast`, `cinematic`, `concert_hall`, `intimate`.
  - `PLATFORM_LUFS` presets: `--platform youtube|podcast|broadcast|netflix|instagram`.
  - Noise gate step: `--noise-gate` flag (agate -60dBFS).
  - Mud notch filter: -1.5dB @ 300Hz (acoustic pocket carving).
  - `--sfx-events` flag + `load_sfx_events()`: auto-reads `out/sfx-events.json` from `window.__events()` contract.
  - `computed:sizeM:damp:earlyMs` room format (Sabine RT60 approximation, earshot forgeComputedRoom parity).
  - 9 new `deep-validate.js` checks covering all of the above.
- **`procedural-sfx.md`** — updated `event()` usage examples showing `window.__events()` / `sfx-events.json` auto-pipeline.

---

## [2.7.1] — 2026-11-11

### Fixed
- **npm package size**: excluded `out/`, `output/`, `.bob/`, `src/harness/test/` from tarball — 7.8 MB → 430 KB (18× smaller).

---

## [2.7.0] — 2026-11-11

### Added

- **OM Motion Library — 24 moves** (`reel/engine.js`):
  - `beatAt(index, bpm, fps)` / `beatTime(index, bpm)` / `snapToBeat(t, bpm)` — HyperFrames beat-grid formula; each index rounded independently (never accumulated, eliminates drift).
  - `OM` object — 24 pure `(t, opts) → CSS style` motion primitives from OneTake's 39-move library: `spring`, `rise`, `iris`, `irisClose`, `zoomThrough`, `morphRect`, `silk`, `belt`, `ripple`, `odometer`, `camera`, `handheld`, `popOut`, `drop`, `implode`, `slideExit`, `wordByWord`, `scalePop`, `revealWipe`, `typewriter`, `counterFlip`, `breathe`, `float`, `pulseOpacity`, `carryScore`.
  - `ROOM_SFX` palette — OneTake 5-material standard (air/wood/glass/sub/bubble at −8 dBFS) for use with `cue()`.
  - `event(type, t, meta)` + `window.__events()` — Sound-from-composition contract; render.mjs extracts cues to `sfx-events.json` after probe.

- **Earshot Forge DSP Primitives** (`src/audio-mixer/mixer.js`):
  - `forgeModalResonator(freq, q, gainDb)` — FFmpeg EQ approximating physical material resonance (wood/glass/metal/sub frequency guidelines from earshot).
  - `forgeSVFilter(type, freq, q)` — State-variable filter: lp/hp/bp/notch.
  - `forgeComputedRoom(sizeM, damp, earlyMs)` — Computed room from physical dimensions using Sabine RT60 approximation; produces `aecho` filter string with 3-tap early reflections.
  - `forgeKitSoundBank(material, role)` — Maps earshot material + role to `SFX_FREQ_MAP` key.
  - `"computed:sizeM:damp:earlyMs"` room string supported in `mix_audio_pro` and `_buildVoiceChainFilter`.

- **J/L-Cut Editing in plan_video_edit** (`src/mcp-server/server.js`):
  - Style-aware cut type assignment: cinematic/documentary → J-cut; vintage/film_16mm/lofi_chill → L-cut; fast_paced/cyberpunk/anime_action → hard cut.
  - `audio_offset` field in every clip: negative = J-cut (audio precedes video by 0.25–0.5s), positive = L-cut (audio trails by 0.3s).
  - `cut_type` field in `edit.json` clips; emojis in `edit-plan.md` (🎵/🔊/✂️).
  - `bpm` param for beat-grid snapping of cut points.

- **TREATMENT.md Director Document** (`src/mcp-server/server.js` — `plan_video_edit`):
  - Auto-generated 8-section director treatment (lemo-opuscar DIRECTOR.md format): Concept, Tone, Visual Language, Sound, Narrative Arc, Shot List, Delivery, Director Notes.
  - `generate_treatment` param (default true); path returned in `treatmentPath`.

- **check_upstream_updates — Changelog Notice**:
  - Response now includes `pendingUpdates[]` with per-repo human-readable impact descriptions.
  - `hasUpdates` boolean field for agent routing.
  - `hint` field shows update count or next action.

- **Version Consistency Pass**:
  - All agent configs synced to v2.7.0: `cloudflare-mcp/src/index.js`, `scripts/deep-validate.js`, `plugins/video-pipeline/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `AGENT.md`, `README.md`, `mcp-tools.md`, `.github/copilot-instructions.md`, `.upstream-skills.json`.

---

## [2.6.0] — 2026-11-12

### Added

- **Unified Standalone CLI Commands** (`src/cli/make.js`):
  - `frameforge download <url>` — yt-dlp media ingestion with optional subtitles (`--subtitles`), audio extraction (`--audio`), output directory (`--out-dir`), and custom naming (`--filename`).
  - `frameforge transcribe <file>` — Whisper speech transcription exporting SRT, NDJSON, and JSON formats with model selection (`--model`) and language hints (`--language`).
  - `frameforge sync` / `frameforge update` — Upstream skills synchronizer checking all 9 frontier repos.
  - `frameforge doctor` and `frameforge setup` — First-class subcommand routing.
- **15+ Year Sound Engineer Signal Chain & Procedural Audio Engine** (`src/audio-mixer/mixer.js`):
  - Multi-element procedural SFX synthesis (shaped pink/white noise, sub-bass pitch drop, dual-sine chime harmonics, acoustic chord triads) replacing plain sine beeps across all 13 SFX types (`whoosh`, `swish`, `impact`, `deep_boom`, `punch`, `pop`, `click`, `tick`, `riser`, `chime`, `sparkle`, `buzz`, `transition`).
  - Enhanced voice mastering chain: 80Hz rumble cut, 300Hz boxy mud notch (-1.5dB), 5kHz presence boost (+2dB), 12kHz air shelf (+1.5dB), 3:1 broadcast compressor, 6.5kHz de-esser, and -60dBFS noise gate.
  - Acoustic pocket carving: 2.5kHz notch (-3.5dB) on music layer prevents vocal masking and guarantees intelligibility on mobile phone speakers.
  - Dynamic sidechain ducking (-18dB attenuation) with 40ms perceptual lead and musical release.
  - Video SFX mixing: `mixVideo` supports direct timeline SFX cue placement and two-pass EBU R128 loudness normalization.
- **`check_upstream_updates` MCP Tool (Tool #28)** (`src/mcp-server/server.js`):
  - Fast offline check of the last sync state across all 9 upstream reference repositories.
  - Automatic notification caching: users and agents are visibly notified on CLI doctor runs, make runs, and tool responses whenever upstream commits are updated.
- **Camera Motion & Punch-Ins in Video Editor** (`src/video-editor/editor.js`):
  - `editClip` and `editAndAssemble` support dynamic camera moves (`punch_in`, `zoom_in`, `ken_burns`, `slow_zoom_out`, `pan_left`, `pan_right`) using broadcast-grade zoompan filter expressions.
- **Frontier Craft Documentation References**:
  - `character-animation.md`: Complete ClaudeAnimationBase guide (31 emotions, timing principles, 12fps line boil).
  - `directing.md`: Professional directing method from lemo-opuscar (sound, rhythm, camera, staging).
  - `earshot-audio.md`: Professional 5-loop audio quality workflow and LUFS tables.
  - `hyperframes-motion.md`: Measured motion craft from HyperFrames launch films.
- **Tests & Quality**:
  - 100% test pass rate across 636 tests in 136 suites.

---

## [2.4.13] — 2026-11-12

### Added

- **HyperFrames Declarative Clips** (`engine.js`):
  - `.clip[data-start]` elements automatically participate in the timeline during `seek(t)` without manual JS registration.
  - Computes and binds `--lt` (local time in seconds), `--progress` ($0.0000 \to 1.0000$), `data-lt`, and `data-progress` dynamically.
- **OneTake Continuous Camera Choreography** (`engine.js`):
  - `cameraPath(waypoints, opts)`: Smooth continuous camera panning, zooming, and tilting across the `#stage` using cubic easing (`easeInOut`) without harsh cuts.
  - `cameraShake(t, opts)`: Deterministic organic handheld camera noise using 2D continuous simplex noise (`noise2D`).
- **ClaudeAnimationBase Mascot Vector Character** (`engine.js`):
  - `mascot(emotion, opts)`: Procedural SVG mascot character supporting 12 emotions (`happy`, `excited`, `thinking`, `confused`, `skeptical`, `surprised`, `alarmed`, `celebrating`, `proud`, `curious`, `sad`, `neutral`).
  - Includes 12fps line boil, eye blink cycle, and speech mouth flutter (`setSpeaking(true)`).
- **gbro-collage-broll Editorial Halftone Paper Collage** (`engine.js`):
  - `collageCard(content, opts)`: Paper collage card component featuring radial halftone dot pattern, washi tape accent strip, 2.5D perspective tilt, and drop shadow.
- **Viral Karaoke Captions** (`engine.js`):
  - Enhanced `captions()` and `_tickCaptions()` to split transcript segments into word tokens.
  - Spoken words pop with $1.14\times$ scale, glow shadow, and high-contrast highlight (`#facc15`).
- **Earshot Web Audio SFX Live Preview** (`engine.js`):
  - Real-time procedural audio synthesis in browser preview (`!window.__playwright`) for `cue()` sound triggers (`whoosh`, `impact`, `pop`, `click`, `riser`).
- **Lemo-Opuscar J-Cut and L-Cut Audio Splits** (`editor.js`):
  - `splitCut: 'j-cut' | 'l-cut'` support in `concatClipsWithTransitions` using asymmetric S-curve audio crossfades (`qsin` / `hsin`).
- **FFmpeg Concurrency & Memory Safety** (`editor.js`):
  - Constrained x264 encoding threads (`-threads 2`) across clip trimming and transition concatenation to prevent thread pool exhaustion and memory allocation failures.

### Tests & Validation

- Unit tests added for camera waypoints, camera shake, declarative clips, karaoke word formatting, and mascot emotion catalog in `engine.test.js`.
- J-cut transition assembly test added to `editor.test.js`.
- `deep-validate.js` updated to verify all frontier primitives and editor split cut capabilities.
- 100% test pass rate across 624 tests in 135 suites.

---

## [2.4.12] — 2026-11-11

### Added

- **`transcribe_media` MCP tool (Tool #25)** — Whisper speech transcription with word-level timestamps.
  - Supports `openai-whisper` (local GPU/CPU), `faster-whisper` (CTranslate2), `whisper-cli` binary, or `OPENAI_API_KEY` cloud fallback.
  - Output formats: `ndjson` (NDJSON for `engine.js captions()`/`cuePhrase()`), `srt` (standard subtitle file), `json` (full structured data), `all` (all three).
  - Returns silence/pause boundaries for intelligent cut alignment in `plan_video_edit`.
  - Install: `pip install openai-whisper` (local, free, no API key required).
- **`ingest_url` MCP tool (Tool #26)** — yt-dlp-powered media ingestion from any web URL.
  - Supports YouTube, Vimeo, Twitter/X, Instagram, TikTok, Twitch, SoundCloud, direct MP4/MP3 URLs, and 1000+ other sites.
  - Downloads up to 1080p MP4 (video) or MP3 (audio-only). Probes and returns `duration`, `width`, `height`.
  - Output goes to `.frameforge-files/downloads/` and can be passed directly to `edit_video`, `transcribe_media`, or any scene `video_path`/`audio_path`.
  - Install: `pip install yt-dlp` (or `winget install yt-dlp` on Windows).
- **`mix_audio_pro` MCP tool (Tool #27)** — Professional broadcast-grade audio post-production.
  - Full 10+ year sound engineer signal chain: 80Hz HPF → presence +2dB@5kHz → air shelf +1.5dB@12kHz → 3:1 compressor → de-esser @6.5kHz → optional room acoustics → sidechain duck (-18dB) → stereo widener (M/S 1.4x) → procedural SFX timeline → two-pass EBU R128 loudnorm.
  - Procedural SFX synthesis from the earshot pattern: `whoosh` (200Hz/400ms), `impact` (60Hz/500ms), `pop` (600Hz/120ms), `click` (2.5kHz/50ms), `riser` (100Hz/2s). All placed with 40ms perceptual lead.
  - `sfxCues: [{ name, time, volume }]` — millisecond-accurate placement, no sample files required.
  - `addReverb: true` — 30ms pre-delay + 0.3s RT60 aecho for cinematic narrator warmth.
  - `stereoWiden: true` — mid-side extrastereo 1.4x on music layer (voice stays mono-center).
  - `videoPath` parameter — mux the final mixed audio directly into a video file.
  - Returns `{ measuredLufs, measuredTp, passed, chain }` with full signal chain summary.
- **Professional AudioMixer upgrade** (`src/audio-mixer/mixer.js`):
  - `_buildVoiceChainFilter()` — unified voice chain: HPF + presence EQ + air shelf + compressor + de-esser.
  - `_twoPassNorm()` — two-pass EBU R128 loudnorm (measure + apply with measured values for linear accuracy).
  - `_synthesizeSfxCue()` — earshot-pattern procedural SFX synthesis with 40ms perceptual lead via FFmpeg lavfi.
  - `SFX_FREQ_MAP` and `PERCEPTUAL_LEAD_S` exported for consumers.
  - `mixWithDucking()` now accepts `{ addReverb, stereoWiden, sfxCues }` optional parameters.
  - `_sidechainMixPro()` — full pro chain replacing legacy `_sidechainMix()`.
  - Music band now filtered to 16kHz (up from 8kHz) and stereo-widened when `stereoWiden: true`.
  - Music attenuation updated from -15dB to -18dB for better voice intelligibility.
  - Backward-compatible: existing callers work unchanged.
- **`mix_audio_pro.py`** scaffold script (`plugins/...scripts/mix_audio_pro.py`) — standalone Python CLI with the same professional chain, usable from within HTML-renderer projects via `uv run scripts/mix_audio_pro.py`.
- **Upstream skills auto-notification** (`src/skills/sync-upstream.js`):
  - `sync_upstream_skills` MCP tool now returns `updatedRepos[]` and emits a visible user notice when any of the 9 tracked repositories has new commits.
  - Optional `SKILL_UPDATE_WEBHOOK_URL` env var — POSTs a JSON callback whenever upstream repos update.
  - Console output in non-silent mode now lists each updated repo and explains that techniques were automatically applied.
- **Expanded `procedural-sfx.md` reference** — added full professional voice chain documentation (10+ year rationale per stage), music bed mood matching table, and broadcast loudness standards reference (YouTube, Podcast, Netflix, EBU R128).

### Documentation
- **CLAUDE.md** — Updated tool count to 27, added `PROFESSIONAL AUDIO WORKFLOW` section covering Whisper transcription → cuePhrase sync, yt-dlp ingestion, `mix_audio_pro` call examples, and upstream skills auto-update workflow.

---

## [2.4.7] — 2026-11-11

### Added
- **`quality` mode in `render_animation` MCP tool** — Closed-loop visual QA gate (1–10 per-frame score, worst frames, motion delta) is now a first-class MCP mode. Returns `{ passed, overallScore, worstFrames, motionDelta }` structured directly on the tool response — the Opus 5.5 fix-loop entry point.
- **`golden` mode in `render_animation` MCP tool** — Golden stills regression baseline. `goldenSave: true` captures 4-keyframe SHA-256 hashes; `goldenCheck: true` compares against baseline and fails on any hash drift (refactor broke determinism).
- **`subframes` parameter in `render_animation` full mode** — Motion-blur 180° shutter simulation. `subframes: 6` renders 6 sub-frames per output frame and blends them; eliminates ghosting on fast morphs. Default 1 (no blur). Documented in CLAUDE.md.
- **`skipVerify` parameter in `render_animation` full mode** — Skip the automatic purity gate before full render. Default `false` (gate always runs).
- **`sampleRate` parameter in `render_animation` quality mode** — Override samples-per-second for quality gate (default 2). Higher values = more samples = more precise worst-frame detection.
- **Automatic purity gate before `render full`** — `render.mjs` now auto-invokes `harness verify` before starting frame rendering unless `--skip-verify` is passed or a passing `purity_report.json` is already cached.

### Improved
- **`scaffold_animation_project` edit.js generation** — Starter code now implements all 10 Motion Craft rules:
  - Rule 1: `spring()` damped harmonic entrance instead of linear `Math.min(1, lt / 0.3)` fade.
  - Rule 2: 3-property entrance — `opacity` + `scale(0.88→1.0)` + `translateY(40→0)` for every subject layer.
  - Rule 3: Caption overlay staggered 0.18s after primary subject.
  - Rule 4: Exits 0.25s, entrances 0.6s (asymmetric timing).
  - Rule 5: 5 named layers per scene (`bg`, `env`, `subject`, `overlay`, `fg`) with correct z-ordering.
  - Rule 7: Lissajous camera drift (`sin(0.4t)`, `cos(0.3t)`) on the `bg` layer — no scene ever freezes.
  - Import line now includes `spring` from `reel/engine.js`.
- **`verify_scene_quality` dynamic sample density** — Previously hardcoded to 5 samples at fixed percentiles. Now derives sample count from `sampleRate * duration`, minimum 5, evenly distributed. Enables richer QA on long-form videos at `sampleRate: 4+`.
- **CLAUDE.md closed-loop QA protocol** — Expanded Step 5b with actionable fix guidance per issue type (blank frame, stuck motion, corner-confined, blown, low-contrast). Added Step 5c for motion-blur pass. Added Step 6 effort table (xhigh/medium per stage). Upgraded Step 9 golden regression to use the new `golden` MCP mode.

### Technical
- `render_animation` handler now returns `overallScore`, `worstFrames`, `motionDelta`, `qualityReport`, and `goldenReport` fields from the tool response — agents no longer need to read report files manually.
- `harness.mjs quality` command now uses a separate `quality_sheet.jpg` output (not `sheet.jpg`) to avoid overwriting the visual review contact sheet.
- `render_animation` quality/golden modes route through `harness.mjs` (not `render.mjs`) since that's where the implementations live.

---

## [2.4.6] — 2026-11-10

### Enhanced
- **High-Quality Volumetric 2D Character Anatomy (`src/video-renderer/scene-animator.js`)**:
  - Replaced all single-stroke stick limbs with solid anatomical contoured polygons:
    - Contoured muscular thighs (quadriceps curve), articulated knee joints, gastrocnemius calf curves, and realistic ankles.
    - Solid contoured upper arms and forearms tapering to wrists; fully articulated hands with solid palms, opposable thumbs, and 4 individual fingers for each pose (`natural`, `dress_shirt`, `hold_spear`, `sewing`, `thinker`, `peace_gesture`, `shiver`, `cover_body`).
    - Anatomical head contour with cranium dome, temples, cheekbones, sculpted jawline, chin, and ears with antihelix and lobe.
    - Almond eyes with sclera, colored iris, pupil, specular catchlights, eyelid crease, and blinking animation over pure-$t$.
    - Sculpted nose bridge and nostril curves; expressive lips with oral cavity and teeth line modulated by sine speech waves.
    - Layered volumetric styled hair: modern textured pompadour/fade, or lush flowing prehistoric locks.
    - Modern tailored suit jacket/blazer with notched lapels, shirt collar, silk tie, belt with polished buckle, trousers with center pressed crease, and leather oxford shoes.
    - Prehistoric animal hide tunic with ragged deckle hem, rawhide stitching, and carved bone toggle buckle, or bare human body with natural skin contours and 5 distinct toes.
- **Production-Grade Environmental Backdrops**:
  - `doodle_dressing`: Hardwood herringbone parquet floor with individual planks and specular reflection sheen, architectural wainscoting trim, luxury dark walnut wardrobe closet with warm internal LED downlight, upper storage shelf, and 4 styled garments on wooden hangers, alongside an arched full-length brass mirror with crystal reflection.
  - `doodle_modern_vs_prehistoric`: Split-screen comparison featuring a modern penthouse with twilight city skyline and illuminated skyscrapers on the left, an African savannah sunset with volcanic mountain ridges and flat-canopy acacia trees on the right, joined by a central glowing timeline rift (`300,000 BCE ───▶ PRESENT`).
  - `doodle_shiver_cold`: Frigid Ice Age glacial valley with jagged snow-covered crags, wind-carved snow dunes, howling blizzard streaks, breath condensation plumes, and volumetric golden dawn sunbeams.
  - `doodle_hunter_savannah`: Wide African savannah horizon under glowing sun with swaying golden grass stalks and flaked obsidian/flint spear.
  - `doodle_sewing_needle`: Prehistoric cavern shelter with stone cave walls, ancient cave paintings, glowing campfire hearth with red embers, and high-precision inspection loupe showing extreme close-up of drilled ivory bone needle and sinew stitching.
  - `doodle_shame_reflection`: Tranquil forest pool with mossy river rocks, water ripples, mirrored reflection, and radiant cognitive awareness halo.
  - `doodle_tribe_meeting`: Misty valley with monolithic standing stones, two tribal figures meeting in peace, and glowing golden connection arc.
  - `doodle_thinking_future`: Primeval starlit night sky with crescent moon, granite boulder, and luminous thought constellation.

---

## [2.4.5] — 2026-11-10

### Fixed
- **Browser Code Animation Dispatch in `src/video-renderer/renderer.js`**:
  - Fixed `ReferenceError: camera is not defined` inside `_renderCodeAnimationScene`. Previously, missing parameter destructuring caused the browser animation engine to throw on every scene, silently falling back to static FFmpeg image slideshows.
  - Added full pass-through of `camera`, `visualType`, and `focalPoint` into `_renderCodeAnimationScene`.
- **Manifest Ingest Preservation (`src/workflows/ingest.js`, `src/workflows/assets.js`)**:
  - `normaliseIngestScene` now retains `prompt`, `style`, and `theme`, and falls back to `raw.prompt` for `visual_description`.
  - Added `--theme` and `--aesthetic` CLI options to `src/cli/make.js`.

### Enhanced
- **Audio-Driven Continuous Camera Director (`src/video-renderer/scene-animator.js`)**:
  - Replaced hardcoded timer modulo cuts with continuous trajectory over `p = t / window.DURATION`.
  - Camera movements (`slow_zoom_in`, `slow_zoom_out`, `pan_left`, `pan_right`, `tilt_up`, `tilt_down`, `ken_burns`, `static`, and `auto`) now smoothly scale to exact narration length.
- **Max-Quality Organic Doodle Anatomy (`src/video-renderer/scene-animator.js`)**:
  - Overhauled `drawDoodleCharacter`: replaced straight vertical spine line with contoured human torso (shoulders, ribcage, waist, hips), clavicle accents, articulated knees, and planted feet.
  - Removed forced ground drop shadows, forced rosy cheek blush, and forced specular eye highlights.
- **Light Parchment Hand-Drawn Inking Aesthetic (`hand_drawn_doodle`)**:
  - Warm parchment paper backgrounds (`#faf7f2`, `#f6f1e8`, `#fdfbf7`) with dark charcoal inking (`#1c1917`), subtle line grain, and organic 12fps line boil.
  - Removed all unwanted text stamps and banners (`NOT FOR COLD`, `THEORY OF MIND`, etc.) from narrative doodle themes.
  - Added `doodle_modern_vs_prehistoric` split-screen comparison theme.

---

## [2.4.4] — 2026-11-09

### Added
- **Optional Captions via Prompt / Flag (`src/video-renderer/scene-animator.js`, `src/video-renderer/renderer.js`, `src/cli/make.js`)**:
  - Captions, subtitle pills, and on-screen text are now disabled by default (`SHOW_CAPTIONS = false`).
  - Added `detectCaptionsRequested(text)` to automatically enable captions when explicitly asked in prompt (e.g. `with captions`, `show captions`, `add subtitles`, `subtitles: true`).
  - Added CLI flags `--captions`, `--subtitles`, `--with-captions` to `src/cli/make.js`.
  - Added `showCaptions` option to MCP tools `create_video_from_script` and `publish_video`.
  - Guarded all FFmpeg video-clip subtitle burn-in filters with `effectiveShowCaptions`.

- **Multi-Shot Dynamic Camera Director (`src/video-renderer/scene-animator.js`)**:
  - Scenes longer than 6.5s automatically trigger dynamic multi-shot camera cuts every 5.5s (`shotDur = 5.5`).
  - Progresses cleanly through 4 cinematic angles: Wide establishing $\to$ Medium push-in $\to$ Action close-up $\to$ Dynamic high angle using spring transition interpolations (`shotCutSpring`), eliminating static camera stagnation.

- **Pacing & Duration Scaling (`src/workflows/script.js`)**:
  - Upgraded target scene count formula to `targetDuration ? Math.max(8, Math.ceil(targetDuration / 4.5)) : Math.max(sceneCount, 55)` to guarantee tight 4-6 second scene pacing matching high-retention video essay benchmarks.
  - LLM instructions explicitly require 12-25 words per scene to prevent monolithic 30-50s static scenes.

### Enhanced
- **Visual Rendering Quality Polish (`src/video-renderer/scene-animator.js`)**:
  - Ground contact drop shadows (`ellipse(0, legLength, 34, 7)`) anchor all characters to the ground plane.
  - Specular eye highlights and warm rosy cheek blush (`rgba(251, 113, 133, 0.28)`) enhance character expressiveness.
  - Round line caps (`ctx.lineCap = 'round'`, `ctx.lineJoin = 'round'`) for clean, hand-crafted doodle aesthetics.

- **Near-Lossless FFmpeg Encoding (`src/video-renderer/renderer.js`)**:
  - Upgraded CRF from 20/22 to `17` (visually lossless).
  - Upgraded encoding preset from `veryfast` to `fast` for superior inter-frame motion estimation.
  - Added `-x264-params aq-mode=3:deblock=-1,-1` to eliminate gradient banding on dark animated canvas backgrounds while preserving razor-sharp vector line art.
  - Upgraded audio output stream to 320 kbps AAC stereo.

---

## [2.4.3] — 2026-11-09

### Enhanced
- **Sentence-Synchronized Subtitles (`src/video-renderer/scene-animator.js`)**:
  - Replaced static slide titles, topic banners, and category tags (`// CHRONICLE`, `// HERITAGE`, top headlines) with sentence-synchronized broadcast subtitles centered at bottom with subtle frosted glass backing pills.
  - Automatically slices narration scripts into sentence beats keyed to duration (`DURATION / sentenceCount`) with smooth spring entrance transitions (`spring(localT, 0.04, 210, 16)`).
  - Word wrapping for long sentences to prevent clipping.

- **3-Beat Progressive Choreography & Dynamic Camera (`src/video-renderer/scene-animator.js`)**:
  - Added multi-beat progression across all 9 doodle themes:
    - `doodle_dressing`: Beat 1 browsing wardrobe $\to$ Beat 2 trying on shirt $\to$ Beat 3 smiling & waving in glowing amber mirror.
    - `doodle_shiver_cold`: Beat 1 shivering alone $\to$ Beat 2 "NOT FOR COLD" stamp $\to$ Beat 3 "NOT FOR PROTECTION" stamp with character contemplating.
    - `doodle_hunter_savannah`: Character walking with spear across savannah grass swatting mosquitoes under sun.
    - `doodle_sewing_needle`: Campfire $\to$ loupe zoom into bone needle stitching animal hide $\to$ archaeological timeline badge.
    - `doodle_shame_reflection`: Looking down $\to$ water reflection ripples clear $\to$ blush & Theory of Mind halo.
    - `doodle_tribe_meeting`: Two clans approach $\to$ peace greeting $\to$ social language connection arc.
    - `doodle_thinking_future`: Campfire thinker $\to$ thought cloud $\to$ planning for tomorrow tools & sunrise.
    - `doodle_microscope_lice`: Character scratching itching pelt $\to$ microscope slide $\to$ head vs body lice divergence badge.
  - Added subtle cinematic camera drift and breathing (`camZoom`, `camPanX`, `camPanY`) via progress $p = t / DURATION$.

### Fixed
- **Regex Parsing Bug in Template Literal (`src/video-renderer/scene-animator.js`)**:
  - Fixed syntax error caused by unescaped newline in regex literal inside template literal string.
- **Theme Detection Priority (`src/video-renderer/scene-animator.js`)**:
  - Prioritized specific narrative themes (`doodle_microscope_lice`, `doodle_shiver_cold`, `doodle_hunter_savannah`, `doodle_tribe_meeting`, `doodle_thinking_future`, `doodle_sewing_needle`, `doodle_shame_reflection`) ahead of general wardrobe dressing to guarantee every scene gets its exact script-matched visual doodle.

---

## [2.4.2] — 2026-11-09

### Added
- **Procedural Doodled Character Animation Engine (`src/video-renderer/scene-animator.js`)**:
  - Pure-function-of-time character generator (`drawDoodleCharacter`) supporting expressive facial animations (talking, shivering, smiling, surprised), multiple hairstyles (wild, modern, feather), clothing types (none, pelt, shirt, cloak), and animated poses (hold_spear, shiver, sewing, dress_shirt, peace_gesture, thinker, natural).
  - 12fps hand-drawn boiling wobble (`wb(seed, mag)`) and organic sketchy vector primitives (`sLine`, `sCircle`, `sRect`) conforming to the pure-$t$ rendering contract.
  - 9 narrative-matched character scene themes: `doodle_dressing`, `doodle_shiver_cold`, `doodle_sewing_needle`, `doodle_hunter_savannah`, `doodle_shame_reflection`, `doodle_tribe_meeting`, `doodle_thinking_future`, `doodle_microscope_lice`, and `doodle_general_human`.
  - Action-grounded theme detection in `detectComponentTheme`: Human narrative, evolution, psychology, and daily action scripts automatically map to physical character animations rather than abstract geometry.
  - Enhanced LLM prompt in `generateSceneCodeWithLLM` directing AI models to animate expressive human figures actively performing narrated actions.

---

## [2.4.1] — 2026-11-09

### Fixed
- **CLI & npx Invocation Handling (`src/mcp-server/stdio.js`, `package.json`)**:
  - Registered `frameforge-make` binary alias in `package.json` so `npx --package=@amg555/frameforge-mcp frameforge-make` works immediately.
  - Added CLI dispatch interception in `stdio.js` when flags or subcommands (`make`, `--topic`, `doctor`, `setup`, `harness`) are passed, preventing npx CLI invocations from hanging on stdio JSON-RPC stdin.
- **Language & Orientation Forwarding in CLI (`src/cli/make.js`)**:
  - Added `--orientation <landscape|portrait>` and `--portrait` flags.
  - Forwarded `language` and auto-selected `voice` (`ml-IN-MidhunNeural`, `hi-IN-MadhurNeural`, etc.) to `runAssets` and `runRender`.
  - Forwarded `renderWidth` and `renderHeight` to `runRender` so canvas dimensions match requested orientation.

---

## [2.4.0] — 2026-11-09

### Added
- **MCP Tool `generate_scene_code` (`src/mcp-server/server.js`, `cloudflare-mcp/src/index.js`)**:
  - Synthesizes pure-function-of-time canvas drawing code for `window.seek(t)` matching the Claude Opus 5.5 / `ClaudeAnimationBase` contract.
  - LLM-assisted scene code synthesis with automatic procedural fallback (supporting celestial orbits, candlestick graphs, neural nets, 3D wireframe polyhedra).
  - Automatically wraps generated code with `wrapCodeInHarnessHtml` for headless Chromium execution.
- **MCP Tool `preview_scene` (`src/mcp-server/server.js`, `cloudflare-mcp/src/index.js`)**:
  - Renders still frame previews (PNGs) of any scene at specified timestamps (defaults to `[0.1, duration/2, duration - 0.1]`).
  - Implements the Layer 3 inspection / feedback loop, letting IDE agents (Claude Code, Cursor, Windsurf) visually inspect keyframes before encoding.
- **Automatic Scene Code Synthesis (`src/workflows/assets.js`)**:
  - Automatically invokes `generateSceneCodeWithLLM` when scenes lack pre-rendered media, ensuring all agent-generated videos are true code animations rather than static slideshows.

### Enhanced
- **Full-Canvas Layout & Dynamic Scaling (`src/video-renderer/scene-animator.js`)**:
  - Eliminated bottom glassmorphic rectangle card that caused PowerPoint-style slideshow appearances.
  - Replaced with floating cinematic kinetic typography (subtle top title, bottom caption at `0.92H`, minimal progress line).
  - Centered visual animations at `0.50H` with 1.4×–1.5× scale expansion.
- **Playwright Dependencies for Production (`package.json`)**:
  - Moved `playwright` and `playwright-core` from `devDependencies` to production `dependencies` so `npx` and standard npm installs run headless Chromium out of the box without falling back to FFmpeg image loops.
  - Expanded `findChromePath` in `src/harness/lib/browser.mjs` and `scripts/render.mjs` to auto-detect Microsoft Edge (`msedge.exe`), Brave, and system Chromium on Windows, macOS, and Linux.

---

## [2.3.9] — 2026-11-09

### Enhanced
- **Code-Driven Animation Primitives (`src/video-renderer/scene-animator.js`)**:
  - Expanded `wrapCodeInHarnessHtml` runtime environment with standard animation and easing helpers: `clamp`, `lerp`, `easeIn`, `easeOut`, `easeInOut`, and `boilSeed` (12fps hand-drawn wobble).
  - Explicitly registered `html`, `code`, and `animation_code` in `src/schema/scene.schema.json` for first-class schema validation and tool discovery.
  - Verified pure-function-of-time canvas code execution pipeline: scene code → Playwright virtual clock headless capture → FFmpeg BT.709 H.264/AAC MP4 encode.

---

## [2.3.8] — 2026-11-09

### Fixed & Enhanced
- **Multilingual Neural TTS Voice Routing (`src/pipeline/providers.js`)**:
  - Automatically routes multilingual text to native neural voices: Malayalam (`ml-IN-MidhunNeural` / `ml-IN-SobhanaNeural`), Hindi (`hi-IN-MadhurNeural` / `hi-IN-SwaraNeural`), Tamil, Telugu, Chinese, Japanese, and Arabic.
  - Eliminated Windows `shell: true` path space splitting and DEP0190 warnings in `_edgeTTS` by writing text to a UTF-8 temporary file and passing `--file` with `shell: false`.
- **Harness CLI Positional Arguments (`src/harness/bin/harness.mjs`)**:
  - Added support for positional `.html` scene files (e.g. `node harness.mjs verify my-scene.html`).
  - Added automatic fallback to `reference-scene.html` fixture so `npm run harness:verify` runs cleanly without requiring a pre-existing root `index.html`.

---

## [2.3.7] — 2026-11-09

### Added
- **Autonomous Local Video Editor (`src/video-editor/editor.js`)**:
  - Full-featured local FFmpeg video editing engine for autonomous agent workflows (inspired by `video-agent-skill`).
  - `probeMedia`: `ffprobe` JSON parsing for duration, dimensions, fps, streams, codecs, and channels.
  - `parseTimestamp`: Flexible timestamp parsing supporting numeric seconds, `"01:23.45"`, `"83.45s"`, `"01:02:03"`.
  - `editClip`: Frame-accurate trimming, speed ramping (`0.25x` to `4.0x` with chained `atempo` pitch preservation), aspect ratio conforming (`16:9` landscape, `9:16` portrait, `1:1` square), color grading, and HarfBuzz captions.
  - Cinematic color grading presets: `cinematic`, `warm`, `cool`, `vintage`, `bw`, `vibrant`, and `cyberpunk`.
  - `concatClipsWithTransitions`: Seamless multi-clip transitions using FFmpeg `xfade` (`fade`, `dissolve`, `wipeleft`, `wiperight`, `slideup`, `slidedown`, `circleopen`, `smoothleft`) and `acrossfade`.
  - `editAndAssemble`: End-to-end autonomous assembly with ambient clip audio volume, master voiceover overlay, and ducked background music with LUFS normalisation.
  - Auto-fit mode: Automatically calculates clip durations so video length perfectly matches master voiceover length.
  - `applyOperations`: Imperative operation dispatcher supporting `cut`, `trim`, `speed`, `color`, `caption`, `mute`, `transition`, and `assemble`.
- **`edit_video` MCP Tool (`src/mcp-server/server.js`)**:
  - Exposes dedicated autonomous video editor tool to Claude Code, Cursor, Windsurf, Bob, and Codex.
  - Local fallback in `external_platform_call` for `action === 'edit'`: runs local `VideoEditor` instead of erroring out when no external platform is configured.
  - Enhanced `create_video_from_script` and `VideoRenderer.renderScene()` to support `startTime`, `endTime`, `speed`, `clipVolume`, and `colorGrade` for user clips (`video_path`).
- **Worker & Remote MCP Integration**:
  - Registered `edit_video` in Cloudflare Remote MCP (`cloudflare-mcp/src/index.js`).
  - Added `edit_video` job execution in background worker servers (`src/worker/server.js`, `src/worker/server-render-free.js`).

---

## [2.3.6] — 2026-11-09

### Added
- **Full-Canvas Cinematic Procedural Entities** (`src/video-renderer/scene-animator.js`):
  - Completely eliminated the rigid PPT card slideshow pattern. Every scene now renders a living, full-canvas animated universe.
  - 3D Celestial Orbital Simulation: Earth with rotating longitude/latitude wireframes, tilted elliptical orbits, orbiting satellites with solar panels, expanding spherical radio wavefront pulses, and ground target beacon.
  - 3D Rotating DNA Double-Helix: Sinusoidal backbones with perspective depth, nucleotide base-pair rungs, and molecular spore drift.
  - Full-Canvas Financial Candlesticks: Realistic Japanese candlesticks with upper/lower wicks, glowing Exponential Moving Average (EMA) ribbon curve, volume bars, and price tickers.
  - 3D Tactical Radar Globe: Rotating spherical grid with 360-degree radar sweep sector and pinging incident coordinates.
  - 3D Wireframe Polyhedra: Pure mathematical 3D perspective projection (octahedron/cubes) with coordinate axes.
  - Historical Milestone Roadmaps: Flowing chronological paths with golden era seals and progressive illumination pulses.
  - Full-Canvas Neural Mesh: 4-tier neural network with glowing energy packets traveling along active synapses.
- **Direct Agent Code & HTML Execution** (`src/video-renderer/renderer.js`, `src/mcp-server/server.js`, `src/workflows/render.js`, `src/workflows/assets.js`):
  - Added support for `html` (complete page conforming to `window.DURATION` and `window.seek(t)`) and `code` (canvas drawing instructions for `t`) across `create_video_from_script`, `render_from_scenes`, and workflow pipelines.
  - Enables Claude Code, Opus 5.5, Cursor, and IBM Bob to write custom animation programs that FrameForge renders directly without template overrides.
  - Added `wrapCodeInHarnessHtml()` helper to embed pure Canvas drawing code into a compliant virtual-clock harness page.
- **Cinematic Broadcast Lower-Third Overlays**:
  - Replaced repetitive center-card text with glassmorphic lower-third broadcast banners leaving the upper 75% of the frame completely open for motion graphics.
  - Accent color left tab, tag pills, high-contrast drop-shadow typography, and subtle bottom progress bar.
- **Multilingual Typography Integration**:
  - Full native DirectWrite/HarfBuzz font support for Malayalam (`Nirmala UI`, `Noto Sans Malayalam`), Hindi/Devanagari, Tamil, Telugu, Arabic, and CJK with zero broken glyphs.

---

## [2.3.5] — 2026-11-09

### Added
- **Integrated Code-Driven Scene Animator** (`src/video-renderer/scene-animator.js`):
  - Dynamic 24fps HTML5/Canvas animation generator adhering to pure-function-of-time contract `seek(t)`
  - Contextual motion graphic themes: Code IDE/terminal typing, Data charts & counters, Network node graphs, Flow diagrams, and floating Ken-Burns image cards
  - Dynamic gradient backgrounds with ambient particle systems and perspective motion grids
  - High-performance Chromium harness rendering + direct FFmpeg BT.709 H.264 VUI muxing
- **Full Multilingual & Malayalam Font Support**:
  - Direct font resolver for Malayalam & Indic scripts (`Nirmala.ttc`, `Noto Sans Malayalam`, `Malayalam Sangam MN`, `Kartika`, `Meera`, `Manjari`)
  - FFmpeg `text_shaping=1` HarfBuzz layout integration preserving complex conjuncts, chillu letters, and viramas
  - Unicode-safe slicing and UTF-8 handling in caption and narration filters
  - Updated `engine.css`, `engine.js`, and `new-project.mjs` typography stacks for seamless multilingual rendering

### Fixed
- Replaced static solid-color slideshow fallback in `renderer.js` with live code-driven animation engine
- Fixed `--flag value` space-separated argument parsing in `harness.mjs` CLI
- Fixed `--out` directory path resolution in `cmdFrames` frame exporter

---

## [2.3.4] — 2026-11-09

### Added
- **Full Code-Driven Video Production Harness** (`src/harness/`, `bin/harness.mjs`, `npx frameforge-harness`):
  - H1 Browser resolution & GPU auto-selection (Direct3D11 / Metal / ANGLE)
  - H2 Deterministic frame stepper & virtual clock injection
  - H3 Resumable atomic frame worker pool (`.tmp` + `renameSync`, <1000B corruption checks)
  - H4 Visual review generators: contact sheets, motion strips, 9:16 mobile crop previews
  - H5 3-point history-leak & frame purity verification gate ($a === b \land a === c$) with `frames_sha256` digest
  - H6 Pixel luminance and blind-spot frame math (blank, blown, corner-confined detection)
  - H7 Determinism primitives in `engine.js` (`boilSeed`, `kf`, `onTwos`, `seg`, `pulse`, `shots`)
  - H8 Broadcast-grade BT.709 color encoding & x264 VUI parameter tags
  - H9 Unified CLI commands (`doctor`, `storyboard`, `verify`, `sheet`, `strip`, `crop`, `pixels`, `frames`, `encode`, `all`)
- **MCP `render_animation` parity**: added `verify`, `doctor`, `pixels` modes and structured `purityReport` return object.
- **VoxForge**: added `VOXFORGE_URL` detection to system doctor and documented in all provider tables.

### Fixed
- Fixed relative module imports in scaffolded projects (`./browser.mjs`, etc.).
- Enforced BT.709 color tags across all procedural scene fallbacks in `renderer.js`.
- Included `plugins/` skill templates and assets in npm package distribution.

---

## [2.3.2] — 2026-11-06

### Added

- **Tool 18: `export_to_editor`** — send a finished animation MP4 + EDL to any local editing app via an HTTP bridge: Premiere Pro (`:7777`), DaVinci Resolve (`:8080`), CapCut (`:9090`), After Effects (`:7878`), or Remotion (`:3001`). Pass `editorUrl` to override any port. Bridge setup docs: `docs/editor-bridges/`.
- **VoxForge TTS provider** (`PROVIDER_TTS=voxforge`) — named first-class provider in `TTSProvider`. Tries `/v1/audio/speech` (OpenAI-compatible) then falls back to `/v1/tts`. Configured via `VOXFORGE_URL`, `VOXFORGE_KEY`, `VOXFORGE_VOICE`, `VOXFORGE_MODEL`. Also surfaced in `multi_voice_tts` platform enum and `setup-keys.js` wizard.
- **Editing app presets in `ExternalAdapter`** — `premiere`, `resolve`, `capcut`, `aftereffects` (local bridge), `kling` (cloud), plus updated `voxforge` preset pointing to `/v1/audio/speech`.
- **`render_animation` mode `"kit"`** — now exposed in the MCP tool enum. Generates an EDL file in `out/` for import into Premiere / Resolve.

### Changed

- **`CLAUDE.md`**: code-driven animation promoted to **primary path**; FFmpeg + AI images demoted to "quick draft"; new sections for VoxForge voice and editor bridge workflow; tool table reorganised into Primary / Secondary / Auto-research groups (18 tools).
- **`START_HERE.md`**: opening question set updated to surface animated explainer as a first-class format choice.
- **`setup-keys.js`**: VoxForge added to TTS provider menu (second option, right after edge-tts). Four new config keys persisted: `VOXFORGE_URL`, `VOXFORGE_KEY`, `VOXFORGE_VOICE`, `VOXFORGE_MODEL`.
- **`scripts/deep-validate.js`**: +3 checks (`export_to_editor`, `voxforge`, tool count label updated to 18).
- Version bump: `2.3.1` → `2.3.2` across all version strings.

---

## [2.3.1] — 2026-11-04

### Added

- **`.claude-plugin/marketplace.json`** — Claude Code plugin marketplace registration. FrameForge is now discoverable via `claude plugin marketplace add AMG555/FrameForge`.
- **`plugins/video-pipeline/.claude-plugin/plugin.json`** — per-plugin manifest for the video-pipeline skill.

### Changed

- **`src/cli/setup-keys.js`** — `skip` is now the **default** option in the LLM provider menu. Users who write their own scenes (the most common path) are no longer forced through an API key section.
- **`CLAUDE.md`** — Path 2 expanded: transcript/`cuePhrase()` word-sync workflow, `video_job.py` spend-capped batch, golden stills regression test, hook variants (A/B testing opening shots), mobile crop check, still-review budget.
- **`START_HERE.md`** — restructured into three named paths (A: IDE-scenes, B: code-driven animation, C: auto-research). Reel vs. YouTube format choice surfaced in opening questions. Path B includes transcription, hook variants, and storyboard gate.
- Version bump: `2.3.0` → `2.3.1` across all version strings.

---

## [2.3.0] — 2026-11-02

### Added

- **HTML renderer** — complete Playwright-based HTML compositor for motion-graphics-quality video output. Activated via the `html-renderer` skill (`plugins/video-pipeline/skills/html-renderer/SKILL.md`).
  - `plugins/video-pipeline/skills/video-pipeline/assets/project/reel/engine.js` — full `seek(t)` runtime: `layer()`, `text()`, `chip()`, `wallCard()`, `imageCard()`, `stamp()`, `codeCard()`, `terminal()`, `at()`, `stagger()`, `captions()`, `cue()`, `faceAt()`, `spring()`, `lerp()`, `easeIn/Out/InOut()`, browser preview loop
  - `reel/engine.css` — base reset + design tokens
  - `scripts/render.mjs` — Playwright frame renderer (sheet / stills / full / mux)
  - `scripts/mix_audio.py` — voice concat + sidechain ducking + -14 LUFS
  - `scripts/verify.py` — 7-gate quality verification (same gates as `QualityGate`)
  - `scripts/transcribe.py` — Whisper word-level caption outline generator (`openai-whisper`, free local)
  - `scripts/capture.mjs` — headless Playwright screenshot for b-roll (site, tweet, URL)
  - `scripts/stock.py` — Pexels stock footage/image downloader (free API key) with user media asset stubs
  - `scripts/html-renderer/new-project.mjs` updated: copies real engine files instead of writing stubs; includes all 8 scripts
- **Tool 14: `get_job_status`** — MCP tool to poll a job queued by `queue_full_pipeline`. Returns `{ status, stage, result, error }`. Added to `src/mcp-server/server.js`; automatically available on stdio transport. 5 new tests.
- **Cloudflare KV rate limiter** — sliding-window 100 req/hr per bearer token. SHA-256-hashed key stored in `RATE_LIMITS` KV namespace. Returns HTTP 429 + `Retry-After` when exceeded. KV binding documented in `cloudflare-mcp/wrangler.toml`. Rate-limiting skipped when KV not bound (local dev).

### Changed

- `VideoRenderer.assembleMain` — minimum scene guard lowered from 5 → 1 (throws only on 0; warns below 3). The README's 2-scene `create_video_from_script` examples now work without error.
- Cloudflare Worker version → `2.3.0`; `SERVER_INFO.version` → `2.3.0`; `package.json` → `2.3.0`
- `scripts/deep-validate.js` — +27 checks (engine asset files, rate-limit, Tool 14, new scripts, auth token forwarding, publish_video invariants)
- `README.md` — version badge, test count, Tool 14 row, HTML Renderer section, architecture diagram tool counts updated

### Security

- `get_job_status` and `queue_full_pipeline` now forward `INTERNAL_API_TOKEN` as `Authorization: Bearer` in all HTTP requests to the worker API. Previously these two tools made unauthenticated calls.
- `publish_video` manifest no longer emits stale `youtubeTitle`/`youtubeDescription` alias keys.
- `cloudflare-mcp/src/index.js` architecture comment corrected (was "Telegram / YouTube").
- `log-redaction.js` — removed stale YouTube OAuth2 key names (`youtubeRefreshToken`, `youtubeClientSecret`).
- MCP HTTP server now enforces `MCP_AUTH_TOKEN` when set, using `crypto.timingSafeEqual` to prevent timing oracle attacks. Previously the token was validated only in the Cloudflare Worker proxy; the local HTTP server only logged a warning.
- `external-adapter.js` — fixed `this`-binding bug in `downloadOutput()` where `this._authHeader()` was called inside a nested regular function that lost the instance context. Auth headers are now captured before the closure.
- `providers.js` — removed unused `execSync` import (imported but never called; reduces unnecessary attack surface).
- `publishing.js` — removed stale `youtubeTitle`/`youtubeDescription` fallback from title/description extraction.
- Server startup no longer logs active provider configuration (`LLM=groq TTS=edge-tts ...`) to stdout, preventing accidental info disclosure in log aggregation pipelines.
- `scripts/deep-validate.js` — +5 new invariant checks covering MCP auth enforcement, provider config log hygiene, and stale YouTube fallback removal.

### Tests

- 456 tests, 98 suites (was 449 / 96 before this patch)

---

## [2.2.0] — 2026-11-02

### Changed

- **Delivery channels** — Telegram and YouTube removed from `publishing.js`. Replaced with two platform-agnostic channels:
  - `file` — copy master + shorts to `N8N_FILES_DIR/published/` (default)
  - `webhook` — POST JSON delivery summary to `PUBLISH_WEBHOOK_URL`
- **Review notifications** — `review-gate.js` no longer uses Telegram `sendMessage`. Now POSTs structured JSON events (`HUMAN_REVIEW_REQUIRED`, `PRODUCTION_REJECTED`) to `REVIEW_NOTIFY_URL` — compatible with any HTTP receiver (n8n, Make, Zapier, custom)
- **Tool 13 renamed** — `n8n_webhook_trigger` → `queue_full_pipeline`. POSTs `{ type: "full_pipeline", payload }` to `WORKER_API_URL/jobs`. All three server variants updated (HTTP, stdio, Cloudflare Worker)
- **`src/cli/make.js`** — `--channels` default changed from `telegram` to `file`; Telegram batch-summary curl block removed
- **`src/cli/setup-keys.js`** — Telegram + YouTube setup sections replaced with `PUBLISH_WEBHOOK_URL` and `REVIEW_NOTIFY_URL` sections
- **`docs/env.template`** — Telegram and YouTube env vars removed; `PUBLISH_WEBHOOK_URL`, `REVIEW_NOTIFY_URL`, `WORKER_API_URL` added
- **`scripts/deep-validate.js`** — stale YouTube OAuth2 + Telegram + n8n checks replaced with file/webhook delivery checks; `SERVER_INFO version` updated to `2.2.0`
- **`package.json`** — version bumped to `2.2.0`
- **`README.md`** — delivery description, Tool 13 name, test counts, badge versions updated

### Removed

- **`docs/youtube-upload.md`** — YouTube OAuth2 upload guide. YouTube delivery removed from the core pipeline; external delivery via `external_platform_call` or a webhook receiver handles it.
- **`TELEGRAM_BOT_TOKEN`**, **`TELEGRAM_CHAT_ID`**, **`YOUTUBE_CLIENT_ID`**, **`YOUTUBE_CLIENT_SECRET`**, **`YOUTUBE_REFRESH_TOKEN`**, **`N8N_WEBHOOK_URL`** — all env vars no longer read by any source file.

### New env vars

| Var | Purpose |
|-----|---------|
| `PUBLISH_WEBHOOK_URL` | HTTP endpoint that receives delivery summary JSON on publish |
| `REVIEW_NOTIFY_URL` | HTTP endpoint that receives fact-check review request events |
| `WORKER_API_URL` | Worker API base URL for `queue_full_pipeline` (default: `http://localhost:3211`) |

---


## [2.1.0] — 2026-11-02

### Added

- **5 new test modules** — 103 new tests across previously untested production modules:
  - `src/quality-gate/gate.test.js` — QualityGate result schema, check entry shape, _ffprobe/_ffmpeg helpers
  - `src/shorts-extractor/extractor.test.js` — _focalToFFmpegX (even-pixel constraint, clamping), _scoreSegment, _selectSegments (non-overlap, ≤5), _silenceToBoundaries, _defaultFocalY, error on too-short video
  - `src/audio-mixer/mixer.test.js` — constructor, detectPauses graceful fallback, mixWithDucking/mixVideo error paths
  - `src/video-renderer/renderer.test.js` — _captionFilter (sanitisation, truncation, upper-case), _discoverScenes (ordering, size filter, sceneCount cap), _findRandomMusicFile, renderScene/assembleMain error paths
  - `src/fact-checker/checker.test.js` — _normalizeClaim, _classifyRisk, _requiredSources, _hash, _gatePass, _domainGroup, checkClaims (cache, structure, empty), checkClaim, formatCitation

### Changed

- **`src/schema/scene.schema.json`** — aligned with the v2.0.0 breaking changes shipped in that release:
  - `schema_version` default corrected from `1.0.0` → `2.0.0`
  - `character_id` enum (`ancient_man|modern_man|none`) replaced with a free-form string description
  - `character` block no longer `required` in schema `required` array (character is optional)
  - `narration` and `visual_description` `minLength` relaxed from `10` → `1`
  - `camera_hint` enum expanded to include all 11 AnimationSystem hints: `slow_zoom_in`, `slow_zoom_out`, `tilt_up`, `tilt_down`, `ken_burns` (were missing since the animation system was extended)
  - `character.pose` and `character.emotion` enums removed — free-form strings
- **`package.json`** — version bumped to `2.1.0`; `test` script extended to include 4 new test files; dead `check-credentials` script reference to deleted `n8n-log-redaction.js` fixed

### Removed

- **`src/utils/n8n-log-redaction.js`** — n8n Code node utility. n8n was removed from this project; the file was dead code. Log redaction is handled by `src/utils/log-redaction.js`.
- **`src/asset-library/test-asset-library.js`** — legacy console-log test script referencing the removed `ancient_man`/`modern_man` characters. Not in node:test format, not run by `npm test`.

---

## [2.0.1] — 2026-11-02

### Security

- **Timing-safe token comparison** — `cloudflare-mcp` and `server-render-free.js` both used plain `===` to compare auth tokens. Replaced with `crypto.subtle.timingSafeEqual` (Worker) and `crypto.timingSafeEqual` (Node) to eliminate token-oracle timing attacks.
- **Request body size limits** — All three HTTP servers (`server.js`, `server-render-free.js`, `src/mcp-server/server.js`) now reject bodies > 4 MB with HTTP 413, preventing OOM from oversized payloads.
- **Path traversal guards** — `edit_scenes` and `render_from_scenes` now reject any `productionId` containing `/` or `\`. `multi_voice_tts` now validates `outputPath` is inside `FILES_DIR`.
- **`multi_voice_tts` env-mutation race fixed** — The tool previously mutated `process.env` and restored it in `finally`, which was a race condition under concurrent MCP calls. `TTSProvider` now accepts per-call constructor options `{platform, voice, rate, apiKey, webhookUrl}` that override `process.env` without mutation. All `_edgeTTS`/`_elevenLabs`/`_azureTTS`/`_openaiTTS`/`_customTTS` methods read `this._overrides` first.
- **Startup warnings** — Both `server.js` and `server-render-free.js` now print a `WARNING` on startup when `MCP_AUTH_TOKEN` / `INTERNAL_API_TOKEN` is not set.
- **Health endpoint hardened** — `src/mcp-server/server.js` health check no longer leaks the full tool list.

### Fixed

- **Stale `youtubeTitle` field names** — `runFullPipeline` in both `server-render-free.js` and `src/worker/server.js` was passing `scr.youtubeTitle` / `scr.youtubeDescription` / `scr.youtubeTags` to `runPackaging`. Script schema v2.0.0 renamed these fields to `title` / `description` / `tags`. The pipeline now uses the correct names.
- **Cloudflare Worker tool list was stale** — `cloudflare-mcp/src/index.js` only advertised 6 tools. All 13 tools are now exposed (`ingest_media`, `edit_scenes`, `render_from_scenes`, `external_platform_call`, `create_video_from_script`, `multi_voice_tts`, `n8n_webhook_trigger` added).
- **`write_script` description updated** — Removed "55-scene" and "educational comedy" from the tool description (stale since v2.0.0).
- **Cloudflare Worker `serverInfo.version` updated** to `2.0.0` (was `1.1.0`).
- **`SERVER_INFO.version` in `server.js`** updated to `2.0.0` (was `1.0.0`).

---

## [2.0.0] — 2026-11-02

### Breaking Changes

**Scene schema updated to `2.0.0`.**
- `character_id` is now a free-form string (was an enum of `ancient_man|modern_man|none`)
- `visual_description` no longer requires `[CAMP][MODERN][COMPARE][REACTION][TIMELINE]` tags
- `youtubeTitle`/`youtubeDescription`/`youtubeTags` renamed to `title`/`description`/`tags` in `runScript()` return value (legacy keys still returned for backwards compat)

### Removed
- All hardcoded domain content: "YouTube history researcher", "ancient_man", "modern_man", caveman loincloth image style constant, `[CAMP][MODERN][COMPARE][REACTION][TIMELINE]` scene tags
- `.kiro/` folder removed from git history entirely (IBM Kiro IDE dev artifacts — not needed by contributors)
- Hardcoded 55-scene / 1000-word minimums relaxed to 5 scenes / 50 words (short-form reels now work)

### Added

**Tool 11: `create_video_from_script`** — Agent-first path. The IDE agent writes the complete `scenes[]` array in its own context; FrameForge renders without any internal LLM calls. This is the primary path for , Claude Code, Cursor, and any agentic IDE.

```json
{ "scenes": [
    { "narration": "Spoken text", "caption": "OVERLAY", "visual_description": "Image prompt" }
] }
```

**Tool 12: `multi_voice_tts`** — Per-call TTS platform override. Call ElevenLabs, Azure, OpenAI TTS, edge-tts, or any webhook without changing global `.env`. Pass `apiKey` inline for voice cloning workflows.

**Generic `research_topic` and `write_script` tools** — now accept:
- `persona`: who the narrator is (e.g. "travel blogger", "tech reviewer")
- `format`: video format (e.g. "Instagram reel", "long-form tutorial", "explainer")
- `style`: content style (e.g. "comedic", "documentary", "educational", "vlog")
- `language`: BCP-47 code for the script language
- `targetDuration`: video duration in seconds (auto-calculates scene count)
- `imageStyle`: visual aesthetic for AI image prompts ("photorealistic", "anime", "watercolour", etc.)

**`generate_scene_image`** — `imageStyle` param replaces hardcoded art style. Any visual aesthetic now possible.

### How FrameForge works with an agentic IDE

FrameForge is a **rendering execution engine**. Your IDE ( / Claude Code / Cursor) is the intelligence.

**Farhan's workflow** (the PDF): Claude Desktop controls a browser, types scripts into ElevenLabs, runs Remotion renders. The agent drives the GUI.

**FrameForge + agentic IDE**: The IDE writes scenes in its context and calls structured MCP tool functions. No browser control needed. The IDE calls `create_video_from_script` → FrameForge handles TTS + image gen + FFmpeg assembly → returns `masterPath`. Like Opus Clip but controlled by your IDE.

---

## [1.4.1] — 2026-11-02

### Changed — LLM Provider Overhaul

**Removed**: `watsonx` provider. All WatsonX references removed from providers, doctor, setup wizard, and env template.

**Added 6 new LLM providers** (all OpenAI-compatible except Anthropic):

| Provider | Default model | Key env var | Free tier |
|---|---|---|---|
| `cerebras` | `llama3.3-70b` (2000+ tok/s) | `CEREBRAS_API_KEY` | ✅ |
| `openrouter` | `anthropic/claude-sonnet-4-5` | `OPENROUTER_API_KEY` | ✅ credits |
| `anthropic` | `claude-sonnet-4-5` | `ANTHROPIC_API_KEY` | — |
| `gemini` | `gemini-2.0-flash` | `GEMINI_API_KEY` | ✅ |
| `mistral` | `mistral-large-latest` | `MISTRAL_API_KEY` | — |
| `together` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | `TOGETHER_API_KEY` | ✅ credits |

- `openai` default model updated from `gpt-4o-mini` → `gpt-4o`
- `groq` default updated to `llama-3.3-70b-versatile`
- **Anthropic native API**: Anthropic uses `/v1/messages` (not `/chat/completions`) — a private `_anthropicChat()` shim handles this transparently.
- **OpenRouter headers**: `HTTP-Referer` + `X-Title` attribution headers added automatically.
- **`LLM_MODEL` env var** overrides the default model for any provider.
- **`webhook` provider** now explicitly listed in `LLM_DEFAULTS` (covers LM Studio, vLLM, LocalAI, any proxy).
- **Model update guide** embedded as a comment in `providers.js` with docs URL for each provider.

**`npm run doctor`** updated — detects all configured providers, shows active model name, recommends free options with a better fix message.

**`npm run setup` wizard** updated — all 6 new providers in the menu, WatsonX removed.

**`.kiro/config/production-secrets.env.template`** — full rewrite:
- All LLM providers documented with inline links
- External platform adapter section added
- YouTube OAuth2 section added
- TTS key names corrected (`AZURE_SPEECH_KEY` was `AZURE_TTS_KEY`)

---

## [1.4.0] — 2026-11-02

### Added — Flexible Pipeline Modes

**Pipeline mode system (`--mode` flag)**
FrameForge is no longer all-or-nothing. Every stage is now independently skippable.

| Mode | What it does |
|---|---|
| `full-auto` (default) | Research → Script → AI Images → TTS → Render → Publish |
| `edit-only` | Skip all AI generation. Supply your own clips/images/audio. |
| `script-only` | Research + Script only. Review/edit the JSON, then resume. |
| `custom` | Mix and match with `--no-*` flags. |

**New CLI flags**
- `--mode full-auto|edit-only|script-only|custom`
- `--scenes-file <path>` — Load a scenes JSON directly, skip research + script
- `--script-file <path>` — Load an approved script JSON, skip research only
- `--media-dir <path>` — Auto-discover video/image/audio clips from a directory
- `--no-research` — Use `--topic` as raw context instead of running the research stage
- `--no-script` — Skip script generation (requires `--scenes-file`)
- `--no-images` — Skip AI image generation (use `video_path`/`image_path` in scenes)
- `--no-tts` — Skip TTS synthesis (use `audio_path` in scenes)
- `--no-publish` — Render only, skip all delivery channels
- `--dry-run` now prints a resume hint: `npm run make -- --script-file <path>`

**Interactive key setup wizard (`src/cli/setup-keys.js`)**
Walk through every provider in ~2 minutes. Writes a ready-to-use `.env` file.
- `npm run setup` — Launch the wizard
- `npm run setup:check` — Validate existing `.env`
- `node src/cli/setup-keys.js --out .env.production` — Write to a named file
- Covers: Groq / OpenAI / WatsonX / Ollama / webhook LLM, edge-tts / ElevenLabs (voice cloning) / Azure / OpenAI TTS / webhook TTS, Pollinations / fal.ai / Replicate / DALL-E / webhook image, Telegram, YouTube OAuth2, external platform adapter

**Media ingest workflow (`src/workflows/ingest.js`)**
Build a production-ready `scenes.json` from user-supplied media — no LLM needed.
- File-based: `--scenes-file ./my-scenes.json`
- Directory auto-discovery: `--media-dir ./clips` (pairs `scene01.mp4` + `scene01.mp3` + `scene01.txt` automatically)
- Scenes format: `{ narration, caption, video_path, image_path, audio_path, camera_hint, music_mood }`
- Reports how many scenes need AI images vs pre-supplied, TTS vs pre-recorded audio

**External platform adapter (`src/pipeline/external-adapter.js`)**
Connect FrameForge to any external platform via HTTP — VoxForge, ElevenLabs, Remotion, Runway, Pika, n8n, Make, or any REST API.
- Configure with 5 env vars: `EXTERNAL_PLATFORM_NAME`, `EXTERNAL_PLATFORM_URL`, `EXTERNAL_PLATFORM_KEY`, `EXTERNAL_PLATFORM_INGEST_PATH`, `EXTERNAL_PLATFORM_RENDER_PATH`
- Built-in presets for: `elevenlabs`, `remotion`, `voxforge`, `runway`, `pika`
- Operations: `ingestMedia()`, `renderScenes()`, `checkStatus()`, `downloadOutput()`
- Polls job status automatically until completion

**4 new MCP tools** (accessible from Cursor, Claude Code, Kiro, Windsurf, )
- `ingest_media` — Upload clips/images/audio, get a scenes manifest back
- `edit_scenes` — Read and patch a scenes manifest (update captions, swap files, append scenes)
- `render_from_scenes` — Render directly from a manifest, skipping research/script
- `external_platform_call` — Bridge to VoxForge/Runway/ElevenLabs/Remotion/any platform

**`assets.js` `skipImages`/`skipTts` flags**
`runAssets({ skipImages: true, skipTts: true })` now skips generation stages cleanly. Scenes with `_skipImageGen` or `_skipTts` fields (set by `--no-images` / `--no-tts`) are respected.

**New npm scripts**
- `npm run setup` — Key setup wizard
- `npm run setup:check` — Validate `.env`
- New `frameforge-setup` CLI binary

---

## [1.3.2] — 2026-11-02

### Fixed

- **`asset-library.js` `findAsset` — null-dereference on semantic match** (#bug): `_semanticSearch`
  returns the asset directly, not a `{similarity, asset}` wrapper. The caller checked
  `semanticMatch.similarity` which was always `undefined`, so semantic fallback never matched.
  The guard is now `if (semanticMatch)` with a direct return.
- **`asset-library.js` `_callPollinationsAPI` — double download** (#bug): The method called
  `_downloadAsset(imageUrl, description)` internally, then `generateAsset` also called
  `_downloadAsset` with the returned path. The image was fetched twice. Fixed: `_callPollinationsAPI`
  now returns the URL string only; `generateAsset → _downloadAsset` performs the single download.
- **`asset-library.js` `_generateAssetId` — timestamp-based ID breaks idempotency** (#bug):
  `Date.now()` was part of every generated ID, so running the same description twice created
  two registry entries for the same asset. ID is now a deterministic content hash of the
  visual description.
- **`asset-library.js` `_saveRegistry` — non-atomic write corrupts JSON under concurrency** (#bug):
  A crash mid-write left a truncated `assets.json`. Registry is now written to a `.tmp` file
  and atomically renamed, so readers always see a complete file.
- **`pipeline/providers.js` `_download` — no redirect following** (#bug): Pollinations and most
  image CDNs issue 302 redirects. The old helper rejected non-200 responses, making every
  Pollinations download fail. The method now follows up to 5 redirects and cleans up the
  partial output file on any error.
- **`pipeline/providers.js` `httpPost`/`httpGet` — no request timeout** (#bug): Both helpers
  had no socket timeout, so a hung connection (e.g., LLM provider under load) blocked the
  process indefinitely. A 30-second `timeout` option is now set on every request.
- **`fact-checker/review-gate.js` `_sendReviewRequest` — dead `escaped` variable** (#cleanup):
  The method built an `escaped` string with MarkdownV2 escaping but then passed the raw
  `message` (not `escaped`) to Telegram with `parse_mode: 'Markdown'`. Raw message with
  unescaped markdown caused Telegram 400 errors. Fixed: removed the unused `escaped` variable
  and dropped `parse_mode` so the message is delivered as plain text.
- **`fact-checker/review-gate.js` `_waitForDecisions` — silent TIMEOUT_APPROVE** (#bug):
  Timed-out claims were marked `TIMEOUT_APPROVE` and logged only at `warn` level, silently
  releasing the pipeline. They are now marked `TIMEOUT` (neutral decision, visible in state
  machine logs, no auto-approve semantics).
- **`fact-checker/checker.js` `_searchBrave` — `r.age` NaN year** (#bug): Brave Search returns
  `r.age` as a human-readable string like `"5 days ago"`, which `new Date("5 days ago")` parses
  as `Invalid Date` (year `NaN`). The field `r.page_age` is the ISO date string — used that
  instead, with `new Date().getFullYear()` as the fallback.
- **`pipeline/artifact-retention.js` `sweepExpiredIntermediates` — shallow scan** (#bug): The
  sweep only descended one directory level from `filesDir`, missing retention tags in
  `video_tmp` and deep production subdirectories. The directory walk is now fully recursive.

---

## [1.3.1] — 2026-11-02

### Fixed

- **`server.js` `publish_video` tool — double Telegram delivery** (#bug): The handler sent
  the video inline via `spawnSync('curl')` and then immediately called `runPublishing()`,
  which also sends to Telegram when `channels` includes `'telegram'`. Removed the redundant
  inline curl block; the tool now delegates entirely to `runPublishing()`.
- **`server.js` `n8n_webhook_trigger` — dead destructure** (#cleanup): `const { https: _https,
  http: _http } = require('https')` was a no-op (the `https` module has no `http` export) and
  the variables were unused. Removed the dead line.
- **`fact-checker/checker.js` `_searchBrave` — gzip decode corruption** (#bug): The Brave Search
  request included `Accept-Encoding: gzip` but `_httpsGet` collects raw Buffer chunks and decodes
  them as UTF-8 directly. A gzip-compressed response would produce garbled JSON and a parse error.
  Removed the `Accept-Encoding: gzip` header so the server responds with plain JSON.
- **`renderer.js` `_captionFilter` — dead re-escape** (#cleanup): The caption was already stripped
  of `:` and `%` characters by the preceding regex, making the subsequent `.replace(/:/g, '\\:')` and
  `.replace(/%/g, '\\%')` calls unreachable no-ops. Removed the dead replacements.
- **`quality-gate/gate.js` — comment/code mismatch** (#docs): The file header said
  `Integrated loudness: -14 LUFS ±1.0 LU` and `True peak: ≤ -1.0 dBTP`, but the actual
  enforcement thresholds in code are ±1.5 LU and -0.5 dBTP. Corrected the comments.
- **`animation-system.js` `_zoomIn`/`_zoomOut` — frames param unused** (#bug): Both functions
  accepted a `frames` argument but always used a fixed step constant regardless of duration.
  The zoom step is now proportional to `frames` so a 2-second scene zooms at the same visual
  speed as a 10-second scene. A 2× cap prevents snapping on very short scenes.
- **`retry-policy.js` Script timeout too short** (#bug): The `Script` stage timeout was 3 min,
  but LLM calls with `maxTokens: 32000` on slower providers routinely exceed that, causing
  spurious retries and dead-letters. Raised to 5 min (matching `Research`).
- **`workflows/assets.js` — null imagePaths in output hash** (#bug): For scenes with a
  user-supplied `video_path`, `imagePath` is `null`. The hash was computed from
  `results.map(r => r.imagePath).join(',')` which included literal `null` strings, making the
  hash content-unstable across runs. Hash is now computed from `sceneId:voicePath` pairs which
  are always populated.
- **`cli/doctor.js` — incomplete LLM detection** (#bug): The LLM provider check only tested for
  `LLM_BASE_URL` but missed `WEBHOOK_LLM_URL` and `OLLAMA_BASE_URL` / `PROVIDER_LLM=ollama`.
  Ollama users with only `PROVIDER_LLM=ollama` set would receive a false warning. All three
  env-var shapes are now detected.

---

## [1.2.0] — 2026-11-02

### Added
- **YouTube Data API v3 uploader** — full OAuth2 resumable chunked upload
  (`YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` + `YOUTUBE_REFRESH_TOKEN`).
  Uploads default to `private` privacy; set `YOUTUBE_PRIVACY=public|unlisted` to override.
- **`docs/youtube-upload.md`** — step-by-step OAuth2 setup guide with troubleshooting table.
- **Real search API support in fact-checker** — set `SEARCH_API_KEY` +
  `SEARCH_PROVIDER=tavily|brave|searxng` to verify claims against live web results.
  Falls back to LLM-synthesized sources when no key is configured.
- **Asset library download implementation** — `_downloadAsset()` now performs a real
  HTTPS download with redirect-following (up to 5 hops); partial files are cleaned up on error.
- **Asset library Pollinations integration** — `_callPollinationsAPI()` now downloads the
  generated image to disk instead of returning a URL string.
- **Asset library FFmpeg composition** — `composeCharacter()` uses `ffmpeg overlay` filter
  to layer identity + pose + emotion PNGs; falls back gracefully to pose-only if FFmpeg fails.
- **Asset library keyword search** — `_semanticSearch()` implements term-overlap scoring
  against `visual_description`, `tags`, and metadata fields (no embedding API required).
- **`log-redaction.js` expanded** — added patterns for ElevenLabs (`sk_`), Tavily (`tvly-`),
  Brave Search (`BSA`), fal.ai (`key_`), Replicate (`r8_`), 32-64 char hex internal tokens,
  and new JSON key names for webhook URLs, MCP auth, YouTube, and search credentials.
- **`CONTRIBUTING.md`** — contributor guide with PR workflow and coding standards.
- **`SECURITY.md`** — vulnerability disclosure policy.
- **`LICENSE`** — MIT license.
- **`CHANGELOG.md`** — this file.

### Changed
- `_logForReview()` in `publishing.js` now uses the already-imported `fsSync` instead of
  re-requiring `fs` at call time.
- Commit message convention locked: no `feat:`/`fix:`/`docs:` prefixes — plain imperative only.
- Git author set to `AMG555 <amgt503@gmail.com>`.

---

## [1.1.0] — 2026-11-02

### Added
- **`src/cli/doctor.js`** — cross-platform pre-flight checker (Node.js, ffmpeg, ffprobe,
  edge-tts, fonts, env vars, Telegram credentials).
- **`src/cli/make.js`** — standalone one-command video generator (`npm run make -- --topic "..."`).
  Supports `--dry-run`, `--no-shorts`, `--channels`, `--out-dir`, `--style`, `--env`.
- **`src/mcp-server/stdio.js`** — zero-port stdio MCP transport with 8 tools, lazy loading,
  and in-process async job registry. Works with , Cursor, Windsurf, Kiro.
- **Webhook provider adapters** — `WebhookLLMProvider`, `WebhookTTSProvider`,
  `WebhookImageProvider` in `src/pipeline/providers.js`. Configure any HTTP API via env
  vars without code changes.
- **User-supplied media bypass** — `scene.video_path`, `scene.image_path`, `scene.audio_path`
  skip AI generation entirely per scene.
- **`cloudflare-mcp/README.md`** — complete Cloudflare Workers deploy guide.

### Fixed
- P0 crash in `research.js`: `checker.checkClaim()` replaced with `checker.checkClaims([c]).then(r => r[0])`.
- Cross-platform font resolver in `renderer.js` (Windows arialbd/calibrib/segoeui, macOS Helvetica, `FFMPEG_FONT` env override).
- Stale `rate` parameter removed from `tts.synthesize()` call in `assets.js`.

---

## [1.0.0] — 2026-11-01

### Added
- Full A→F pipeline: Research → Script → Assets → Render → Shorts → Packaging → Publishing.
- Cloudflare Workers remote MCP proxy (SSE + Streamable HTTP, ~80% token savings).
- Render-free split worker (`server-render-free.js`) for Render.com + local Pi/Oracle hybrid.
- State machine, retry policy, telemetry, artifact manifest, artifact retention.
- Animation system (10 camera presets), AudioMixer (LUFS -14, sidechain ducking), quality gate.
- Shorts extractor (silence segmentation + focal-point 9:16 crop).
- Fact checker with risk classification, 3-way review gate, 100-claim gold standard set.
- Provider abstraction: Groq, OpenAI, watsonx, Ollama, ElevenLabs, Azure TTS, fal.ai,
  Replicate, DALL-E 3, Pollinations.
