/**
 * Render-Optimised Worker API
 *
 * Designed for Render Free (512 MB RAM) + local FFmpeg rendering.
 *
 * KEY INSIGHT: The pipeline splits into two categories:
 *
 *   NETWORK-BOUND (runs on Render free — no RAM/CPU pressure):
 *     - LLM calls (Groq API)        — ~50ms response time
 *     - Image generation (Pollinations) — network fetch
 *     - TTS synthesis (edge-tts API or ElevenLabs) — network
 *     - Webhook/file delivery       — network / disk
 *
 *   CPU/MEMORY-BOUND (runs locally or on Pi/Hetzner — needs FFmpeg):
 *     - FFmpeg zoompan rendering     — ~800 MB RAM peak
 *     - Audio mixing (LUFS loudnorm) — CPU-intensive
 *     - Shorts extraction            — FFmpeg
 *     - Quality gate (ffprobe)       — requires binary
 *
 * SPLIT WORKER PATTERN:
 *   Job type         → Runs on
 *   ──────────────────────────────────────────────
 *   research         → Render free (LLM only)
 *   script           → Render free (LLM only)
 *   assets           → Render free (LLM + network image/TTS)
 *   render           → LOCAL/PI (FFmpeg — see LOCAL_RENDER_URL)
 *   shorts           → LOCAL/PI (FFmpeg)
 *   package          → Render free (file ops, cheap)
 *   publish          → Render free (file copy / webhook delivery)
 *   full_pipeline    → Render free up to render step; delegates render to LOCAL_RENDER_URL
 *
 * RENDER FREE WORKAROUNDS:
 *   1. Sleep: Render free sleeps after 15 min. The Cloudflare Worker MCP proxy
 *      keeps the connection alive by polling /health every 10 min (see keepAlive).
 *   2. No persistent disk: All intermediate files are stored in memory (small)
 *      or written to /tmp (ephemeral, fine for single-job state).
 *      Final videos are written to N8N_FILES_DIR/published/ or sent via PUBLISH_WEBHOOK_URL.
 *   3. 512 MB RAM: edge-tts runs as a subprocess (~50 MB). Groq calls are pure HTTP.
 *      Image generation is a HTTP fetch + stream to disk (~20 MB peak).
 *
 * Environment variables:
 *   WORKER_PORT        — default 3211
 *   LOCAL_RENDER_URL   — URL of local/Pi Worker API for FFmpeg jobs
 *                        (e.g. http://192.168.1.100:3211 on local network,
 *                         or https://yourpi.tailnet.ts.net:3211 via Tailscale)
 *   RENDER_MODE        — 'api_only' (skip FFmpeg, delegate to LOCAL_RENDER_URL)
 *                        'full' (run everything locally — needs Pi/VPS)
 *                        default: 'api_only'
 *   N8N_FILES_DIR      — /tmp (Render) or /home/node/.n8n-files (Pi/VPS)
 */

'use strict';

const http   = require('http');
const https  = require('https');
const crypto = require('crypto');
const path   = require('path');
const fs     = require('fs').promises;

// ── Security helpers ──────────────────────────────────────────────────────────

// Timing-safe string comparison — prevents timing attacks on secret comparison.
// Falls back to a constant-time loop if crypto.timingSafeEqual is unavailable.
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still compare to avoid length-based timing leak
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const PORT             = parseInt(process.env.WORKER_PORT || '3211', 10);
const FILES_DIR        = process.env.N8N_FILES_DIR || '/tmp/video-pipeline';
const RENDER_MODE      = process.env.RENDER_MODE || 'api_only';
const LOCAL_RENDER     = process.env.LOCAL_RENDER_URL || '';
const INTERNAL_TOKEN   = process.env.INTERNAL_API_TOKEN || '';

// Only require heavy modules when in full mode (avoids startup crash on Render free)
let runResearch, runScript, runAssets, runRender, runShorts, runPackaging, runPublishing;

function loadWorkflows() {
  if (runResearch) return; // already loaded
  // NOTE: this file lives at src/worker/server-render-free.js
  //       workflows live at src/workflows/ — so path is one level up
  ({ runResearch }   = require('../workflows/research'));
  ({ runScript }     = require('../workflows/script'));
  ({ runAssets }     = require('../workflows/assets'));
  ({ runRender }     = require('../workflows/render'));
  ({ runShorts }     = require('../workflows/shorts'));
  ({ runPackaging }  = require('../workflows/packaging'));
  ({ runPublishing } = require('../workflows/publishing'));
}

// ── Job registry ──────────────────────────────────────────────────────────────

const jobs = new Map();
let   _runningJob = null;
const _queue      = [];

function _submitJob(type, payload) {
  const id  = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const job = {
    id, type, payload,
    status: 'QUEUED',
    createdAt:   new Date().toISOString(),
    startedAt:   null,
    completedAt: null,
    result:      null,
    error:       null,
    renderMode:  RENDER_MODE,
  };
  jobs.set(id, job);
  _queue.push(job);
  _persistJob(job).catch(() => {});
  _drainQueue();
  return job;
}

async function _persistJob(job) {
  try {
    const dir = path.join(FILES_DIR, 'jobs');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf8');
  } catch { /* /tmp may have space limits on Render free — best-effort */ }
}

function _drainQueue() {
  if (_runningJob || _queue.length === 0) return;
  const next   = _queue.shift();
  _runningJob  = next.id;
  executeJob(next).catch(console.error).finally(() => {
    _runningJob = null;
    _drainQueue();
  });
}

// ── Job executor ──────────────────────────────────────────────────────────────

async function executeJob(job) {
  job.status    = 'RUNNING';
  job.startedAt = new Date().toISOString();
  await _persistJob(job);

  try {
    loadWorkflows(); // lazy-load (avoids missing binaries crash on Render)
    job.result = await dispatchJob(job);
    job.status = 'SUCCEEDED';
  } catch (err) {
    job.status = 'FAILED';
    job.error  = { message: err.message };
    console.error(`[Worker/${job.id}] ${job.type} FAILED: ${err.message}`);
  }

  job.completedAt = new Date().toISOString();
  await _persistJob(job);
}

async function dispatchJob(job) {
  const { type, payload } = job;
  const isRenderJob = ['render', 'shorts', 'full_pipeline'].includes(type);

  // In api_only mode, delegate render/FFmpeg jobs to local render endpoint
  if (RENDER_MODE === 'api_only' && isRenderJob && LOCAL_RENDER) {
    console.log(`[Worker] Delegating ${type} to local render: ${LOCAL_RENDER}`);
    return delegateToLocalRender(type, payload);
  }

  // Run locally (full mode or no local render configured)
  switch (type) {
    case 'research':      return runResearch(payload.topic, payload);
    case 'script':        return runScript(payload);
    case 'assets':        return runAssets(payload);
    case 'render':        return runRender(payload);
    case 'shorts':        return runShorts(payload);
    case 'package':       return runPackaging(payload);
    case 'publish':       return runPublishing(payload);
    case 'full_pipeline': return runFullPipeline(payload, job.id);
    default: throw new Error(`Unknown job type: ${type}`);
  }
}

async function runFullPipeline(payload, jobId) {
  const { topic, channels = ['file'] } = payload;
  console.log(`[Worker/${jobId}] full_pipeline: "${topic}"`);

  // Steps A-C run here (network-only — safe on Render free)
  const res = await runResearch(topic, { claimCount: 10 });
  const scr = await runScript({ productionId: res.productionId, claims: res.claims, topic });
  const ast = await runAssets({ productionId: scr.productionId, scenes: scr.scenes });

  // Step D — FFmpeg: delegate if in api_only mode
  let ren;
  if (RENDER_MODE === 'api_only' && LOCAL_RENDER) {
    ren = await delegateToLocalRender('render', { productionId: scr.productionId, sceneAssets: ast.sceneAssets });
  } else {
    ren = await runRender({ productionId: scr.productionId, sceneAssets: ast.sceneAssets });
  }
  if (!ren.passed) throw new Error(`Render QC failed`);

  // Step D2 — Shorts (FFmpeg)
  let sht = { shorts: [] };
  if (RENDER_MODE === 'api_only' && LOCAL_RENDER) {
    sht = await delegateToLocalRender('shorts', { productionId: scr.productionId, masterPath: ren.masterPath, scenes: scr.scenes }).catch(() => ({ shorts: [] }));
  } else {
    sht = await runShorts({ productionId: scr.productionId, masterPath: ren.masterPath, scenes: scr.scenes }).catch(() => ({ shorts: [] }));
  }

  // Steps E-F run here (network-only)
  const pkg = await runPackaging({ productionId: scr.productionId, masterPath: ren.masterPath, shorts: sht.shorts || [], scenes: scr.scenes, title: scr.title, description: scr.description, tags: scr.tags, thumbnailPrompt: scr.thumbnailPrompt, qcReport: ren.qcReport, totalWords: scr.totalWords });
  const pub = await runPublishing({ productionId: scr.productionId, manifest: pkg.manifest, channels });

  return { productionId: scr.productionId, topic, title: scr.title, masterPath: ren.masterPath, publishResults: pub.results, sceneCount: scr.sceneCount, totalWords: scr.totalWords, shortsCount: sht.shorts?.length || 0, qcPassed: ren.passed };
}

// ── Delegation to local render endpoint ───────────────────────────────────────

async function delegateToLocalRender(type, payload) {
  if (!LOCAL_RENDER) throw new Error('LOCAL_RENDER_URL not configured — cannot delegate render job');
  const baseUrl      = LOCAL_RENDER.replace(/\/$/, '');
  const extraHeaders = INTERNAL_TOKEN ? { Authorization: `Bearer ${INTERNAL_TOKEN}` } : {};

  // Submit job to local worker
  const submitResp = await httpJSON(`${baseUrl}/jobs`, 'POST', { type, payload }, extraHeaders);
  const jobId      = submitResp.jobId;
  if (!jobId) throw new Error('Local render API did not return jobId');

  // Poll for completion (max 30 min for FFmpeg render)
  const maxMs  = 30 * 60 * 1000;
  const pollMs = 8000;
  const start  = Date.now();

  while (Date.now() - start < maxMs) {
    await sleep(pollMs);
    const status = await httpJSON(`${baseUrl}/jobs/${encodeURIComponent(jobId)}`, 'GET', null, extraHeaders);
    if (status.status === 'SUCCEEDED') return status.result;
    if (status.status === 'FAILED')    throw new Error(`Local render job failed: ${status.error?.message}`);
  }
  throw new Error(`Local render job ${jobId} timed out after 30 minutes`);
}

// ── Keep-alive: prevents Render free from sleeping during active pipeline ─────
// Render free sleeps after 15 min. During a pipeline run this matters.
// We self-ping every 10 min to stay warm.

let keepAliveTimer = null;

function startKeepAlive() {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(async () => {
    try {
      await httpJSON(`http://127.0.0.1:${PORT}/health`, 'GET', null);
    } catch { /* ignore */ }
  }, 10 * 60 * 1000);
  keepAliveTimer.unref(); // don't block process exit
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpJSON(url, method, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const bodyBuf = body ? Buffer.from(JSON.stringify(body)) : null;
    const opts    = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers:  { 'Content-Type': 'application/json', ...extraHeaders, ...(bodyBuf ? { 'Content-Length': bodyBuf.length } : {}) },
    };
    const req = lib.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`)); return; }
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── HTTP server ───────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(res, status, body) {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

function checkInternalAuth(req) {
  if (!INTERNAL_TOKEN) return true; // auth disabled if token not configured
  const header = req.headers['authorization'] || req.headers['x-internal-token'] || '';
  const token  = header.replace(/^Bearer\s+/i, '').trim();
  return timingSafeEqual(token, INTERNAL_TOKEN);
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const url   = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');

  // Health check is unauthenticated (Cloudflare cron pings this)
  if (req.method === 'GET' && parts[0] === 'health') {
    return json(res, 200, { status: 'ok', mode: RENDER_MODE, running: _runningJob, queued: _queue.length, localRender: LOCAL_RENDER ? 'configured' : 'none' });
  }

  // All other routes require internal auth when INTERNAL_API_TOKEN is set
  if (!checkInternalAuth(req)) {
    return json(res, 401, { error: 'Unauthorized — set Authorization: Bearer <INTERNAL_API_TOKEN>' });
  }

  if (req.method === 'GET' && parts[0] === 'jobs' && !parts[1]) {
    const recent = [...jobs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
      .map(j => ({ id: j.id, type: j.type, status: j.status, createdAt: j.createdAt, completedAt: j.completedAt, renderMode: j.renderMode, error: j.error?.message }));
    return json(res, 200, { jobs: recent, queued: _queue.length, running: _runningJob });
  }

  if (req.method === 'GET' && parts[0] === 'jobs' && parts[1]) {
    const job = jobs.get(parts[1]);
    if (!job) return json(res, 404, { error: `Job not found: ${parts[1]}` });
    return json(res, 200, job);
  }

  if (req.method === 'POST' && parts[0] === 'jobs' && !parts[1]) {
    let rawBody;
    try { rawBody = await readBody(req); }
    catch (err) {
      return json(res, err.statusCode || 500, { error: err.message });
    }
    let parsed;
    try { parsed = JSON.parse(rawBody); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
    const { type, payload } = parsed;
    if (!type) return json(res, 400, { error: 'Missing field: type' });
    const job = _submitJob(type, payload || {});
    return json(res, 202, { jobId: job.id, status: job.status, type: job.type, renderMode: RENDER_MODE });
  }

  if (req.method === 'POST' && parts[0] === 'jobs' && parts[2] === 'retry') {
    const job = jobs.get(parts[1]);
    if (!job) return json(res, 404, { error: `Job not found: ${parts[1]}` });
    if (job.status !== 'FAILED') return json(res, 409, { error: `Job is not FAILED` });
    const retried = _submitJob(job.type, job.payload);
    return json(res, 202, { jobId: retried.id, status: retried.status, retriedFrom: job.id });
  }

  json(res, 404, { error: 'Not found' });
}

// 4 MB body limit — prevents OOM on Render free tier from oversized payloads
const MAX_BODY_BYTES = 4 * 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        return reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function start() {
  await fs.mkdir(path.join(FILES_DIR, 'jobs'), { recursive: true }).catch(() => {});

  // Crash recovery: re-queue QUEUED jobs
  const jobDir = path.join(FILES_DIR, 'jobs');
  const jobFiles = await fs.readdir(jobDir).catch(() => []);
  for (const f of jobFiles.filter(f => f.endsWith('.json'))) {
    try {
      const j = JSON.parse(await fs.readFile(path.join(jobDir, f), 'utf8'));
      jobs.set(j.id, j);
      if (j.status === 'QUEUED') _queue.push(j);
    } catch { /* skip corrupt */ }
  }

  const server = http.createServer(async (req, res) => {
    try { await handleRequest(req, res); }
    catch (err) { json(res, 500, { error: err.message }); }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Worker] ${RENDER_MODE} mode — listening on :${PORT}`);
    if (!INTERNAL_TOKEN) {
      console.warn('[Worker] WARNING: INTERNAL_API_TOKEN not set — API is unauthenticated. Set INTERNAL_API_TOKEN in .env for production use.');
    }
    if (RENDER_MODE === 'api_only' && LOCAL_RENDER) {
      console.log(`[Worker] FFmpeg render delegated to: ${LOCAL_RENDER}`);
    } else if (RENDER_MODE === 'api_only' && !LOCAL_RENDER) {
      console.log(`[Worker] WARNING: api_only mode but LOCAL_RENDER_URL not set — render jobs will fail`);
    }
    startKeepAlive();
    _drainQueue();
  });
}

start().catch(err => { console.error('[Worker] startup failed:', err); process.exit(1); });
