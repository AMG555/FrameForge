# Changelog

All notable changes to FrameForge are documented here.

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
