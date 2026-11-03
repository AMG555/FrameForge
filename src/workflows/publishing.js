/**
 * Workflow F — Publishing
 *
 * Delivers a finished production package to one or more output channels.
 *
 * Built-in channels:
 *   file    — copy the master + shorts to an output directory (default)
 *   webhook — POST a JSON summary to a configurable HTTP endpoint
 *
 * All platform-specific delivery (Telegram, YouTube, S3, etc.) is handled
 * externally via the `webhook` channel or the `external_platform_call` MCP tool.
 * This keeps the core pipeline free of platform SDK dependencies.
 *
 * Returns: { productionId, results, publishDecision }
 */
'use strict';

const path   = require('path');
const fsSync = require('fs');
const https  = require('https');
const http   = require('http');
const { StateMachine } = require('../pipeline/state-machine');
const { RetryPolicy }  = require('../pipeline/retry-policy');
const { Telemetry }    = require('../pipeline/telemetry');

const FILES_DIR = process.env.N8N_FILES_DIR || '/home/node/.n8n-files';
const STATE_DIR = `${FILES_DIR}/state`;

/**
 * @param {{
 *   productionId: string,
 *   manifest:     object,
 *   channels?:    string[],    // 'file' | 'webhook' — default ['file']
 *   outputDir?:   string,      // destination for 'file' channel (default: FILES_DIR/published)
 *   webhookUrl?:  string,      // override PUBLISH_WEBHOOK_URL env var
 *   force?:       boolean,
 * }} opts
 */
async function runPublishing({ productionId, manifest, channels = ['file'], outputDir, webhookUrl, force = false }) {
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 15000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });

  await sm.init();
  await telemetry.init();

  const decision = manifest?.publishDecision || 'AUTO_PUBLISH';

  // Honour the publish decision gate
  if (decision === 'MANDATORY_REVIEW' && !force) {
    console.warn(`[Publishing] ${productionId} requires MANDATORY_REVIEW — skipping publish. Set force=true to override.`);
    return { productionId, results: {}, publishDecision: decision, skipped: true, reason: 'mandatory_review_pending' };
  }
  if (decision === 'SAMPLE_REVIEW' && !force) {
    console.warn(`[Publishing] ${productionId} flagged for SAMPLE_REVIEW — logging for human check.`);
    await _logForReview(productionId, manifest);
  }

  await sm.startStage(productionId, 'Publishing');

  const masterPath = manifest?.master?.path;
  if (!masterPath || !fsSync.existsSync(masterPath)) {
    throw new Error(`Master video not found at: ${masterPath}`);
  }

  const title       = manifest?.metadata?.title       || '';
  const description = manifest?.metadata?.description || '';
  const results = {};

  // ── File channel ────────────────────────────────────────────────────────────
  if (channels.includes('file')) {
    results.file = await retryPol.executeStage('Publishing', async () => {
      const dest = outputDir || path.join(FILES_DIR, 'published');
      fsSync.mkdirSync(dest, { recursive: true });

      const ext      = path.extname(masterPath) || '.mp4';
      const safeName = (productionId || 'video').replace(/[^a-zA-Z0-9_-]/g, '_');
      const destPath = path.join(dest, `${safeName}${ext}`);

      fsSync.copyFileSync(masterPath, destPath);

      // Copy shorts if present
      const copiedShorts = [];
      for (const short of (manifest?.shorts || [])) {
        if (!short.path || !fsSync.existsSync(short.path)) continue;
        const shortDest = path.join(dest, `${safeName}_short_${short.index || copiedShorts.length + 1}${path.extname(short.path) || '.mp4'}`);
        fsSync.copyFileSync(short.path, shortDest);
        copiedShorts.push(shortDest);
      }

      return {
        ok:       true,
        destPath,
        shorts:   copiedShorts,
        sizeBytes: fsSync.statSync(destPath).size,
      };
    });
  }

  // ── Webhook channel ─────────────────────────────────────────────────────────
  if (channels.includes('webhook')) {
    const url = webhookUrl || process.env.PUBLISH_WEBHOOK_URL;
    if (!url) {
      results.webhook = { ok: false, reason: 'PUBLISH_WEBHOOK_URL not set — configure it in .env or pass webhookUrl' };
    } else {
      results.webhook = await retryPol.executeStage('Publishing', async () => {
        const payload = JSON.stringify({
          productionId,
          title,
          description,
          masterPath,
          sizeBytes:  fsSync.statSync(masterPath).size,
          shorts:     (manifest?.shorts || []).map(s => ({ index: s.index, path: s.path })),
          publishedAt: new Date().toISOString(),
        });

        const response = await _httpPost(url, payload, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        });

        return { ok: true, status: response.status, body: response.body.slice(0, 500) };
      }).catch(err => ({ ok: false, error: err.message }));
    }
  }

  await sm.completeStage(productionId, 'Publishing', {});
  await sm.transitionProduction(productionId, 'SUCCEEDED').catch(() => {});
  await telemetry.track({ productionId, stage: 'Publishing', provider: 'local', operation: 'video_delivery', units: 1 });

  return { productionId, results, publishDecision: decision };
}

async function _logForReview(productionId, manifest) {
  const reviewLog = path.join(FILES_DIR, 'review_queue.ndjson');
  const entry = JSON.stringify({ productionId, manifest, queuedAt: new Date().toISOString() }) + '\n';
  fsSync.appendFileSync(reviewLog, entry, 'utf8');
}

/** Minimal HTTP/HTTPS POST helper — no external dependencies */
function _httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const req    = lib.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers,
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) return reject(new Error(`Webhook HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Webhook timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = { runPublishing };
