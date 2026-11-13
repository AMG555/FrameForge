/**
 * Provider abstraction layer — LLM, TTS, Image generation.
 *
 * Every provider is stateless. Swap by setting PROVIDER_* env vars.
 * All providers share the same interface — pipeline code never names a vendor.
 *
 * ── LLM providers ──────────────────────────────────────────────────────────
 *
 *  PROVIDER_LLM=groq          Free tier, fastest. llama-3.3-70b-versatile
 *                             GROQ_API_KEY  → console.groq.com
 *
 *  PROVIDER_LLM=openrouter    Route to ANY model (Claude 3.5 Sonnet, GPT-4o,
 *                             Gemini 2.0 Flash, Llama 3.3 70B, Mistral Large,
 *                             DeepSeek R1, Qwen 2.5 72B, …) via one API key.
 *                             OPENROUTER_API_KEY → openrouter.ai
 *                             LLM_MODEL=anthropic/claude-sonnet-4-5   ← override
 *
 *  PROVIDER_LLM=anthropic     Claude Sonnet 4.5 / Haiku / Opus direct.
 *                             ANTHROPIC_API_KEY → console.anthropic.com
 *
 *  PROVIDER_LLM=gemini        Google Gemini 2.0 Flash / 2.5 Pro direct.
 *                             GEMINI_API_KEY → aistudio.google.com
 *
 *  PROVIDER_LLM=mistral       Mistral Large 2 / Codestral / Nemo.
 *                             MISTRAL_API_KEY → console.mistral.ai
 *
 *  PROVIDER_LLM=together      Together AI — Llama 3.3 70B, Mixtral, DBRX, etc.
 *                             TOGETHER_API_KEY → api.together.ai
 *
 *  PROVIDER_LLM=cerebras      Cerebras — llama3.3-70b at 2000+ tok/s.
 *                             CEREBRAS_API_KEY → cloud.cerebras.ai
 *
 *  PROVIDER_LLM=openai        OpenAI GPT-4o / o1 / o3-mini.
 *                             OPENAI_API_KEY → platform.openai.com
 *
 *  PROVIDER_LLM=ollama        Fully local — no key, any Ollama model.
 *                             OLLAMA_BASE_URL + OLLAMA_MODEL
 *
 *  PROVIDER_LLM=webhook       Any OpenAI-compatible endpoint (LM Studio,
 *                             vLLM, LocalAI, your own proxy, VoxForge, …).
 *                             WEBHOOK_LLM_URL  (required)
 *                             WEBHOOK_LLM_HEADERS, WEBHOOK_LLM_RESPONSE_PATH
 *
 *  LLM_MODEL=<model-id>       Override the default model for any provider.
 *  LLM_BASE_URL=<url>         Override the endpoint URL for any provider.
 *
 * ── TTS providers ──────────────────────────────────────────────────────────
 *  PROVIDER_TTS=edge-tts | elevenlabs | azure | openai | webhook
 *
 * ── Image providers ────────────────────────────────────────────────────────
 *  PROVIDER_IMAGE=pollinations | falai | replicate | dalle | webhook
 */

'use strict';

const { spawn } = require('child_process');
const fs     = require('fs').promises;
const path   = require('path');
const https  = require('https');
const http   = require('http');
const crypto = require('crypto');

// ── Shared retry helper ───────────────────────────────────────────────────

async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 2000, label = '' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        if (process.env.DEBUG_PROVIDERS) console.warn(`[${label}] attempt ${attempt} failed: ${err.message} — retry in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed   = new URL(url);
    const lib      = parsed.protocol === 'https:' ? https : http;
    const bodyBuf  = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
    const options  = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': bodyBuf.length, ...headers },
      timeout:  30000,
    };
    const req = lib.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
        } else {
          try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`httpPost timeout: ${url}`)); });
    req.write(bodyBuf);
    req.end();
  });
}

/** HTTP GET — used for Replicate polling and IBM IAM token checks. */
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers:  { 'Content-Type': 'application/json', ...headers },
      timeout:  30000,
    };
    const req = lib.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
        } else {
          try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`httpGet timeout: ${url}`)); });
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Current top models per provider (Nov 2026).
 * All overridable via LLM_MODEL env var. Keep ONLY providers that exist today.
 *
 * Model update guide:
 *   groq:       console.groq.com/docs/models
 *   openrouter: openrouter.ai/models
 *   anthropic:  docs.anthropic.com/en/docs/about-claude/models
 *   gemini:     ai.google.dev/gemini-api/docs/models
 *   mistral:    docs.mistral.ai/getting-started/models
 *   together:   api.together.ai/models
 *   cerebras:   cloud.cerebras.ai/docs
 *   openai:     platform.openai.com/docs/models
 *   ollama:     ollama.com/library
 */
const LLM_DEFAULTS = {
  // ── Free / fast ────────────────────────────────────────────────────────
  groq: {
    baseUrl:   'https://api.groq.com/openai/v1',
    model:     'llama-3.3-70b-versatile',   // fastest free tier, great for scripts
    apiKeyEnv: 'GROQ_API_KEY',
  },
  cerebras: {
    baseUrl:   'https://api.cerebras.ai/v1',
    model:     'llama3.3-70b',              // 2000+ tok/s — fastest inference today
    apiKeyEnv: 'CEREBRAS_API_KEY',
  },
  // ── Router (access all models with one key) ────────────────────────────
  openrouter: {
    baseUrl:   'https://openrouter.ai/api/v1',
    model:     'anthropic/claude-sonnet-4-5',  // override with LLM_MODEL for any model
    apiKeyEnv: 'OPENROUTER_API_KEY',
  },
  // ── Direct cloud APIs ──────────────────────────────────────────────────
  anthropic: {
    // Anthropic uses /v1/messages (not /chat/completions) — handled in chat()
    baseUrl:   'https://api.anthropic.com/v1',
    model:     'claude-sonnet-4-5',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    // Google uses openai-compat endpoint via generativelanguage
    baseUrl:   'https://generativelanguage.googleapis.com/v1beta/openai',
    model:     'gemini-2.0-flash',
    apiKeyEnv: 'GEMINI_API_KEY',
  },
  mistral: {
    baseUrl:   'https://api.mistral.ai/v1',
    model:     'mistral-large-latest',
    apiKeyEnv: 'MISTRAL_API_KEY',
  },
  together: {
    baseUrl:   'https://api.together.xyz/v1',
    model:     'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    apiKeyEnv: 'TOGETHER_API_KEY',
  },
  openai: {
    baseUrl:   'https://api.openai.com/v1',
    model:     'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  // ── Local / self-hosted ────────────────────────────────────────────────
  ollama: {
    baseUrl:   process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api',
    model:     process.env.OLLAMA_MODEL    || 'llama3.3',
    apiKeyEnv: null,
  },
  // ── Generic OpenAI-compatible webhook ─────────────────────────────────
  // Covers: LM Studio, vLLM, LocalAI, VoxForge, any custom proxy
  webhook: {
    baseUrl:   process.env.WEBHOOK_LLM_URL || '',
    model:     process.env.LLM_MODEL       || 'default',
    apiKeyEnv: null,  // auth via WEBHOOK_LLM_HEADERS
  },
};

class LLMProvider {
  constructor() {
    const name     = (process.env.PROVIDER_LLM || 'groq').toLowerCase();
    const defaults = LLM_DEFAULTS[name] || LLM_DEFAULTS.groq;
    this.name      = name;
    this.baseUrl   = process.env.LLM_BASE_URL || defaults.baseUrl;
    this.model     = process.env.LLM_MODEL    || defaults.model;
    this.apiKey    = defaults.apiKeyEnv ? process.env[defaults.apiKeyEnv] : null;
    this._requiredEnv = defaults.apiKeyEnv || null;
    // Do NOT throw here — defer to chat() so the MCP server can start without all keys
  }

  /**
   * Chat completion — OpenAI-compatible interface (with Anthropic + Gemini shims).
   * @param {{ system: string, user: string, temperature?: number, maxTokens?: number }} opts
   * @returns {Promise<string>}
   */
  async chat({ system, user, temperature = 1, maxTokens = 8000 }) {
    if (this._requiredEnv && !this.apiKey) {
      throw new Error(`Missing env var ${this._requiredEnv} for LLM provider ${this.name}. Run: npm run setup`);
    }

    // ── Anthropic native API (uses /messages, different schema) ──────────
    if (this.name === 'anthropic') {
      return this._anthropicChat({ system, user, temperature, maxTokens });
    }

    const body = {
      model:      this.model,
      messages:   [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature,
      max_tokens: maxTokens,
    };

    const authHeader = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};

    // OpenRouter requires an extra header for attribution (optional but encouraged)
    if (this.name === 'openrouter') {
      authHeader['HTTP-Referer'] = 'https://github.com/AMG555/FrameForge';
      authHeader['X-Title']      = 'FrameForge';
    }

    // Ollama uses /api/chat (not /chat/completions)
    const url = this.name === 'ollama'
      ? `${this.baseUrl}/chat`
      : `${this.baseUrl}/chat/completions`;

    return withRetry(async () => {
      const resp = await httpPost(url, body, authHeader);
      const content = resp?.choices?.[0]?.message?.content
        ?? resp?.message?.content
        ?? resp?.content;
      if (!content) throw new Error(`LLM returned no content. finish_reason=${resp?.choices?.[0]?.finish_reason}`);
      return content;
    }, { maxAttempts: 3, baseDelayMs: 10000, label: `LLM(${this.name}/${this.model})` });
  }

  /**
   * Anthropic /v1/messages shim — maps to the same output as OpenAI-compat.
   * @private
   */
  async _anthropicChat({ system, user, temperature, maxTokens }) {
    const body = {
      model:      this.model,
      max_tokens: maxTokens,
      system,
      messages:   [{ role: 'user', content: user }],
    };
    const headers = {
      'x-api-key':         this.apiKey,
      'anthropic-version': '2023-06-01',
    };
    return withRetry(async () => {
      const resp = await httpPost(`${this.baseUrl}/messages`, body, headers);
      const content = resp?.content?.[0]?.text;
      if (!content) throw new Error(`Anthropic returned no content: ${JSON.stringify(resp).slice(0, 200)}`);
      return content;
    }, { maxAttempts: 3, baseDelayMs: 10000, label: `LLM(anthropic/${this.model})` });
  }

  /** Parse JSON out of the raw LLM response, stripping markdown fences. */
  static parseJson(raw) {
    let s = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const fi = s.indexOf('{'), la = s.lastIndexOf('}');
    if (fi < 0 || la <= fi) throw new Error('No JSON object in LLM response');
    s = s.slice(fi, la + 1).replace(/,\s*([}\]])/g, '$1').replace(/\*\*/g, '');
    return JSON.parse(s);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

// ── Task #17: Natural narrator voice table ────────────────────────────────
// Voices are grouped by register. Override with TTS_VOICE env var.
// No artificial rate deepening — all voices are selected for natural quality.
const NARRATOR_VOICES = {
  // edge-tts
  'edge-tts': {
    male:   process.env.TTS_VOICE_MALE   || 'en-US-BrianNeural',   // deep, authoritative
    female: process.env.TTS_VOICE_FEMALE || 'en-US-JennyNeural',   // warm, clear
    default: process.env.TTS_VOICE       || 'en-US-BrianNeural',
  },
  // ElevenLabs — voice IDs
  elevenlabs: {
    male:    process.env.ELEVENLABS_VOICE_MALE    || 'pNInz6obpgDQGcFmaJgB', // Adam
    female:  process.env.ELEVENLABS_VOICE_FEMALE  || '21m00Tcm4TlvDq8ikWAM', // Rachel
    default: process.env.ELEVENLABS_VOICE_ID      || 'pNInz6obpgDQGcFmaJgB',
  },
  // Azure cognitive services
  azure: {
    male:    process.env.AZURE_VOICE_MALE    || 'en-US-GuyNeural',
    female:  process.env.AZURE_VOICE_FEMALE  || 'en-US-JennyNeural',
    default: process.env.TTS_VOICE           || 'en-US-GuyNeural',
  },
  // OpenAI TTS
  openai: {
    male:    'onyx',
    female:  'nova',
    default: process.env.TTS_VOICE || 'onyx',
  },
};

class TTSProvider {
  /**
   * @param {object} [opts]  Per-call overrides — avoids mutating process.env in concurrent calls.
   * @param {string} [opts.platform]   TTS provider name (overrides PROVIDER_TTS)
   * @param {string} [opts.voice]      Voice ID (overrides TTS_VOICE)
   * @param {string} [opts.rate]       Speaking rate (overrides TTS_RATE)
   * @param {string} [opts.apiKey]     API key (overrides provider-specific env var)
   * @param {string} [opts.webhookUrl] Webhook URL (overrides WEBHOOK_TTS_URL)
   * @param {string} [opts.language]   BCP-47 language hint (e.g. 'ml', 'hi', 'fr') used as fallback
   *                                   voice selector when text is in a Latin script
   */
  constructor(opts = {}) {
    this.name        = (opts.platform || process.env.PROVIDER_TTS || 'edge-tts').toLowerCase();
    this._overrides  = opts; // stash for _* methods that read env vars
  }

  /**
   * Select the appropriate narrator voice for this provider.
   * Respects TTS_VOICE env var as an explicit override; otherwise
   * picks by gender preference (TTS_VOICE_GENDER=male|female|default).
   *
   * @param {string} [explicitVoice]  voice passed by caller (takes priority)
   * @param {string} [text]           narration text — Unicode range detection selects script-appropriate voice
   * @param {string} [langHint]       BCP-47 language code (e.g. 'fr', 'pt') — used when text is Latin-script
   *                                  but the production language is known. Falls back to _overrides.language
   *                                  and then to TTS_LANGUAGE env var.
   * @returns {string}
   */
  selectNarratorVoice(explicitVoice, text = '', langHint = '') {
    if (explicitVoice) return explicitVoice;

    const gender = (process.env.TTS_VOICE_GENDER || 'default').toLowerCase();

    // Language detection for edge-tts — Unicode-range script detection + BCP-47 hint
    if (this.name === 'edge-tts') {
      // Unicode script ranges (text content detection)
      if (text && /[\u0D00-\u0D7F]/.test(text)) {
        return gender === 'female' ? 'ml-IN-SobhanaNeural' : 'ml-IN-MidhunNeural';
      }
      if (text && /[\u0900-\u097F]/.test(text)) {
        return gender === 'female' ? 'hi-IN-SwaraNeural' : 'hi-IN-MadhurNeural';
      }
      if (text && /[\u0B80-\u0BFF]/.test(text)) {
        return gender === 'female' ? 'ta-IN-PallaviNeural' : 'ta-IN-ValluvarNeural';
      }
      if (text && /[\u0C00-\u0C7F]/.test(text)) {
        return gender === 'female' ? 'te-IN-ShrutiNeural' : 'te-IN-MohanNeural';
      }
      if (text && /[\u0C80-\u0CFF]/.test(text)) {
        // Kannada
        return gender === 'female' ? 'kn-IN-SapnaNeural' : 'kn-IN-GaganNeural';
      }
      if (text && /[\u0980-\u09FF]/.test(text)) {
        // Bengali
        return gender === 'female' ? 'bn-IN-TanishaaNeural' : 'bn-IN-BashkarNeural';
      }
      if (text && /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text)) {
        return gender === 'female' ? 'zh-CN-XiaoxiaoNeural' : 'zh-CN-YunjianNeural';
      }
      if (text && /[\u3040-\u30FF\u31F0-\u31FF]/.test(text)) {
        return gender === 'female' ? 'ja-JP-NanamiNeural' : 'ja-JP-KeitaNeural';
      }
      if (text && /[\uAC00-\uD7AF]/.test(text)) {
        // Korean
        return gender === 'female' ? 'ko-KR-SunHiNeural' : 'ko-KR-InJoonNeural';
      }
      if (text && /[\u0600-\u06FF]/.test(text)) {
        return gender === 'female' ? 'ar-SA-ZariyahNeural' : 'ar-SA-HamedNeural';
      }
      if (text && /[\u0400-\u04FF]/.test(text)) {
        // Cyrillic (Russian)
        return gender === 'female' ? 'ru-RU-SvetlanaNeural' : 'ru-RU-DmitryNeural';
      }

      // BCP-47 language hint fallback (used when text is English but language is known)
      const lang = (langHint || this._overrides.language || process.env.TTS_LANGUAGE || '').toLowerCase().slice(0, 2);
      const LANG_VOICE_MAP = {
        ml: gender === 'female' ? 'ml-IN-SobhanaNeural'  : 'ml-IN-MidhunNeural',
        hi: gender === 'female' ? 'hi-IN-SwaraNeural'    : 'hi-IN-MadhurNeural',
        ta: gender === 'female' ? 'ta-IN-PallaviNeural'  : 'ta-IN-ValluvarNeural',
        te: gender === 'female' ? 'te-IN-ShrutiNeural'   : 'te-IN-MohanNeural',
        kn: gender === 'female' ? 'kn-IN-SapnaNeural'    : 'kn-IN-GaganNeural',
        bn: gender === 'female' ? 'bn-IN-TanishaaNeural' : 'bn-IN-BashkarNeural',
        mr: gender === 'female' ? 'mr-IN-AarohiNeural'   : 'mr-IN-ManoharNeural',
        gu: gender === 'female' ? 'gu-IN-DhwaniNeural'   : 'gu-IN-NiranjanNeural',
        pa: 'pa-IN-OjasvNeural', // edge-tts only has one Punjabi voice (gender-neutral)
        ur: gender === 'female' ? 'ur-PK-UzmaNeural'     : 'ur-PK-AsadNeural',
        zh: gender === 'female' ? 'zh-CN-XiaoxiaoNeural' : 'zh-CN-YunjianNeural',
        ja: gender === 'female' ? 'ja-JP-NanamiNeural'   : 'ja-JP-KeitaNeural',
        ko: gender === 'female' ? 'ko-KR-SunHiNeural'    : 'ko-KR-InJoonNeural',
        ar: gender === 'female' ? 'ar-SA-ZariyahNeural'  : 'ar-SA-HamedNeural',
        ru: gender === 'female' ? 'ru-RU-SvetlanaNeural' : 'ru-RU-DmitryNeural',
        fr: gender === 'female' ? 'fr-FR-DeniseNeural'   : 'fr-FR-HenriNeural',
        de: gender === 'female' ? 'de-DE-KatjaNeural'    : 'de-DE-ConradNeural',
        es: gender === 'female' ? 'es-ES-ElviraNeural'   : 'es-ES-AlvaroNeural',
        pt: gender === 'female' ? 'pt-BR-FranciscaNeural': 'pt-BR-AntonioNeural',
        it: gender === 'female' ? 'it-IT-ElsaNeural'     : 'it-IT-DiegoNeural',
        nl: gender === 'female' ? 'nl-NL-ColetteNeural'  : 'nl-NL-MaartenNeural',
        pl: gender === 'female' ? 'pl-PL-ZofiaNeural'    : 'pl-PL-MarekNeural',
        sv: gender === 'female' ? 'sv-SE-SofieNeural'    : 'sv-SE-MattiasNeural',
        tr: gender === 'female' ? 'tr-TR-EmelNeural'     : 'tr-TR-AhmetNeural',
        vi: gender === 'female' ? 'vi-VN-HoaiMyNeural'   : 'vi-VN-NamMinhNeural',
        id: gender === 'female' ? 'id-ID-GadisNeural'    : 'id-ID-ArdiNeural',
        th: gender === 'female' ? 'th-TH-PremwadeeNeural': 'th-TH-NiwatNeural',
      };
      if (lang && LANG_VOICE_MAP[lang]) return LANG_VOICE_MAP[lang];
    }

    const voices = NARRATOR_VOICES[this.name] || NARRATOR_VOICES['edge-tts'];
    return voices[gender] || voices.default;
  }

  /**
   * Synthesize text to an MP3/M4A file.
   * @param {{ text: string, voice?: string, outputPath: string }} opts
   *   voice is optional — if omitted, selectNarratorVoice() picks automatically
   * @returns {Promise<string>} resolves with outputPath
   */
  async synthesize({ text, voice, outputPath, language = '' }) {
    const resolvedVoice = this.selectNarratorVoice(voice, text, language);
    switch (this.name) {
      case 'edge-tts':   return this._edgeTTS({ text, voice: resolvedVoice, outputPath });
      case 'elevenlabs': return this._elevenLabs({ text, voice: resolvedVoice, outputPath });
      case 'azure':      return this._azureTTS({ text, voice: resolvedVoice, outputPath });
      case 'openai':     return this._openaiTTS({ text, voice: resolvedVoice, outputPath });
      case 'voxforge':   return this._voxforgeTTS({ text, voice: resolvedVoice, outputPath });
      case 'custom':
      case 'webhook':    return this._customTTS({ text, voice: resolvedVoice, outputPath });
      default:           return this._edgeTTS({ text, voice: resolvedVoice, outputPath });
    }
  }

  /**
   * VoxForge TTS — github.com/amg555/voxforge
   * OpenAI-compatible /v1/audio/speech endpoint with optional voice cloning.
   * Env vars:
   *   VOXFORGE_URL   — base URL, e.g. https://api.voxforge.io  (or self-hosted)
   *   VOXFORGE_KEY   — API key (Bearer token)
   *   VOXFORGE_VOICE — voice ID or cloned speaker ID (default: 'narrator')
   *   VOXFORGE_MODEL — model ID (default: 'voxforge-v1')
   */
  async _voxforgeTTS({ text, voice, outputPath }) {
    const baseUrl = process.env.VOXFORGE_URL || 'https://api.voxforge.io';
    const apiKey  = this._overrides.apiKey || process.env.VOXFORGE_KEY || '';
    const model   = process.env.VOXFORGE_MODEL || 'voxforge-v1';
    const resolvedVoice = voice || process.env.VOXFORGE_VOICE || 'narrator';
    const rate    = this._overrides.rate || process.env.TTS_RATE || '+0%';

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    // Try OpenAI-compatible /v1/audio/speech first; fall back to /v1/tts
    const endpoints = [
      `${baseUrl}/v1/audio/speech`,
      `${baseUrl}/v1/tts`,
    ];

    return withRetry(async () => {
      for (const url of endpoints) {
        try {
          const isOpenAIPath = url.endsWith('/speech');
          const body = isOpenAIPath
            ? { model, input: text, voice: resolvedVoice }
            : { text, voice: resolvedVoice, rate, model };
          const audio = await httpPost(url, body, headers);
          await fs.writeFile(outputPath, Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'binary'));
          const stat = await fs.stat(outputPath);
          if (stat.size > 500) return outputPath;
        } catch (err) {
          if (endpoints.indexOf(url) === endpoints.length - 1) throw err;
          // try next endpoint
        }
      }
      throw new Error('VoxForge: all endpoints failed');
    }, { maxAttempts: 3, baseDelayMs: 3000, label: 'TTS(voxforge)' });
  }

  async _customTTS({ text, voice, outputPath }) {
    const url = this._overrides.webhookUrl || process.env.CUSTOM_TTS_URL || process.env.TTS_WEBHOOK_URL;
    if (!url) throw new Error('CUSTOM_TTS_URL or TTS_WEBHOOK_URL not set for custom/webhook TTS provider');
    const apiKey = this._overrides.apiKey || process.env.CUSTOM_TTS_KEY || '';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const isSpeechEndpoint = /\/v1\/audio\/speech/i.test(url);
    const rate = this._overrides.rate || process.env.TTS_RATE || '+0%';
    const body = isSpeechEndpoint
      ? { model: process.env.TTS_MODEL || 'tts-1', input: text, voice: voice || 'alloy' }
      : { text, voice, rate };

    return withRetry(async () => {
      const audio = await httpPost(url, body, headers);
      await fs.writeFile(outputPath, Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'binary'));
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 3000, label: 'TTS(custom)' });
  }

  async _edgeTTS({ text, voice, outputPath }) {
    try {
      const { isCommandAvailable, ensureEdgeTts } = require('../utils/tool-installer');
      if (!isCommandAvailable('edge-tts')) {
        ensureEdgeTts();
      }
    } catch (_) {}

    const rawPath   = outputPath.replace(/\.[^.]+$/, '_raw.mp3');
    const txtPath   = rawPath + '.txt';
    // voice is always pre-resolved by synthesize() — this fallback is purely defensive
    const safeVoice = voice || this.selectNarratorVoice(null, text, this._overrides.language || '');
    // No artificial rate manipulation — use the voice's natural cadence.
    // Only a mild rate adjustment from env (e.g. TTS_RATE='+0%') is supported.
    const rate = this._overrides.rate || process.env.TTS_RATE || '+0%';
    return withRetry(async () => {
      await fs.writeFile(txtPath, text, 'utf8');
      try {
        await new Promise((resolve, reject) => {
          const proc = spawn('edge-tts', ['--voice', safeVoice, '--rate', rate, '--file', txtPath, '--write-media', rawPath], { timeout: 40000, shell: false });
          let stderr = '';
          proc.stderr?.on('data', d => { stderr += d; });
          proc.on('close', code => code === 0 ? resolve() : reject(new Error(`edge-tts exited ${code}: ${stderr}`)));
          proc.on('error', reject);
        });
        // Normalise audio via FFmpeg — professional sound engineer voice chain:
        // Highpass 80Hz (sub rumble cut) -> Mud notch 300Hz -> Vocal presence 4.5kHz -> Smooth broadcast leveling
        await new Promise((resolve, reject) => {
          const proc = spawn('ffmpeg', ['-nostdin', '-y', '-threads', '2',
            '-i', rawPath,
            '-af', 'silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-40dB,highpass=f=80,equalizer=f=300:t=q:w=1.2:g=-1.5,equalizer=f=4500:t=q:w=1.5:g=1.5,volume=1.0,dynaudnorm=f=150:g=5:p=0.95',
            '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', outputPath], { timeout: 30000 });
          let stderr = '';
          proc.stderr?.on('data', d => { stderr += d; });
          proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)));
          proc.on('error', reject);
        });
      } finally {
        await fs.unlink(txtPath).catch(() => {});
        await fs.unlink(rawPath).catch(() => {});
      }
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 3000, label: 'TTS(edge-tts)' });
  }

  async _elevenLabs({ text, voice, outputPath }) {
    const apiKey   = this._overrides.apiKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');
    const voiceId  = process.env.ELEVENLABS_VOICE_ID || voice || 'Rachel';
    const body     = { text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } };
    return withRetry(async () => {
      const audio = await httpPost(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, body, {
        'xi-api-key': apiKey, 'Accept': 'audio/mpeg', 'Content-Type': 'application/json',
      });
      await fs.writeFile(outputPath, Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'binary'));
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 5000, label: 'TTS(elevenlabs)' });
  }

  async _azureTTS({ text, voice, outputPath }) {
    // Accept both AZURE_SPEECH_KEY (documented) and AZURE_TTS_KEY (legacy)
    const key    = this._overrides.apiKey || process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY;
    const region = process.env.AZURE_SPEECH_REGION || process.env.AZURE_TTS_REGION || 'eastus';
    if (!key) throw new Error('AZURE_SPEECH_KEY env var not set');
    const resolvedVoice = voice || NARRATOR_VOICES.azure.default;
    // Natural rate via override or env TTS_RATE; default is no change (+0%)
    const rate = this._overrides.rate || process.env.TTS_RATE || '+0%';
    const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="${resolvedVoice}"><prosody rate="${rate}">${text}</prosody></voice></speak>`;
    return withRetry(async () => {
      const audio = await httpPost(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        Buffer.from(ssml, 'utf8'),
        { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3' }
      );
      await fs.writeFile(outputPath, Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'binary'));
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 5000, label: 'TTS(azure)' });
  }

  async _openaiTTS({ text, voice, outputPath }) {
    const apiKey = this._overrides.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');
    const body = { model: 'tts-1', input: text, voice: voice || 'onyx' };
    return withRetry(async () => {
      const audio = await httpPost('https://api.openai.com/v1/audio/speech', body, { Authorization: `Bearer ${apiKey}` });
      await fs.writeFile(outputPath, Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'binary'));
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 5000, label: 'TTS(openai)' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE GENERATION PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

class ImageProvider {
  constructor() {
    this.name = (process.env.PROVIDER_IMAGE || 'pollinations').toLowerCase();
  }

  /**
   * Generate an image from a prompt and save to outputPath.
   * @param {{ prompt: string, negativePrompt?: string, outputPath: string, width?: number, height?: number, seed?: number }} opts
   * @returns {Promise<string>} resolves with outputPath
   */
  async generate({ prompt, negativePrompt = '', outputPath, width = 1920, height = 1080, seed = null }) {
    switch (this.name) {
      case 'pollinations': return this._pollinations({ prompt, negativePrompt, outputPath, width, height, seed });
      case 'falai':        return this._falai({ prompt, negativePrompt, outputPath, width, height });
      case 'replicate':    return this._replicate({ prompt, negativePrompt, outputPath, width, height });
      case 'dalle':        return this._dalle({ prompt, outputPath });
      case 'custom':
      case 'webhook':      return this._customImage({ prompt, negativePrompt, outputPath, width, height });
      default:             return this._pollinations({ prompt, negativePrompt, outputPath, width, height, seed });
    }
  }

  async _customImage({ prompt, negativePrompt, outputPath, width, height }) {
    const url = process.env.CUSTOM_IMAGE_URL || process.env.IMAGE_WEBHOOK_URL;
    if (!url) throw new Error('CUSTOM_IMAGE_URL or IMAGE_WEBHOOK_URL not set for custom/webhook image provider');
    const apiKey = process.env.CUSTOM_IMAGE_KEY || '';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const isDalleFormat = /\/v1\/images\/generations/i.test(url);
    const body = isDalleFormat
      ? { prompt, n: 1, size: `${width}x${height}` }
      : { prompt, negative_prompt: negativePrompt, width, height };

    return withRetry(async () => {
      const resp = await httpPost(url, body, headers);
      const imageUrl = resp?.data?.[0]?.url || resp?.images?.[0]?.url || resp?.url;
      const b64Data  = resp?.data?.[0]?.b64_json || resp?.b64_json;
      if (b64Data) {
        await fs.writeFile(outputPath, Buffer.from(b64Data, 'base64'));
        return outputPath;
      }
      if (imageUrl) {
        await this._download(imageUrl, outputPath, 60);
        return outputPath;
      }
      if (Buffer.isBuffer(resp)) {
        await fs.writeFile(outputPath, resp);
        return outputPath;
      }
      throw new Error(`Custom image endpoint returned unrecognized payload format: ${JSON.stringify(resp).slice(0, 100)}`);
    }, { maxAttempts: 3, baseDelayMs: 3000, label: 'Image(custom)' });
  }

  async _pollinations({ prompt, negativePrompt, outputPath, width, height, seed }) {
    const q   = encodeURIComponent(prompt);
    const neg = negativePrompt ? `&negative=${encodeURIComponent(negativePrompt)}` : '';
    const s   = seed !== null ? `&seed=${seed}` : '';
    const models = [['flux', 90], ['turbo', 45]];
    return withRetry(async () => {
      for (const [model, timeout] of models) {
        const url = `https://image.pollinations.ai/prompt/${q}?width=${width}&height=${height}&model=${model}&nologo=true&nofeed=true${s}${neg}`;
        try {
          await this._download(url, outputPath, timeout);
          const stat = await fs.stat(outputPath);
          if (stat.size > 5000) return outputPath;
        } catch (err) {
          // try next model
        }
      }
      throw new Error('All Pollinations models failed');
    }, { maxAttempts: 3, baseDelayMs: 5000, label: 'Image(pollinations)' });
  }

  async _falai({ prompt, negativePrompt, outputPath, width, height }) {
    const apiKey = process.env.FALAI_API_KEY;
    if (!apiKey) throw new Error('FALAI_API_KEY not set');
    return withRetry(async () => {
      const resp = await httpPost('https://fal.run/fal-ai/flux/schnell', {
        prompt, negative_prompt: negativePrompt,
        image_size: { width, height }, num_images: 1,
      }, { Authorization: `Key ${apiKey}` });
      const imageUrl = resp?.images?.[0]?.url;
      if (!imageUrl) throw new Error('fal.ai returned no image URL');
      await this._download(imageUrl, outputPath, 60);
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 5000, label: 'Image(falai)' });
  }

  async _replicate({ prompt, negativePrompt, outputPath, width, height }) {
    const apiKey = process.env.REPLICATE_API_KEY;
    if (!apiKey) throw new Error('REPLICATE_API_KEY not set');
    return withRetry(async () => {
      // Start prediction
      const pred = await httpPost('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        input: { prompt, negative_prompt: negativePrompt, width, height, output_format: 'png' },
      }, { Authorization: `Token ${apiKey}` });
      // Poll until complete (max 60s)
      const pollUrl = pred.urls?.get;
      if (!pollUrl) throw new Error('Replicate: no polling URL');
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));
        // Replicate polling is a GET request, not POST
        const status = await httpGet(pollUrl, { Authorization: `Token ${apiKey}` });
        if (status.status === 'succeeded') {
          const imageUrl = Array.isArray(status.output) ? status.output[0] : status.output;
          await this._download(imageUrl, outputPath, 60);
          return outputPath;
        }
        if (status.status === 'failed') throw new Error(`Replicate failed: ${status.error}`);
      }
      throw new Error('Replicate: prediction timed out');
    }, { maxAttempts: 2, baseDelayMs: 5000, label: 'Image(replicate)' });
  }

  async _dalle({ prompt, outputPath }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');
    return withRetry(async () => {
      const resp = await httpPost('https://api.openai.com/v1/images/generations', {
        model: 'dall-e-3', prompt, n: 1, size: '1792x1024', response_format: 'url',
      }, { Authorization: `Bearer ${apiKey}` });
      const imageUrl = resp?.data?.[0]?.url;
      if (!imageUrl) throw new Error('DALL-E returned no URL');
      await this._download(imageUrl, outputPath, 60);
      return outputPath;
    }, { maxAttempts: 2, baseDelayMs: 5000, label: 'Image(dalle)' });
  }

  _download(url, outputPath, timeoutSec = 60, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      const fsSync = require('fs');
      const lib    = url.startsWith('https') ? https : http;
      const timer  = setTimeout(() => {
        fsSync.unlink(outputPath, () => {});
        reject(new Error(`Download timeout: ${url}`));
      }, timeoutSec * 1000);

      lib.get(url, res => {
        // Follow redirects (Pollinations and image CDNs commonly use 302)
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
            && res.headers.location && maxRedirects > 0) {
          res.resume();
          clearTimeout(timer);
          this._download(res.headers.location, outputPath, timeoutSec, maxRedirects - 1)
            .then(resolve).catch(reject);
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          clearTimeout(timer);
          res.resume();
          reject(new Error(`Download HTTP ${res.statusCode}: ${url}`));
          return;
        }

        const file = fsSync.createWriteStream(outputPath);
        res.pipe(file);
        file.on('finish', () => { clearTimeout(timer); file.close(); resolve(outputPath); });
        file.on('error', err => {
          clearTimeout(timer);
          fsSync.unlink(outputPath, () => {});
          reject(err);
        });
        res.on('error', err => {
          clearTimeout(timer);
          file.destroy();
          fsSync.unlink(outputPath, () => {});
          reject(err);
        });
      }).on('error', err => { clearTimeout(timer); reject(err); });
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC WEBHOOK / EXTERNAL API ADAPTER
// ─────────────────────────────────────────────────────────────────────────────
//
// Allows users to plug in ANY external HTTP endpoint for LLM, TTS, or Image
// without modifying core code. Configure entirely through environment variables.
//
// LLM webhook:
//   PROVIDER_LLM=webhook
//   WEBHOOK_LLM_URL=https://your-api.example.com/v1/chat
//   WEBHOOK_LLM_METHOD=POST                  (default: POST)
//   WEBHOOK_LLM_HEADERS={"Authorization":"Bearer TOKEN","X-Custom":"value"}
//   WEBHOOK_LLM_BODY_TEMPLATE={"messages":[{"role":"user","content":"{{user}}"}],"system":"{{system}}"}
//     Template vars: {{system}}, {{user}}, {{temperature}}, {{maxTokens}}
//   WEBHOOK_LLM_RESPONSE_PATH=choices.0.message.content
//     Dot-path into JSON response to extract the text content
//
// TTS webhook:
//   PROVIDER_TTS=webhook
//   WEBHOOK_TTS_URL=https://your-tts-api.example.com/synthesize
//   WEBHOOK_TTS_METHOD=POST
//   WEBHOOK_TTS_HEADERS={"Authorization":"Bearer TOKEN"}
//   WEBHOOK_TTS_BODY_TEMPLATE={"text":"{{text}}","voice":"{{voice}}","format":"mp3"}
//   WEBHOOK_TTS_RESPONSE=binary   (binary = save raw bytes; json_url = follow URL in response body)
//   WEBHOOK_TTS_RESPONSE_PATH=audio_url  (only when WEBHOOK_TTS_RESPONSE=json_url)
//
// Image webhook:
//   PROVIDER_IMAGE=webhook
//   WEBHOOK_IMAGE_URL=https://your-image-api.example.com/generate
//   WEBHOOK_IMAGE_METHOD=POST
//   WEBHOOK_IMAGE_HEADERS={"Authorization":"Bearer TOKEN"}
//   WEBHOOK_IMAGE_BODY_TEMPLATE={"prompt":"{{prompt}}","width":{{width}},"height":{{height}}}
//   WEBHOOK_IMAGE_RESPONSE=binary | json_url
//   WEBHOOK_IMAGE_RESPONSE_PATH=url

/** Resolve a dot-path like "choices.0.message.content" against an object */
function _resolvePath(obj, dotPath) {
  if (!dotPath) return obj;
  return dotPath.split('.').reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
}

/** Fill a template string with values, e.g. {{user}} → actual user text */
function _fillTemplate(template, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => {
    // Handles both quoted "{{key}}" and bare {{key}} (for numbers/booleans)
    return s.replace(new RegExp(`"{{${k}}}"`, 'g'), JSON.stringify(v))
            .replace(new RegExp(`{{${k}}}`, 'g'), String(v));
  }, template);
}

class WebhookLLMProvider {
  constructor() {
    this.name = 'webhook';
    this.url  = process.env.WEBHOOK_LLM_URL;
    if (!this.url) throw new Error('WEBHOOK_LLM_URL must be set when PROVIDER_LLM=webhook');
  }

  async chat({ system = '', user = '', temperature = 0.7, maxTokens = 4000 }) {
    const method   = process.env.WEBHOOK_LLM_METHOD || 'POST';
    const headers  = JSON.parse(process.env.WEBHOOK_LLM_HEADERS || '{}');
    const template = process.env.WEBHOOK_LLM_BODY_TEMPLATE
      || '{"messages":[{"role":"system","content":"{{system}}"},{"role":"user","content":"{{user}}"}],"temperature":{{temperature}},"max_tokens":{{maxTokens}}}';
    const bodyStr  = _fillTemplate(template, { system, user, temperature, maxTokens });
    const respPath = process.env.WEBHOOK_LLM_RESPONSE_PATH || 'choices.0.message.content';

    return withRetry(async () => {
      const resp = await httpPost(this.url, JSON.parse(bodyStr), headers);
      const content = _resolvePath(resp, respPath);
      if (!content) throw new Error(`Webhook LLM response has no content at path "${respPath}". Response: ${JSON.stringify(resp).slice(0, 200)}`);
      return String(content);
    }, { maxAttempts: 3, baseDelayMs: 5000, label: 'LLM(webhook)' });
  }

  static parseJson(raw) { return LLMProvider.parseJson(raw); }
}

class WebhookTTSProvider {
  constructor() {
    this.name = 'webhook';
    this.url  = process.env.WEBHOOK_TTS_URL;
    if (!this.url) throw new Error('WEBHOOK_TTS_URL must be set when PROVIDER_TTS=webhook');
  }

  async synthesize({ text, voice, outputPath }) {
    const method      = process.env.WEBHOOK_TTS_METHOD || 'POST';
    const headers     = JSON.parse(process.env.WEBHOOK_TTS_HEADERS || '{}');
    const resolvedVoice = voice || process.env.TTS_VOICE || 'default';
    const template    = process.env.WEBHOOK_TTS_BODY_TEMPLATE
      || '{"text":"{{text}}","voice":"{{voice}}"}';
    const bodyStr     = _fillTemplate(template, { text, voice: resolvedVoice });
    const responseMode = process.env.WEBHOOK_TTS_RESPONSE || 'binary';

    return withRetry(async () => {
      if (responseMode === 'binary') {
        const audio = await httpPost(this.url, JSON.parse(bodyStr), headers);
        await fs.writeFile(outputPath, Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'binary'));
      } else {
        // json_url: response is JSON containing a URL to the audio file
        const resp    = await httpPost(this.url, JSON.parse(bodyStr), headers);
        const respPath = process.env.WEBHOOK_TTS_RESPONSE_PATH || 'audio_url';
        const audioUrl = _resolvePath(resp, respPath);
        if (!audioUrl) throw new Error(`Webhook TTS: no audio URL at path "${respPath}"`);
        const lib  = audioUrl.startsWith('https') ? https : http;
        await new Promise((resolve, reject) => {
          const file = require('fs').createWriteStream(outputPath);
          lib.get(audioUrl, res => {
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
          }).on('error', reject);
        });
      }
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 5000, label: 'TTS(webhook)' });
  }
}

class WebhookImageProvider {
  constructor() {
    this.name = 'webhook';
    this.url  = process.env.WEBHOOK_IMAGE_URL;
    if (!this.url) throw new Error('WEBHOOK_IMAGE_URL must be set when PROVIDER_IMAGE=webhook');
  }

  async generate({ prompt, negativePrompt = '', outputPath, width = 1920, height = 1080, seed = null }) {
    const headers     = JSON.parse(process.env.WEBHOOK_IMAGE_HEADERS || '{}');
    const template    = process.env.WEBHOOK_IMAGE_BODY_TEMPLATE
      || '{"prompt":"{{prompt}}","negative_prompt":"{{negativePrompt}}","width":{{width}},"height":{{height}}}';
    const bodyStr     = _fillTemplate(template, { prompt, negativePrompt, width, height, seed: seed ?? 0 });
    const responseMode = process.env.WEBHOOK_IMAGE_RESPONSE || 'json_url';

    return withRetry(async () => {
      if (responseMode === 'binary') {
        const data = await httpPost(this.url, JSON.parse(bodyStr), headers);
        await fs.writeFile(outputPath, Buffer.isBuffer(data) ? data : Buffer.from(data, 'binary'));
      } else {
        const resp     = await httpPost(this.url, JSON.parse(bodyStr), headers);
        const respPath = process.env.WEBHOOK_IMAGE_RESPONSE_PATH || 'url';
        const imageUrl = _resolvePath(resp, respPath);
        if (!imageUrl) throw new Error(`Webhook Image: no URL at path "${respPath}"`);
        const lib = imageUrl.startsWith('https') ? https : http;
        await new Promise((resolve, reject) => {
          const file = require('fs').createWriteStream(outputPath);
          lib.get(imageUrl, res => {
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
          }).on('error', reject);
        });
      }
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 5000, label: 'Image(webhook)' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY — instantiate the right provider class based on env vars
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the configured LLMProvider (or WebhookLLMProvider if PROVIDER_LLM=webhook) */
function createLLMProvider() {
  const name = (process.env.PROVIDER_LLM || 'groq').toLowerCase();
  if (name === 'webhook') return new WebhookLLMProvider();
  return new LLMProvider();
}

/** Returns the configured TTSProvider (or WebhookTTSProvider if PROVIDER_TTS=webhook) */
function createTTSProvider() {
  const name = (process.env.PROVIDER_TTS || 'edge-tts').toLowerCase();
  if (name === 'webhook') return new WebhookTTSProvider();
  return new TTSProvider();
}

/** Returns the configured ImageProvider (or WebhookImageProvider if PROVIDER_IMAGE=webhook) */
function createImageProvider() {
  const name = (process.env.PROVIDER_IMAGE || 'pollinations').toLowerCase();
  if (name === 'webhook') return new WebhookImageProvider();
  return new ImageProvider();
}

module.exports = {
  LLMProvider, TTSProvider, ImageProvider, withRetry,
  WebhookLLMProvider, WebhookTTSProvider, WebhookImageProvider,
  createLLMProvider, createTTSProvider, createImageProvider,
};
