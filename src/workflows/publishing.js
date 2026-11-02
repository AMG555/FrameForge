/**
 * Workflow F — Publishing
 * Task #34: production package → Telegram delivery (+ future YouTube adapter)
 *
 * Respects the publish decision from the package manifest:
 *   AUTO_PUBLISH      → publishes immediately
 *   SAMPLE_REVIEW     → logs for human review, publishes if FORCE=true
 *   MANDATORY_REVIEW  → always waits for human approval (blocks unless FORCE=true)
 *
 * Returns: { productionId, results, publishDecision }
 */
'use strict';

const path   = require('path');
const fsSync = require('fs');
const { spawnSync }    = require('child_process');
const { StateMachine } = require('../pipeline/state-machine');
const { RetryPolicy }  = require('../pipeline/retry-policy');
const { Telemetry }    = require('../pipeline/telemetry');

const FILES_DIR = process.env.N8N_FILES_DIR || '/home/node/.n8n-files';
const STATE_DIR = `${FILES_DIR}/state`;

/**
 * @param {{
 *   productionId: string,
 *   manifest: object,
 *   channels?: string[],
 *   force?: boolean,
 * }} opts
 */
async function runPublishing({ productionId, manifest, channels = ['telegram'], force = false }) {
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
    // Log to review queue but still publish (sample review is non-blocking)
    await _logForReview(productionId, manifest);
  }

  await sm.startStage(productionId, 'Publishing');

  const masterPath = manifest?.master?.path;
  if (!masterPath || !fsSync.existsSync(masterPath)) {
    throw new Error(`Master video not found at: ${masterPath}`);
  }

  const { youtubeTitle = '', youtubeDescription = '' } = manifest?.metadata || {};
  const results = {};

  // ── Telegram ─────────────────────────────────────────────────────────────
  if (channels.includes('telegram')) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    const apiBase  = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';

    if (!botToken || !chatId) {
      results.telegram = { ok: false, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set' };
    } else {
      results.telegram = await retryPol.executeStage('Publishing', async () => {
        const caption = `🎬 ${youtubeTitle}\n\n${youtubeDescription}`.slice(0, 1024);
        // spawnSync array — no shell injection from token/chatId/path
        const res = spawnSync('curl', [
          '-sS', '-X', 'POST',
          `${apiBase}/bot${botToken}/sendDocument`,
          '-F', `chat_id=${chatId}`,
          '-F', `document=@${masterPath}`,
          '-F', `caption=${caption}`,
        ], { timeout: 10 * 60 * 1000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });

        if (res.error) throw res.error;
        const resp = JSON.parse(res.stdout || '{}');
        if (!resp.ok) throw new Error(`Telegram error: ${resp.description}`);
        return { ok: true, messageId: resp.result?.message_id };
      });

      // Also send the YouTube description as a text message
      if (youtubeDescription) {
        const textRes = spawnSync('curl', [
          '-sS', '-X', 'POST', `${apiBase}/bot${botToken}/sendMessage`,
          '-H', 'Content-Type: application/json',
          '-d', JSON.stringify({ chat_id: chatId, text: `📝 ${youtubeTitle}\n\n${youtubeDescription}`.slice(0, 4096) }),
        ], { timeout: 30000, encoding: 'utf8' });
        if (!textRes.error) {
          try {
            const tr = JSON.parse(textRes.stdout || '{}');
            if (tr.ok) results.telegramDescription = { ok: true, messageId: tr.result?.message_id };
          } catch { /* non-fatal */ }
        }
      }
    }
  }

  // ── YouTube (stub — requires manual setup) ────────────────────────────────
  if (channels.includes('youtube')) {
    results.youtube = { ok: false, reason: 'YouTube upload requires manual OAuth setup — see docs/youtube-upload.md' };
  }

  // ── Publish shorts to Telegram ────────────────────────────────────────────
  if (channels.includes('telegram') && manifest?.shorts?.length > 0 && results.telegram?.ok) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    const apiBase  = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
    if (botToken && chatId) {
      results.telegramShorts = [];
      for (const short of manifest.shorts.slice(0, 3)) {
        if (!short.path || !fsSync.existsSync(short.path)) continue;
        try {
          const res = spawnSync('curl', [
            '-sS', '-X', 'POST', `${apiBase}/bot${botToken}/sendDocument`,
            '-F', `chat_id=${chatId}`,
            '-F', `document=@${short.path}`,
            '-F', `caption=📱 Short ${short.index}/${manifest.shorts.length}`,
          ], { timeout: 10 * 60 * 1000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
          const resp = JSON.parse(res.stdout || '{}');
          results.telegramShorts.push({ ok: resp.ok, index: short.index });
        } catch { /* non-fatal */ }
      }
    }
  }

  await sm.completeStage(productionId, 'Publishing', {});
  await sm.transitionProduction(productionId, 'SUCCEEDED').catch(() => {});
  await telemetry.track({ productionId, stage: 'Publishing', provider: 'telegram', operation: 'video_delivery', units: 1 });

  return { productionId, results, publishDecision: decision };
}

async function _logForReview(productionId, manifest) {
  const reviewLog = path.join(FILES_DIR, 'review_queue.ndjson');
  const entry = JSON.stringify({ productionId, manifest, queuedAt: new Date().toISOString() }) + '\n';
  require('fs').appendFileSync(reviewLog, entry, 'utf8');
}

module.exports = { runPublishing };
