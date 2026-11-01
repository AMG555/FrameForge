/**
 * Provider abstraction layer — LLM, TTS, Image generation.
 *
 * Every provider is stateless. Swap by changing PROVIDER_* env vars.
 * All providers expose the same interface so pipeline code never references a vendor name.
 *
 * LLM:
 *   PROVIDER_LLM=groq|openai|watsonx|ollama  (default: groq)
 *   LLM_BASE_URL overrides the default endpoint for any provider
 *
 * TTS:
 *   PROVIDER_TTS=edge-tts|elevenlabs|azure|openai  (default: edge-tts)
 *
 * Image:
 *   PROVIDER_IMAGE=pollinations|falai|replicate|dalle  (default: pollinations)
 */

'use strict';

const { execSync, spawn } = require('child_process');
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
    req.end();
  });
}

/**
 * Exchange an IBM Cloud API key for a short-lived IAM bearer token.
 * Token is cached for 50 minutes (IBM tokens last 60 min).
 */
const _iamCache = { token: null, expiresAt: 0 };
async function getIAMToken(apiKey) {
  const now = Date.now();
  if (_iamCache.token && now < _iamCache.expiresAt) return _iamCache.token;
  const body = `grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey&apikey=${encodeURIComponent(apiKey)}`;
  const parsed  = new URL('https://iam.cloud.ibm.com/identity/token');
  const options = {
    hostname: parsed.hostname, port: 443, path: parsed.pathname,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  };
  const token = await new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) { reject(new Error(`IAM token exchange failed HTTP ${res.statusCode}: ${raw.slice(0, 200)}`)); return; }
        const data = JSON.parse(raw);
        if (!data.access_token) reject(new Error('IAM response missing access_token'));
        else resolve(data.access_token);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  _iamCache.token     = token;
  _iamCache.expiresAt = now + 50 * 60 * 1000; // 50 min
  return token;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

const LLM_DEFAULTS = {
  groq:     { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', apiKeyEnv: 'GROQ_API_KEY' },
  openai:   { baseUrl: 'https://api.openai.com/v1',      model: 'gpt-4o-mini',             apiKeyEnv: 'OPENAI_API_KEY' },
  watsonx:  { baseUrl: process.env.WATSONX_BASE_URL || 'https://us-south.ml.cloud.ibm.com/ml/v1/text/chat', model: process.env.WATSONX_MODEL || 'ibm/granite-3-3-8b-instruct', apiKeyEnv: 'WATSONX_API_KEY' },
  ollama:   { baseUrl: process.env.OLLAMA_BASE_URL  || 'http://localhost:11434/api',        model: process.env.OLLAMA_MODEL || 'llama3.3', apiKeyEnv: null },
};

class LLMProvider {
  constructor() {
    const name     = (process.env.PROVIDER_LLM || 'groq').toLowerCase();
    const defaults = LLM_DEFAULTS[name] || LLM_DEFAULTS.groq;
    this.name           = name;
    this.baseUrl        = process.env.LLM_BASE_URL || defaults.baseUrl;
    this.model          = process.env.LLM_MODEL    || defaults.model;
    this.apiKey         = defaults.apiKeyEnv ? process.env[defaults.apiKeyEnv] : null;
    this._requiredEnv   = defaults.apiKeyEnv || null;
    // Do NOT throw here — defer to chat() so the MCP server can start without all keys
  }

  /**
   * Chat completion — OpenAI-compatible interface.
   * @param {{ system: string, user: string, temperature?: number, maxTokens?: number }} opts
   * @returns {Promise<string>}
   */
  async chat({ system, user, temperature = 1, maxTokens = 8000 }) {
    if (this._requiredEnv && !this.apiKey) {
      throw new Error(`Missing env var ${this._requiredEnv} for LLM provider ${this.name}`);
    }
    const body = {
      model:       this.model,
      messages:    [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature,
      max_tokens:  maxTokens,
    };
    // IBM watsonx uses IAM token exchange; all other providers use Bearer apiKey
    let authHeader;
    if (this.name === 'watsonx') {
      const iamToken = await getIAMToken(this.apiKey);
      authHeader = { Authorization: `Bearer ${iamToken}` };
    } else {
      authHeader = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
    }

    // watsonx endpoint requires project_id in the body
    if (this.name === 'watsonx') {
      const projectId = process.env.WATSONX_PROJECT_ID;
      if (!projectId) throw new Error('WATSONX_PROJECT_ID env var required for watsonx provider');
      body.project_id = projectId;
    }

    const url = this.name === 'ollama'
      ? `${this.baseUrl}/chat`
      : `${this.baseUrl}/chat/completions`;

    return withRetry(async () => {
      const resp = await httpPost(url, body, authHeader);
      // OpenAI-compat: choices[0].message.content
      // Ollama: message.content
      const content = resp?.choices?.[0]?.message?.content
        ?? resp?.message?.content
        ?? resp?.content;
      if (!content) throw new Error(`LLM returned no content. finish_reason=${resp?.choices?.[0]?.finish_reason}`);
      return content;
    }, { maxAttempts: 3, baseDelayMs: 10000, label: `LLM(${this.name})` });
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

class TTSProvider {
  constructor() {
    this.name = (process.env.PROVIDER_TTS || 'edge-tts').toLowerCase();
  }

  /**
   * Synthesize text to an MP3/M4A file.
   * @param {{ text: string, voice: string, outputPath: string, rate?: string }} opts
   * @returns {Promise<string>} resolves with outputPath
   */
  async synthesize({ text, voice, outputPath, rate = '-5%' }) {
    switch (this.name) {
      case 'edge-tts':   return this._edgeTTS({ text, voice, outputPath, rate });
      case 'elevenlabs': return this._elevenLabs({ text, voice, outputPath });
      case 'azure':      return this._azureTTS({ text, voice, outputPath, rate });
      case 'openai':     return this._openaiTTS({ text, voice, outputPath });
      default:           return this._edgeTTS({ text, voice, outputPath, rate });
    }
  }

  async _edgeTTS({ text, voice, outputPath, rate }) {
    const rawPath = outputPath.replace(/\.[^.]+$/, '_raw.mp3');
    const safeVoice = voice || 'en-US-GuyNeural';
    return withRetry(async () => {
      await new Promise((resolve, reject) => {
        const proc = spawn('edge-tts', ['--voice', safeVoice, '--rate', rate, '--text', text, '--write-media', rawPath], { timeout: 40000 });
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`edge-tts exited ${code}`)));
        proc.on('error', reject);
      });
      // Normalise audio via FFmpeg
      await new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', ['-nostdin', '-y', '-threads', '2',
          '-i', rawPath,
          '-af', 'atrim=end_silence=0.3,asetpts=PTS-STARTPTS,highpass=f=80,bass=g=3:f=110,volume=1.1,dynaudnorm=f=150:g=5:p=0.95',
          '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', outputPath], { timeout: 30000 });
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
        proc.on('error', reject);
      });
      await fs.unlink(rawPath).catch(() => {});
      return outputPath;
    }, { maxAttempts: 3, baseDelayMs: 3000, label: 'TTS(edge-tts)' });
  }

  async _elevenLabs({ text, voice, outputPath }) {
    const apiKey   = process.env.ELEVENLABS_API_KEY;
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

  async _azureTTS({ text, voice, outputPath, rate }) {
    // Accept both AZURE_SPEECH_KEY (documented) and AZURE_TTS_KEY (legacy)
    const key    = process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY;
    const region = process.env.AZURE_SPEECH_REGION || process.env.AZURE_TTS_REGION || 'eastus';
    if (!key) throw new Error('AZURE_SPEECH_KEY env var not set');
    const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="${voice || 'en-US-GuyNeural'}"><prosody rate="${rate}">${text}</prosody></voice></speak>`;
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
    const apiKey = process.env.OPENAI_API_KEY;
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
      default:             return this._pollinations({ prompt, negativePrompt, outputPath, width, height, seed });
    }
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

  _download(url, outputPath, timeoutSec = 60) {
    return new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(outputPath);
      const lib  = url.startsWith('https') ? https : http;
      const timer = setTimeout(() => { file.destroy(); reject(new Error(`Download timeout: ${url}`)); }, timeoutSec * 1000);
      lib.get(url, res => {
        if (res.statusCode !== 200) { clearTimeout(timer); reject(new Error(`Download HTTP ${res.statusCode}`)); return; }
        res.pipe(file);
        file.on('finish', () => { clearTimeout(timer); file.close(); resolve(); });
      }).on('error', err => { clearTimeout(timer); reject(err); });
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = { LLMProvider, TTSProvider, ImageProvider, withRetry };
