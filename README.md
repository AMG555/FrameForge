# Video Agent — Autonomous AI Video Production Pipeline

Automated overnight video factory: research → script → images → TTS → FFmpeg → Telegram/YouTube.

Runs autonomously via n8n cron at 1AM. Also exposes a full **MCP server** (port 3210) so any agentic IDE (IBM Bob, Kiro, Cursor, Windsurf) can drive the pipeline as tool calls.

---

## Architecture

```
TRIGGER (cron / manual / MCP tool call)
    │
    ├─ Research (Groq / OpenAI / watsonx — pluggable)
    ├─ Script (55 scenes, structured JSON)
    ├─ Per-scene: Image (Pollinations / fal.ai / Replicate) + TTS (edge-tts / ElevenLabs / Azure)
    ├─ Assemble Master (FFmpeg concat + sidechain ducking + LUFS normalisation)
    ├─ Quality Gate (hard gates: resolution, codec, LUFS, no black/frozen frames)
    ├─ Shorts Extraction (saliency-aware 9:16 crop, content scoring)
    └─ Publish (Telegram; YouTube adapter pluggable)
```

---

## Quick Start (n8n)

1. **Copy secrets template**
   ```bash
   cp .kiro/config/production-secrets.env.template .env
   # Fill in GROQ_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
   ```

2. **Set n8n environment variables**
   Add to your n8n `.env` or Docker env:
   ```
   GROQ_API_KEY=gsk_...
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=835950034
   GEMINI_API_KEY=AIza...   # optional, for better thumbnails
   TELEGRAM_API_BASE=https://api.telegram.org/bot123456:ABC...
   ```

3. **Import workflow.json** into n8n
   - The `Daily 1 AM` trigger runs automatically
   - Use `Manual Test` to trigger immediately

---

## Quick Start (MCP Server — IBM Bob / Kiro / Cursor)

```bash
node src/mcp-server/server.js
# Listens on http://127.0.0.1:3210
# Health: GET http://127.0.0.1:3210/health
```

Register in your IDE's MCP config:
```json
{
  "mcpServers": {
    "video-agent": {
      "url": "http://127.0.0.1:3210",
      "description": "Autonomous video production pipeline"
    }
  }
}
```

Available tools: `research_topic`, `write_script`, `generate_scene_image`, `render_tts`, `assemble_video`, `publish_video`

---

## Provider Configuration

All providers are swapped via environment variables — no code changes needed.

| Service  | Default       | Alternatives                          |
|----------|---------------|---------------------------------------|
| LLM      | `groq`        | `openai`, `watsonx`, `ollama`         |
| TTS      | `edge-tts`    | `elevenlabs`, `azure`, `openai`       |
| Image    | `pollinations`| `falai`, `replicate`, `dalle`         |

```bash
PROVIDER_LLM=watsonx PROVIDER_TTS=elevenlabs PROVIDER_IMAGE=falai node src/mcp-server/server.js
```

---

## Source Modules

| Module | Purpose |
|--------|---------|
| [`src/pipeline/state-machine.js`](src/pipeline/state-machine.js) | PostgreSQL/file-backed production state machine |
| [`src/pipeline/providers.js`](src/pipeline/providers.js) | LLM / TTS / Image provider abstraction |
| [`src/pipeline/retry-policy.js`](src/pipeline/retry-policy.js) | Exponential backoff, error classification, stage timeouts |
| [`src/pipeline/telemetry.js`](src/pipeline/telemetry.js) | Cost tracking, usage events, per-video cost report |
| [`src/mcp-server/server.js`](src/mcp-server/server.js) | MCP server — 6 registered tools |
| [`src/quality-gate/gate.js`](src/quality-gate/gate.js) | Hard gates: LUFS, codec, resolution, black/frozen frames |
| [`src/audio-mixer/mixer.js`](src/audio-mixer/mixer.js) | Sidechain ducking, LUFS normalisation |
| [`src/shorts-extractor/extractor.js`](src/shorts-extractor/extractor.js) | Segment scoring, vertical 9:16 crop |
| [`src/fact-checker/checker.js`](src/fact-checker/checker.js) | Risk-based claim verification, deterministic gates |
| [`src/video-renderer/renderer.js`](src/video-renderer/renderer.js) | Scene render + master assembly |
| [`src/asset-library/asset-library.js`](src/asset-library/asset-library.js) | Composable character/prop/background library |
| [`src/utils/log-redaction.js`](src/utils/log-redaction.js) | Credential masking for logs |

---

## Security

- **No hardcoded credentials** in `workflow.json` — all via `{{$env.VAR_NAME}}`
- **Log redaction** covers 10+ credential patterns (gsk_*, AIza*, Telegram tokens, Bearer tokens)
- **Credential rotation**: update env var → restart n8n → test → revoke old
- See [`.kiro/security/`](.kiro/security/) for rotation procedures

---

## Quality Gates (Hard — video never publishes without passing)

| Gate | Threshold |
|------|-----------|
| Resolution | 1920x1080 (master), 1080x1920 (short) |
| Codec | H.264, yuv420p |
| Frame rate | 24–30 fps |
| Integrated loudness | −14 LUFS ±1.5 LU |
| True peak | ≤ −0.5 dBTP |
| Black frames | None > 0.5s |
| Frozen frames | None > 0.5s |
| File size | > 1 MB |

---

## Dependencies (runtime)

- **Node.js** ≥ 18 (no npm packages required)
- **FFmpeg** ≥ 6.0 with libx264 + loudnorm filter
- **edge-tts** Python package (`pip install edge-tts`) — or swap for ElevenLabs/Azure
- **ffprobe** (ships with FFmpeg)
- **curl** (ships with most Linux distros)
- **Python 3.10+** (for Pollinations image download in n8n Execute Command nodes)

---

## Credential Rotation

See [`.kiro/security/credential-rotation-checklist.md`](.kiro/security/credential-rotation-checklist.md) for step-by-step procedures for each service.

**Emergency (suspected leak):**
1. Revoke immediately in the service dashboard
2. Generate new key
3. Update env var
4. Restart n8n
5. Verify first workflow run succeeds
