# MCP Tool Reference

FrameForge exposes 13 tools on the HTTP MCP server (`http://localhost:3210`)
and via the Cloudflare Remote MCP proxy. Any MCP-compatible client works:
IBM Bob, Claude Code, Codex, opencode, Cursor, Windsurf.

---

## Agent-first path (recommended)

The IDE writes the scenes array; FrameForge renders it.

### create_video_from_script

```json
{
  "scenes": [
    {
      "narration": "WiFi sends data as invisible radio waves.",
      "caption": "RADIO WAVES",
      "visual_description": "router emitting waves, flat illustration",
      "camera_hint": "slow_zoom_in",
      "music_mood": "calm"
    }
  ],
  "title": "How WiFi Works",
  "skipImages": false,
  "withMusic": true
}
```

Returns: `{ productionId, masterPath, passed, sizeBytes, sceneCount }`

---

## Full pipeline path

### research_topic

```json
{ "topic": "How does GPS work?", "claimCount": 10, "style": "educational" }
```

### write_script

```json
{
  "productionId": "prod-001",
  "claims": ["..."],
  "topic": "How does GPS work?",
  "persona": "tech explainer",
  "sceneCount": 15
}
```

Returns: `{ productionId, scenes, title, description, tags, sceneCount }`

### render_from_scenes

```json
{ "productionId": "prod-001", "skipImages": false, "withMusic": true }
```

### publish_video

```json
{
  "productionId": "prod-001",
  "masterPath": "/path/to/final_video.mp4",
  "channels": ["file"],
  "outputDir": "/path/to/output"
}
```

Channels:
- `file` — copy master + shorts to `outputDir` (or `N8N_FILES_DIR/published/`)
- `webhook` — POST JSON summary to `PUBLISH_WEBHOOK_URL`

---

## Edit path

### ingest_media

```json
{ "files": ["/path/to/clip1.mp4", "/path/to/clip2.mp4"], "title": "My Video" }
```

### edit_scenes

```json
{
  "productionId": "prod-001",
  "edits": [{ "sceneIndex": 0, "field": "caption", "value": "NEW CAPTION" }]
}
```

---

## TTS

### multi_voice_tts

```json
{
  "text": "The text to speak aloud.",
  "outputPath": "/files-dir/voice_0.m4a",
  "platform": "elevenlabs",
  "voice": "your_cloned_voice_id",
  "apiKey": "sk_..."
}
```

---

## Async job control

### queue_full_pipeline

```json
{
  "topic": "Why planes avoid straight lines",
  "style": "educational",
  "channels": ["file"]
}
```

Returns `{ jobId, status }` immediately. Poll `get_job_status` for completion.

### get_job_status

```json
{ "jobId": "job_1234567890_abc123" }
```

Returns `{ status: "RUNNING"|"SUCCEEDED"|"FAILED", result, error }`

---

## External platform

### external_platform_call

```json
{ "action": "ingest", "files": ["/path/to/clip.mp4"] }
```

Actions: `ingest` | `render` | `status` | `download`.
Configure with `EXTERNAL_PLATFORM_URL` + `EXTERNAL_PLATFORM_KEY` in `.env`.

---

## Calling from any IDE

Any IDE that supports MCP calls these tools via JSON-RPC:

```json
POST http://localhost:3210
{
  "method": "tools/call",
  "params": {
    "name": "create_video_from_script",
    "arguments": { "scenes": [...] }
  },
  "id": 1
}
```
