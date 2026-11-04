/**
 * External Platform Adapter
 *
 * Generic HTTP adapter that connects FrameForge to any external platform:
 *   - VoxForge (amg555/voxforge)
 *   - ElevenLabs (voice cloning + synthesis)
 *   - Remotion (React-based animation renderer)
 *   - Runway, Pika, Kling, or any video generation API
 *   - Any OpenAI-compatible endpoint for LLM/TTS/Image
 *   - n8n / Make / Zapier webhooks
 *   - Custom REST APIs
 *
 * Configuration (all via .env):
 *
 *   EXTERNAL_PLATFORM_NAME=voxforge         Label (for logging)
 *   EXTERNAL_PLATFORM_URL=https://...       Base URL
 *   EXTERNAL_PLATFORM_KEY=sk-...            API key (added as Bearer token)
 *   EXTERNAL_PLATFORM_INGEST_PATH=/v1/ingest  POST media files here
 *   EXTERNAL_PLATFORM_RENDER_PATH=/v1/render  POST scenes, returns job
 *   EXTERNAL_PLATFORM_STATUS_PATH=/v1/status  GET {id} → {status, output}
 *
 * Usage from FrameForge code:
 *
 *   const { ExternalAdapter } = require('./external-adapter');
 *   const adapter = new ExternalAdapter();
 *   if (adapter.isConfigured()) {
 *     const job = await adapter.ingestMedia({ files: ['clip.mp4', 'voice.mp3'] });
 *     const result = await adapter.renderScenes({ scenes, productionId });
 *     // result.outputPath is the finished video
 *   }
 *
 * Usage from agentic IDE (MCP tool: external_platform_call):
 *
 *   { action: "ingest", files: ["..."], metadata: {} }
 *   { action: "render", scenes: [...], productionId: "..." }
 *   { action: "status", jobId: "..." }
 *   { action: "export", format: "mp4|remotion|premiere", ... }
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const http   = require('http');
const crypto = require('crypto');

// ── Multipart form helpers ────────────────────────────────────────────────────

function buildFormData(fields, files) {
  const boundary = `----FrameForge${crypto.randomBytes(8).toString('hex')}`;
  const parts    = [];

  // Text fields
  for (const [name, value] of Object.entries(fields || {})) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`
    );
  }

  // File fields
  for (const { fieldName, filePath, mimeType } of (files || [])) {
    const filename = path.basename(filePath);
    const data     = fs.readFileSync(filePath);
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n${data.toString('binary')}`
    );
  }

  const body = parts.join('\r\n') + `\r\n--${boundary}--\r\n`;
  return { boundary, body: Buffer.from(body, 'binary') };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpRequest(url, { method = 'POST', headers = {}, body = null, timeoutMs = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers,
      timeout: timeoutMs,
    };
    const req = lib.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) {
          reject(new Error(`External platform HTTP ${res.statusCode}: ${raw.slice(0, 300)}`));
        } else {
          try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, data: raw }); }
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`External platform request timeout: ${url}`)); });
    if (body) req.write(body);
    req.end();
  });
}

// ── Polling helper ────────────────────────────────────────────────────────────

async function pollUntilDone(statusUrl, authHeader, { maxWaitMs = 10 * 60 * 1000, intervalMs = 5000 } = {}) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const resp = await httpRequest(statusUrl, { method: 'GET', headers: authHeader });
    const status = resp.data?.status || resp.data?.state || '';
    if (['succeeded', 'completed', 'done', 'ready', 'finished'].includes(status.toLowerCase())) {
      return resp.data;
    }
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status.toLowerCase())) {
      throw new Error(`External platform job failed: ${resp.data?.error || status}`);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`External platform job timed out after ${Math.round(maxWaitMs / 60000)} minutes`);
}

// ── ExternalAdapter class ─────────────────────────────────────────────────────

class ExternalAdapter {
  constructor(config = {}) {
    this.name       = config.name       || process.env.EXTERNAL_PLATFORM_NAME || 'external';
    this.baseUrl    = (config.baseUrl   || process.env.EXTERNAL_PLATFORM_URL || '').replace(/\/$/, '');
    this.apiKey     = config.apiKey     || process.env.EXTERNAL_PLATFORM_KEY || '';
    this.ingestPath = config.ingestPath || process.env.EXTERNAL_PLATFORM_INGEST_PATH || '/v1/ingest';
    this.renderPath = config.renderPath || process.env.EXTERNAL_PLATFORM_RENDER_PATH || '/v1/render';
    this.statusPath = config.statusPath || process.env.EXTERNAL_PLATFORM_STATUS_PATH || '/v1/status';

    // Per-provider presets — users can override with env
    this._applyPreset();
  }

  /** Returns true if a base URL is configured. */
  isConfigured() {
    return !!this.baseUrl;
  }

  /**
   * Apply well-known presets for popular platforms so users only need to set the API key.
   * Presets are overridden by any explicit EXTERNAL_PLATFORM_* env vars.
   */
  _applyPreset() {
    const name = this.name.toLowerCase();
    const presets = {
      elevenlabs: {
        baseUrl:    'https://api.elevenlabs.io',
        ingestPath: '/v1/voices/add',                // voice cloning
        renderPath: '/v1/text-to-speech',            // TTS synthesis
        statusPath: '/v1/voices',                    // list voices (health check)
      },
      remotion: {
        baseUrl:    process.env.REMOTION_BASE_URL || 'http://localhost:3001',
        ingestPath: '/compositions',
        renderPath: '/renders',
        statusPath: '/renders',
      },
      voxforge: {
        baseUrl:    this.baseUrl || 'https://api.voxforge.io',
        ingestPath: '/v1/ingest',
        renderPath: '/v1/render',
        statusPath: '/v1/status',
      },
      runway: {
        baseUrl:    'https://api.runwayml.com',
        ingestPath: '/v1/assets',
        renderPath: '/v1/image_to_video',
        statusPath: '/v1/tasks',
      },
      pika: {
        baseUrl:    'https://api.pika.art',
        ingestPath: '/generate',
        renderPath: '/generate',
        statusPath: '/generations',
      },
    };

    const preset = presets[name];
    if (preset) {
      // Only apply preset fields that haven't been explicitly set via env
      if (!process.env.EXTERNAL_PLATFORM_URL && preset.baseUrl)    this.baseUrl    = preset.baseUrl;
      if (!process.env.EXTERNAL_PLATFORM_INGEST_PATH && preset.ingestPath) this.ingestPath = preset.ingestPath;
      if (!process.env.EXTERNAL_PLATFORM_RENDER_PATH && preset.renderPath) this.renderPath = preset.renderPath;
      if (!process.env.EXTERNAL_PLATFORM_STATUS_PATH && preset.statusPath) this.statusPath = preset.statusPath;
    }
  }

  /** Build auth header appropriate for the platform. */
  _authHeader() {
    if (!this.apiKey) return {};
    const name = this.name.toLowerCase();
    // ElevenLabs uses xi-api-key header
    if (name === 'elevenlabs') return { 'xi-api-key': this.apiKey };
    // fal.ai uses Key prefix
    if (name === 'falai') return { 'Authorization': `Key ${this.apiKey}` };
    // Replicate uses Token prefix
    if (name === 'replicate') return { 'Authorization': `Token ${this.apiKey}` };
    // Default: Bearer
    return { 'Authorization': `Bearer ${this.apiKey}` };
  }

  /**
   * Ingest one or more media files (video clips, images, audio) into the platform.
   * Returns the platform's job/asset metadata.
   *
   * @param {{ files: string[], metadata?: object }} opts
   * @returns {Promise<object>}
   */
  async ingestMedia({ files = [], metadata = {} }) {
    this._requireConfigured();
    const url = `${this.baseUrl}${this.ingestPath}`;
    console.log(`[ExternalAdapter:${this.name}] Ingesting ${files.length} file(s) → ${url}`);

    // Build multipart body
    const fileEntries = files.map(f => ({
      fieldName: path.extname(f).slice(1) || 'file',
      filePath:  f,
      mimeType:  _guessMime(f),
    }));
    const { boundary, body } = buildFormData(
      Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)])),
      fileEntries
    );

    const resp = await httpRequest(url, {
      method:  'POST',
      headers: {
        'Content-Type':   `multipart/form-data; boundary=${boundary.replace('----', '')}`,
        'Content-Length': String(body.length),
        ...this._authHeader(),
      },
      body,
      timeoutMs: 120000,
    });
    console.log(`[ExternalAdapter:${this.name}] Ingest response: ${JSON.stringify(resp.data).slice(0, 200)}`);
    return resp.data;
  }

  /**
   * Send scenes (as JSON) to the external platform for rendering.
   * Waits for the job to complete and returns the output path/URL.
   *
   * @param {{ scenes: object[], productionId: string, options?: object }} opts
   * @returns {Promise<{ jobId: string, outputUrl?: string, outputPath?: string, raw: object }>}
   */
  async renderScenes({ scenes, productionId, options = {} }) {
    this._requireConfigured();
    const url  = `${this.baseUrl}${this.renderPath}`;
    const body = JSON.stringify({ productionId, scenes, ...options, _source: 'frameforge' });
    console.log(`[ExternalAdapter:${this.name}] Sending ${scenes.length} scene(s) to render → ${url}`);

    const resp = await httpRequest(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(body.length), ...this._authHeader() },
      body,
      timeoutMs: 30000,
    });

    const jobId = resp.data?.id || resp.data?.job_id || resp.data?.jobId || resp.data?.executionId;

    // If a status URL is provided, poll until done
    if (jobId && this.statusPath) {
      console.log(`[ExternalAdapter:${this.name}] Polling job ${jobId}…`);
      const statusUrl  = `${this.baseUrl}${this.statusPath}/${jobId}`;
      const finalStatus = await pollUntilDone(statusUrl, this._authHeader());
      const outputUrl   = finalStatus.output?.[0] || finalStatus.output || finalStatus.url || finalStatus.outputUrl;
      return { jobId, outputUrl, raw: finalStatus };
    }

    // Job done synchronously or no polling needed
    const outputUrl = resp.data?.output?.[0] || resp.data?.output || resp.data?.url;
    return { jobId, outputUrl, raw: resp.data };
  }

  /**
   * Check the status of a previously submitted job.
   *
   * @param {string} jobId
   * @returns {Promise<{ status: string, outputUrl?: string, raw: object }>}
   */
  async checkStatus(jobId) {
    this._requireConfigured();
    const url  = `${this.baseUrl}${this.statusPath}/${jobId}`;
    const resp = await httpRequest(url, { method: 'GET', headers: this._authHeader(), timeoutMs: 15000 });
    const status    = resp.data?.status || resp.data?.state || 'unknown';
    const outputUrl = resp.data?.output?.[0] || resp.data?.output || resp.data?.url;
    return { status, outputUrl, raw: resp.data };
  }

  /**
   * Download a remote URL to a local path.
   * Useful for fetching rendered outputs from the external platform.
   *
   * @param {string} remoteUrl
   * @param {string} localPath
   * @returns {Promise<string>} resolves with localPath
   */
  downloadOutput(remoteUrl, localPath) {
    // ── Path-traversal guard ────────────────────────────────────────────────
    // localPath must resolve inside FILES_DIR so an agent-supplied path like
    // "../../etc/passwd" or "/tmp/../../root/key" cannot escape the sandbox.
    const filesDir = path.resolve(process.env.N8N_FILES_DIR || require('path').join(require('os').homedir(), '.frameforge-files'));
    const resolved = path.resolve(localPath);
    if (!resolved.startsWith(filesDir + path.sep)) {
      throw new Error(`downloadOutput: localPath must be inside FILES_DIR (${filesDir}): ${localPath}`);
    }

    // Capture auth header once (before the closure) so `this` binding is unambiguous.
    const authHdr = this._authHeader();
    return new Promise((resolve, reject) => {
      const lib   = remoteUrl.startsWith('https') ? https : http;
      const file  = fs.createWriteStream(localPath);
      const timer = setTimeout(() => { file.destroy(); reject(new Error('Download timeout')); }, 120000);
      function follow(url, hops) {
        if (hops > 5) { clearTimeout(timer); return reject(new Error('Too many redirects')); }
        lib.get(url, { headers: authHdr }, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume(); return follow(res.headers.location, hops + 1);
          }
          if (res.statusCode >= 400) {
            clearTimeout(timer); return reject(new Error(`Download HTTP ${res.statusCode}`));
          }
          res.pipe(file);
          file.on('finish', () => { clearTimeout(timer); file.close(); resolve(localPath); });
          file.on('error', err => { clearTimeout(timer); reject(err); });
        }).on('error', err => { clearTimeout(timer); reject(err); });
      }
      follow(remoteUrl, 0);
    });
  }

  _requireConfigured() {
    if (!this.isConfigured()) {
      throw new Error(
        `External platform adapter not configured. ` +
        `Set EXTERNAL_PLATFORM_URL (and optionally EXTERNAL_PLATFORM_KEY) in your .env, ` +
        `or run: node src/cli/setup-keys.js`
      );
    }
  }
}

// ── MIME guesser ──────────────────────────────────────────────────────────────

function _guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const table = {
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
    '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.json': 'application/json', '.txt': 'text/plain',
  };
  return table[ext] || 'application/octet-stream';
}

module.exports = { ExternalAdapter };
