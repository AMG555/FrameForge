# MCP Tool Schemas & Examples

The MCP server runs on `http://localhost:3210` and exposes 6 tools.
Any MCP-compatible client (IBM Bob, Claude Code, Cursor, Windsurf, Kiro) can call them.

---

## research_topic

Research a topic, fact-check all claims, and return structured talking points.

**Input**
```json
{
  "productionId": "prod-001",
  "topic": "Why you should never Google customer-care numbers",
  "targetDuration": 60
}
```

**Output**
```json
{
  "productionId": "prod-001",
  "topic": "...",
  "facts": [
    { "claim": "...", "source": "https://...", "verified": true }
  ],
  "hookIdeas": ["...", "...", "..."],
  "talkingPoints": ["...", "..."]
}
```

---

## write_script

Turn research into a timed scene-by-scene script.

**Input**
```json
{
  "productionId": "prod-001",
  "topic": "...",
  "researchJson": { "...": "..." },
  "style": "educational explainer, 55-65s, simple language",
  "targetDuration": 60
}
```

**Output**
```json
{
  "productionId": "prod-001",
  "scenes": [
    {
      "index": 0,
      "label": "hook",
      "voiceText": "Did you know...",
      "captionLines": ["Did you know", "₹47 crore was stolen"],
      "visualPrompt": "Person looking at phone shocked, simple ink doodle style",
      "durationEstSec": 5
    }
  ],
  "fullVoiceText": "Did you know... [full script]",
  "estimatedDurationSec": 58
}
```

---

## generate_scene_image

Generate a 1920×1080 scene image from a visual prompt.

**Input**
```json
{
  "productionId": "prod-001",
  "sceneIndex": 0,
  "prompt": "Person looking at phone shocked, Simple History ink doodle style, high contrast black on white",
  "style": "Simple History ink doodle",
  "width": 1920,
  "height": 1080
}
```

**Output**
```json
{
  "productionId": "prod-001",
  "sceneIndex": 0,
  "imagePath": "/home/node/.n8n-files/video_tmp/scene_0.png",
  "provider": "pollinations"
}
```

---

## render_tts

Synthesise voice for one scene.

**Input**
```json
{
  "productionId": "prod-001",
  "sceneIndex": 0,
  "text": "Did you know ₹47 crore was stolen last year just from fake customer-care numbers?",
  "voice": "en-US-GuyNeural",
  "rate": "-5%"
}
```
Common voices: `en-US-GuyNeural` (male), `en-US-JennyNeural` (female),
`en-IN-NeerjaNeural` (Indian English female).

**Output**
```json
{
  "productionId": "prod-001",
  "sceneIndex": 0,
  "audioPath": "/home/node/.n8n-files/video_tmp/voice_0.m4a",
  "sizeBytes": 48312
}
```

---

## assemble_video

Assemble all rendered scenes into a master MP4, run quality gate.

**Input**
```json
{
  "productionId": "prod-001",
  "sceneCount": 6,
  "musicPath": "/home/node/.n8n-files/music/background.mp3",
  "musicVolume": 0.08
}
```
`musicPath` is optional. `musicVolume` range: 0.01–0.5 (default 0.08).

**Output**
```json
{
  "productionId": "prod-001",
  "masterPath": "/home/node/.n8n-files/video_tmp/master.mp4",
  "qualityGate": {
    "passed": true,
    "checks": [
      { "name": "integrated_loudness", "type": "HARD_GATE", "passed": true,
        "expected": "-14 ±1.5 LU", "actual": "-13.8 LUFS" }
    ],
    "diagnostics": [
      { "metric": "duration_seconds", "value": 58.2, "unit": "s" }
    ]
  }
}
```

---

## publish_video

Deliver the master to Telegram and/or YouTube.

**Input**
```json
{
  "productionId": "prod-001",
  "masterPath": "/home/node/.n8n-files/video_tmp/master.mp4",
  "channels": ["telegram"],
  "youtubeTitle": "Never Google This Number — Here's Why",
  "youtubeDescription": "..."
}
```

**Output**
```json
{
  "productionId": "prod-001",
  "results": {
    "telegram": { "ok": true, "messageId": 12345 }
  }
}
```

---

## Calling from IBM Bob

Bob calls MCP tools directly. Example conversation:

> **You:** Make a video about SIM swap scams. Keep it under 60 seconds.
>
> **Bob:** I'll run the video pipeline. Starting research...
> `research_topic(topic="SIM swap scams", productionId="prod-sim-001", targetDuration=60)`
> ...
> `write_script(...)`
> ...
> (for each scene) `generate_scene_image(...)`, `render_tts(...)`
> ...
> `assemble_video(productionId="prod-sim-001", sceneCount=5)`
> Quality gate passed. Master at `/home/node/.n8n-files/video_tmp/master.mp4`
> `publish_video(..., channels=["telegram"])`
> ✅ Delivered to Telegram (message 12345).

## Calling from n8n

n8n calls the MCP server via HTTP POST to `http://localhost:3210`:

```json
POST /
{
  "method": "tools/call",
  "params": {
    "name": "research_topic",
    "arguments": {
      "productionId": "{{ $json.productionId }}",
      "topic": "{{ $json.topic }}"
    }
  },
  "id": 1
}
```
