# Changelog

All notable changes to FrameForge are documented here.

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
  - `scripts/stock.py` — Pexels stock footage/image downloader (free API key); Pollinations fallback for images
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
