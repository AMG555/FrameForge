# FrameForge — Agent Handbook

---

## ⚠️ ARE YOU A USER OR A CONTRIBUTOR?

**If you cloned FrameForge to make videos:** Stop reading this file. Read `CLAUDE.md` instead — it contains everything you need. Your job is calling MCP tools, not understanding this codebase.

**If you are a contributor, maintainer, or working on FrameForge itself:** Continue reading.

---

## Project Identity

**Name:** FrameForge  
**Version:** 2.3.1  
**Repo:** https://github.com/AMG555/FrameForge  
**Tagline:** AI video production engine for any agentic IDE — via Cloudflare Remote MCP.

FrameForge is a rendering execution engine. The IDE is the intelligence. The IDE agent writes the video script. FrameForge handles TTS synthesis, AI image generation, FFmpeg compositing, audio mastering, quality gating, and delivery.

---

## Ground Rules for Contributors

1. **No shell string injection** — always `spawnSync(cmd, [args, array])`, never template strings in shell commands.
2. **FFmpeg robustness** — always pass `-nostdin`. Maintain LUFS −14 ±1.5 LU, true peak ≤ −0.5 dBTP, bt709/yuv420p/H.264.
3. **Cross-platform** — font paths, path separators, binary locations must handle Win/Mac/Linux.
4. **No secrets in code** — all keys via `.env` / wrangler secrets.
5. **No process.env mutation for TTS** — use `new TTSProvider({ platform, voice, rate, apiKey })` per call. Mutating env is a race condition on the concurrent MCP server.
6. **No Kiro references** — the `.kiro/` folder is purged from history. Never recreate it or reference it.
7. **Plain commit messages** — imperative sentences, no `feat:`/`fix:`/`docs:` prefixes.
8. **Security invariants** — all HTTP servers must use `timingSafeEqual`, reject bodies > 4 MB, validate `productionId` against `/[/\\]/`, and validate `outputPath` inside `FILES_DIR`.
9. **Test before commit** — `npm test` (512 pass), `npm run validate` (113 pass).

---

## Architecture

### Entry Points

```
npm run make -- --topic "..."     Standalone CLI
npm run doctor                    Pre-flight: Node, FFmpeg, edge-tts, env vars
npm run setup                     Interactive key wizard → writes .env
npm run mcp:stdio                 Stdio MCP
npm start (port 3210)             HTTP MCP
Cloudflare Workers MCP            Remote HTTPS MCP
npm run start:worker              Background queue worker (port 3211)
npm run start:worker:render       Render.com free tier worker (api_only)
npm run start:local-render        Full local FFmpeg render worker
```

### Pipeline Flow

```
IDE Agent → create_video_from_script / research_topic / write_script
              │
              ▼
 src/workflows/
   research.js    Any persona/style/format/audience. Real search or LLM fallback.
   script.js      Schema v2.0.0. normaliseScene() validates + clamps all fields.
   assets.js      Parallel image gen + TTS. video_path/image_path/audio_path bypass per scene.
   render.js      FFmpeg zoompan + caption drawtext → scene MP4s → AudioMixer LUFS pass.
   shorts.js      Silence segmentation → focal-point 9:16 crop → short MP4s.
   packaging.js   Manifest JSON + metadata + thumbnail prompt.
   publishing.js  file copy + HTTP webhook.
              │
              ▼
 src/pipeline/
   providers.js           LLM / TTS / Image abstraction
   state-machine.js       File + PostgreSQL state; per-productionId write mutex
   retry-policy.js        FATAL / NON_RETRYABLE / RETRYABLE; exponential backoff + jitter
   telemetry.js           NDJSON + PostgreSQL cost tracking
   artifact-manifest.js   SHA-256 content-addressed manifest; idempotent resume
   artifact-retention.js  PERMANENT / 30-day / temp sweep policies
   external-adapter.js    HTTP bridge to external platforms
```

### Deployment Topology

```
IDE Agent (Bob / Codex / Cursor / Windsurf / Claude Code)
  │  HTTPS Bearer MCP_AUTH_TOKEN
  ▼
Cloudflare Workers  (video-mcp.*.workers.dev/mcp)
  │  HTTP Bearer INTERNAL_API_TOKEN
  ▼
Render Free API  (src/worker/server-render-free.js)  ← network-only, 512 MB RAM
  │  HTTP Bearer INTERNAL_API_TOKEN  (for FFmpeg jobs)
  ▼
Local machine / Pi / VPS  (src/worker/server.js)  ← FFmpeg render
  ▼
File output / Webhook receiver
```

---

## All Modules

### Entry points
| File | Purpose |
|------|---------|
| `src/cli/doctor.js` | Pre-flight checks |
| `src/cli/make.js` | Standalone CLI |
| `src/cli/setup-keys.js` | Interactive .env wizard |
| `src/mcp-server/server.js` | HTTP MCP (port 3210) — 17 tools |
| `src/mcp-server/stdio.js` | Stdio MCP |
| `src/worker/server.js` | Worker HTTP API (port 3211) |
| `src/worker/server-render-free.js` | Render.com free tier worker |
| `cloudflare-mcp/src/index.js` | Cloudflare Workers remote MCP |

### Pipeline workflows
| File | Key facts |
|------|-----------|
| `src/workflows/research.js` | Generic — any persona/format/style/audience |
| `src/workflows/script.js` | `normaliseScene()` exported. Schema v2.0.0. |
| `src/workflows/assets.js` | Parallel batch. `skipImages`, `skipTts` flags. |
| `src/workflows/render.js` | FFmpeg + AudioMixer. Returns `{ masterPath, passed, qcReport }`. |
| `src/workflows/shorts.js` | Silence segmentation + ShortsExtractor focal-point crop. |
| `src/workflows/packaging.js` | ArtifactManifest + metadata JSON. |
| `src/workflows/publishing.js` | file copy + HTTP webhook POST. |
| `src/workflows/ingest.js` | Import user clips/images/audio → scenes manifest. |

### Security properties (do not regress)
| Property | Implementation |
|----------|---------------|
| Auth token comparison | `crypto.timingSafeEqual` in all 3 HTTP servers |
| Body size limit | 4 MB, HTTP 413 |
| productionId guard | `/[/\\]/` check before any path construction |
| outputPath guard | must be inside `FILES_DIR` in `multi_voice_tts` |
| SSRF guard | `_assertSafeWebhookUrl()` blocks RFC-1918, loopback, link-local |
| Path traversal | `audioPath` and `downloadOutput.localPath` validated against `FILES_DIR` |
| CLI injection | timestamps allowlisted to `/^[0-9]+([.:][0-9]+)*$/` |
| Credential redaction | 14+ patterns in `log-redaction.js` |
| Worker API auth | `INTERNAL_API_TOKEN` Bearer on all non-health routes |

---

## MCP Tools (all 17)

| # | Tool | Key behaviour |
|---|------|---------------|
| 1 | `research_topic` | Any topic — `persona`, `style`, `format`, `audience` params |
| 2 | `write_script` | Schema v2.0.0 — `language`, `persona`, `format`, `targetDuration`, `imageStyle` |
| 3 | `generate_scene_image` | `imageStyle` controls aesthetic; seed offset per scene |
| 4 | `render_tts` | Voice arg overrides env; telemetry tracked |
| 5 | `assemble_video` | FFmpeg + AudioMixer + 7-gate QC → master MP4 |
| 6 | `publish_video` | Delegates entirely to `runPublishing()` |
| 7 | `ingest_media` | Scenes inline / file / media dir auto-discovery |
| 8 | `edit_scenes` | Patch by `{sceneIndex, field, value}`; `productionId` path-traversal guard |
| 9 | `render_from_scenes` | `skipImages`, `skipTts` flags |
| 10 | `external_platform_call` | ingest / render / status / download; ExternalAdapter handles auth + polling |
| 11 | `create_video_from_script` | Agent-first. IDE writes `scenes[]`, FrameForge renders. |
| 12 | `multi_voice_tts` | Per-call TTS override; `outputPath` must be inside `FILES_DIR` |
| 13 | `queue_full_pipeline` | POST to `WORKER_API_URL/jobs`; returns `{jobId}` immediately |
| 14 | `get_job_status` | Poll queued jobs via worker API |
| 15 | `scaffold_animation_project` | Copy engine template + generate starter edit.js |
| 16 | `validate_storyboard` | 4-gate STORYBOARD.md validator |
| 17 | `render_animation` | Playwright renderer: sheet/strip/storyboard/crop/full/mux/look |

---

## Test Suite

```bash
npm test            # 512 tests, 109 suites
npm run validate    # 113 structural checks
```

---

## Removed — Do Not Re-introduce

- `.kiro/` folder — IBM Kiro IDE dev artifacts, purged from git history
- `workflow.json`, `daily-video-workflow.json` — stale n8n workflow exports
- Telegram / YouTube delivery channels — replaced with `file` + `webhook`
- `ancient_man/`, `modern_man/` character directories — hardcoded domain content
- `n8n-log-redaction.js` — use `log-redaction.js`
- `youtubeTitle` field — use `title`

---

## Known Gaps

| Priority | Task |
|----------|------|
| P3 | E2E integration test with real providers (needs API keys in CI) |
