# Changelog

All notable changes to FrameForge are documented here.

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

**`npm run doctor`** updated — detects all 10 providers, shows active model name, recommends free options with a better fix message.

**`npm run setup` wizard** updated — all 6 new providers in the menu, WatsonX removed.

**`.kiro/config/production-secrets.env.template`** — full rewrite:
- All 10 LLM providers documented with inline links
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

**4 new MCP tools** (accessible from Cursor, Claude Code, Kiro, Windsurf, IBM Bob)
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
  and in-process async job registry. Works with IBM Bob, Cursor, Windsurf, Kiro.
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
