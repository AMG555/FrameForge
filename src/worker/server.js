/**
 * Worker HTTP API
 *
 * Single-worker job executor. Receives pipeline jobs from the MCP server or any HTTP caller,
 * runs them sequentially through the workflow chain, tracks state via StateMachine,
 * enforces stage timeouts, and returns structured results.
 *
 * Endpoints:
 *   POST /jobs           — submit a job { type, payload }
 *   GET  /jobs/:id       — poll job status
 *   GET  /jobs           — list recent jobs
 *   GET  /health         — liveness
 *   POST /jobs/:id/retry — retry a FAILED job
 *
 * Job types:
 *   full_pipeline  — research → script → assets → render → shorts → package → publish
 *   research       — research only
 *   script         — script from existing research
 *   assets         — assets for existing script
 *   render         — render from existing assets
 *   shorts         — extract shorts from existing master
 *   package        — package an existing render
 *   publish        — publish an existing package
 *
 * Start: node src/worker/server.js
 * Port:  WORKER_PORT env (default 3211)
 */
'use strict';

const http   = require('http');
const crypto = require('crypto');
const path   = require('path');
const os     = require('os');
const fs     = require('fs').promises;

// ── Internal auth ─────────────────────────────────────────────────────────────
// When INTERNAL_API_TOKEN is set, all routes except GET /health require a
// matching Authorization: Bearer <token> header. The compare is timing-safe
// to prevent oracle attacks on the token value.

const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || '';

function _timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // constant-time dummy compare
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function _checkAuth(req) {
  if (!INTERNAL_TOKEN) return true; // auth disabled when token not configured
  const header = req.headers['authorization'] || req.headers['x-internal-token'] || '';
  const token  = header.replace(/^Bearer\s+/i, '').trim();
  return _timingSafeEqual(token, INTERNAL_TOKEN);
}

const { runResearch }   = require('../workflows/research');
const { runScript }     = require('../workflows/script');
const { runAssets }     = require('../workflows/assets');
const { runRender }     = require('../workflows/render');
const { runShorts }     = require('../workflows/shorts');
const { runPackaging }  = require('../workflows/packaging');
const { runPublishing } = require('../workflows/publishing');
const { StateMachine }  = require('../pipeline/state-machine');
const { RetryPolicy }   = require('../pipeline/retry-policy');

const PORT      = parseInt(process.env.WORKER_PORT || '3211', 10);
const FILES_DIR = process.env.N8N_FILES_DIR || path.join(os.homedir(), '.frameforge-files');
const STATE_DIR = path.join(FILES_DIR, 'state');

// In-memory job registry (persisted to state dir for crash recovery)
const jobs = new Map();

// Semaphore — only 1 job running at a time (single worker)
let _runningJob = null;
const _queue    = [];

// ── Job runner ────────────────────────────────────────────────────────────

async function executeJob(job) {
  job.status    = 'RUNNING';
  job.startedAt = new Date().toISOString();
  await _persistJob(job);

  try {
    let result;
    switch (job.type) {
      case 'full_pipeline': result = await runFullPipeline(job.payload, job.id); break;
      case 'research':      result = await runResearch(job.payload.topic, job.payload); break;
      case 'script':        result = await runScript(job.payload); break;
      case 'assets':        result = await runAssets(job.payload); break;
      case 'render':        result = await runRender(job.payload); break;
      case 'shorts':        result = await runShorts(job.payload); break;
      case 'package':       result = await runPackaging(job.payload); break;
      case 'publish':       result = await runPublishing(job.payload); break;
      case 'edit_video': {
        const { VideoEditor } = require('../video-editor/editor');
        const editor = new VideoEditor({ filesDir: FILES_DIR });
        result = await editor.editAndAssemble(job.payload);
        break;
      }
      default: throw new Error(`Unknown job type: ${job.type}`);
    }
    job.status      = 'SUCCEEDED';
    job.completedAt = new Date().toISOString();
    job.result      = result;
  } catch (err) {
    job.status      = 'FAILED';
    job.completedAt = new Date().toISOString();
    job.error       = { message: err.message, errorClass: err.errorClass, stageName: err.stageName };
    console.error(`[Worker] Job ${job.id} (${job.type}) FAILED: ${err.message}`);
  }

  await _persistJob(job);
  _runningJob = null;
  _drainQueue();
}

function _drainQueue() {
  if (_runningJob || _queue.length === 0) return;
  const next = _queue.shift();
  _runningJob = next.id;
  executeJob(next).catch(console.error);
}

function _submitJob(type, payload) {
  const id  = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const job = { id, type, payload, status: 'QUEUED', createdAt: new Date().toISOString(), startedAt: null, completedAt: null, result: null, error: null };
  jobs.set(id, job);
  _queue.push(job);
  _persistJob(job).catch(() => {});
  _drainQueue();
  return job;
}

async function _persistJob(job) {
  const dir = path.join(FILES_DIR, 'jobs');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf8');
}

// ── Full pipeline ─────────────────────────────────────────────────────────

async function runFullPipeline(payload, jobId) {
  const { topic, channels = ['file'], force = false } = payload;
  if (!topic) throw new Error('full_pipeline requires { topic }');

  console.log(`[Worker/${jobId}] Starting full pipeline: "${topic}"`);

  // A → Research
  const res = await runResearch(topic, { claimCount: 10 });
  console.log(`[Worker/${jobId}] Research done: ${res.claims.length} claims`);

  // B → Script
  const scr = await runScript({ productionId: res.productionId, claims: res.claims, topic });
  console.log(`[Worker/${jobId}] Script done: ${scr.sceneCount} scenes, ${scr.totalWords} words`);

  // C → Assets (images + TTS)
  const ast = await runAssets({ productionId: scr.productionId, scenes: scr.scenes });
  console.log(`[Worker/${jobId}] Assets done: ${ast.sceneCount} scenes`);

  // D → Render master
  const ren = await runRender({ productionId: scr.productionId, sceneAssets: ast.sceneAssets });
  console.log(`[Worker/${jobId}] Render done: ${ren.sizeBytes ? Math.round(ren.sizeBytes/1024/1024) + 'MB' : 'FAILED'}`);
  if (!ren.passed) throw new Error(`Render QC failed: ${JSON.stringify(ren.qcReport?.checks?.filter(c => !c.passed).map(c => c.name))}`);

  // D2 → Shorts
  const sht = await runShorts({ productionId: scr.productionId, masterPath: ren.masterPath, scenes: scr.scenes });
  console.log(`[Worker/${jobId}] Shorts done: ${sht.shorts?.length || 0} passed`);

  // E → Package
  const pkg = await runPackaging({
    productionId: scr.productionId,
    masterPath:   ren.masterPath,
    shorts:       sht.shorts || [],
    scenes:       scr.scenes,
    title:        scr.title,
    description:  scr.description,
    tags:         scr.tags,
    thumbnailPrompt: scr.thumbnailPrompt,
    qcReport:     ren.qcReport,
    totalWords:   scr.totalWords,
  });
  console.log(`[Worker/${jobId}] Package done: ${pkg.packageDir}`);

  // F → Publish
  const pub = await runPublishing({ productionId: scr.productionId, manifest: pkg.manifest, channels, force });
  console.log(`[Worker/${jobId}] Publish done: ${JSON.stringify(pub.results)}`);

  return {
    productionId:    scr.productionId,
    topic,
    title:           scr.title,
    masterPath:      ren.masterPath,
    packageDir:      pkg.packageDir,
    publishResults:  pub.results,
    publishDecision: pub.publishDecision,
    sceneCount:      scr.sceneCount,
    totalWords:      scr.totalWords,
    shortsCount:     sht.shorts?.length || 0,
    qcPassed:        ren.passed,
  };
}

// ── HTTP server ───────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(res, status, body) {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const parts  = url.pathname.replace(/^\/+|\/+$/g, '').split('/');

  // GET /health — unauthenticated (health-check probes must work without a token)
  if (req.method === 'GET' && parts[0] === 'health') {
    return jsonResponse(res, 200, {
      status:  'ok',
      running: _runningJob,
      queued:  _queue.length,
      jobs:    jobs.size,
    });
  }

  // All other routes require internal auth when INTERNAL_API_TOKEN is set
  if (!_checkAuth(req)) {
    return jsonResponse(res, 401, { error: 'Unauthorized — set Authorization: Bearer <INTERNAL_API_TOKEN>' });
  }

  // GET /jobs
  if (req.method === 'GET' && parts[0] === 'jobs' && !parts[1]) {
    const recent = [...jobs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
      .map(j => ({ id: j.id, type: j.type, status: j.status, createdAt: j.createdAt, completedAt: j.completedAt, error: j.error?.message }));
    return jsonResponse(res, 200, { jobs: recent, queued: _queue.length, running: _runningJob });
  }

  // GET /jobs/:id
  if (req.method === 'GET' && parts[0] === 'jobs' && parts[1]) {
    const job = jobs.get(parts[1]);
    if (!job) return jsonResponse(res, 404, { error: `Job not found: ${parts[1]}` });
    return jsonResponse(res, 200, job);
  }

  // POST /jobs
  if (req.method === 'POST' && parts[0] === 'jobs' && !parts[1]) {
    let rawBody;
    try { rawBody = await readBody(req); }
    catch (err) { return jsonResponse(res, err.statusCode || 500, { error: err.message }); }
    let parsed;
    try { parsed = JSON.parse(rawBody); } catch { return jsonResponse(res, 400, { error: 'Invalid JSON' }); }
    const { type, payload } = parsed;
    if (!type) return jsonResponse(res, 400, { error: 'Missing field: type' });
    const job = _submitJob(type, payload || {});
    return jsonResponse(res, 202, { jobId: job.id, status: job.status, type: job.type });
  }

  // POST /jobs/:id/retry
  if (req.method === 'POST' && parts[0] === 'jobs' && parts[2] === 'retry') {
    const job = jobs.get(parts[1]);
    if (!job) return jsonResponse(res, 404, { error: `Job not found: ${parts[1]}` });
    if (job.status !== 'FAILED') return jsonResponse(res, 409, { error: `Job ${parts[1]} is not in FAILED state` });
    const retried = _submitJob(job.type, job.payload);
    return jsonResponse(res, 202, { jobId: retried.id, status: retried.status, retriedFrom: job.id });
  }

  jsonResponse(res, 404, { error: 'Not found' });
}

// 4 MB body limit — prevents OOM from oversized payloads
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
    req.on('end',  () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function start() {
  // Load persisted jobs for crash recovery
  const jobDir = path.join(FILES_DIR, 'jobs');
  await fs.mkdir(jobDir, { recursive: true }).catch(() => {});
  const jobFiles = await fs.readdir(jobDir).catch(() => []);
  for (const f of jobFiles.filter(f => f.endsWith('.json'))) {
    try {
      const j = JSON.parse(await fs.readFile(path.join(jobDir, f), 'utf8'));
      jobs.set(j.id, j);
      // Re-queue QUEUED jobs that were interrupted
      if (j.status === 'QUEUED') _queue.push(j);
    } catch { /* skip corrupt files */ }
  }
  console.log(`[Worker] Loaded ${jobs.size} persisted jobs, ${_queue.length} re-queued`);

  const server = http.createServer(async (req, res) => {
    try { await handleRequest(req, res); }
    catch (err) { jsonResponse(res, 500, { error: err.message }); }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Worker] HTTP API listening on http://127.0.0.1:${PORT}`);
    console.log(`[Worker] Submit jobs: POST /jobs { type, payload }`);
    _drainQueue(); // start any re-queued jobs
  });
}

if (require.main === module) {
  start().catch(err => { console.error('[Worker] startup failed:', err); process.exit(1); });
}

module.exports = { _submitJob, jobs, runFullPipeline, start, _checkAuth, _timingSafeEqual };
