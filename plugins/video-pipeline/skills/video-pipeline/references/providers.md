# Provider Environment Variable Reference

All secrets come from environment variables. Never hardcode them.
Copy `.kiro/config/production-secrets.env.template` → `.env` to get started.

---

## LLM Providers (`PROVIDER_LLM`)

### groq (default)
```bash
PROVIDER_LLM=groq
GROQ_API_KEY=gsk_...
# Optional overrides:
LLM_MODEL=llama-3.3-70b-versatile   # default
LLM_BASE_URL=https://api.groq.com/openai/v1
```

### watsonx (IBM — enterprise / data-residency)
```bash
PROVIDER_LLM=watsonx
WATSONX_API_KEY=...                  # IBM Cloud API key
WATSONX_PROJECT_ID=...               # from IBM Cloud → watsonx.ai → Projects
LLM_BASE_URL=https://us-south.ml.cloud.ibm.com/ml/v1   # or eu-de / jp-tok
LLM_MODEL=ibm/granite-3-3-8b-instruct   # or granite-3-3-2b-instruct
```
Granite 3.3 supports function calling and 128 K context. All inference stays
in your IBM Cloud region — no data leaves your residency boundary.

### openai
```bash
PROVIDER_LLM=openai
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o        # default
```

### ollama (local, no key)
```bash
PROVIDER_LLM=ollama
LLM_BASE_URL=http://localhost:11434/api
LLM_MODEL=llama3.2      # whatever you have pulled
```

---

## TTS Providers (`PROVIDER_TTS`)

### edge-tts (default — free, no key, 300+ voices, offline)
```bash
PROVIDER_TTS=edge-tts
# No key required. Needs: npm install -g edge-tts
# Voice list: edge-tts --list-voices
```

### elevenlabs (voice cloning)
```bash
PROVIDER_TTS=elevenlabs
ELEVENLABS_API_KEY=sk_...
# Optional:
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # default: Rachel
```

### azure (enterprise)
```bash
PROVIDER_TTS=azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=eastus   # or westeurope, etc.
```

### openai
```bash
PROVIDER_TTS=openai
OPENAI_API_KEY=sk-...
# Uses tts-1-hd model, alloy voice by default
```

---

## Image Providers (`PROVIDER_IMAGE`)

### pollinations (default — free, no key)
```bash
PROVIDER_IMAGE=pollinations
# No key required. Uses flux model.
```

### fal (fast, FLUX-based)
```bash
PROVIDER_IMAGE=fal
FAL_API_KEY=...
```

### replicate
```bash
PROVIDER_IMAGE=replicate
REPLICATE_API_TOKEN=r8_...
```

### dalle (DALL-E 3)
```bash
PROVIDER_IMAGE=dalle
OPENAI_API_KEY=sk-...
```

---

## Delivery

### Webhook
```bash
PUBLISH_WEBHOOK_URL=https://your-receiver.example.com/webhook
REVIEW_NOTIFY_URL=https://your-receiver.example.com/review
```

### Local File (default)
```bash
# Copies master and shorts to output folder
# No external credentials needed
```

---

## Telemetry / state (optional PostgreSQL)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/vidpipeline
```
Without this, state is stored to `.n8n-files/productions/` (JSON files)
and telemetry is written to `logs/usage.ndjson`.

---

## IBM Bob specific

Bob discovers MCP servers from `~/.bob/mcp.json`:
```json
{
  "mcpServers": {
    "video-pipeline": {
      "command": "node",
      "args": ["/absolute/path/to/src/mcp-server/server.js"],
      "env": {
        "PROVIDER_LLM": "watsonx",
        "WATSONX_API_KEY": "${WATSONX_API_KEY}",
        "WATSONX_PROJECT_ID": "${WATSONX_PROJECT_ID}",
        "PROVIDER_TTS": "edge-tts",
        "PROVIDER_IMAGE": "pollinations"
      }
    }
  }
}
```
Restart Bob after adding. The 6 tools appear in Bob's tool palette.
