/**
 * Workflow F — Publishing
 * Task #34: production package → Telegram delivery + YouTube Data API v3
 *
 * Respects the publish decision from the package manifest:
 *   AUTO_PUBLISH      → publishes immediately
 *   SAMPLE_REVIEW     → logs for human review, publishes if FORCE=true
 *   MANDATORY_REVIEW  → always waits for human approval (blocks unless FORCE=true)
 *
 * YouTube OAuth2 setup:
 *   Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN.
 *   See docs/youtube-upload.md for how to obtain a refresh token.
 *
 * Returns: { productionId, results, publishDecision }
 */
'use strict';

const path   = require('path');
const fsSync = require('fs');
const https  = require('https');
const { spawnSync }    = require('child_process');
const { StateMachine } = require('../pipeline/state-machine');
const { RetryPolicy }  = require('../pipeline/retry-policy');
const { Telemetry }    = require('../pipeline/telemetry');

// ── YouTube OAuth2 constants ──────────────────────────────────────────────────
const YT_TOKEN_URL      = 'https://oauth2.googleapis.com/token';
const YT_UPLOAD_URL     = 'https://www.googleapis.com/upload/youtube/v3/videos';
const YT_MAX_CHUNK_BYTES = 256 * 1024 * 1024; // 256 MB resumable chunk

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

  // ── YouTube ───────────────────────────────────────────────────────────────
  if (channels.includes('youtube')) {
    const clientId     = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      results.youtube = {
        ok: false,
        reason: 'YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN must be set — see docs/youtube-upload.md',
      };
    } else {
      results.youtube = await retryPol.executeStage('Publishing', async () => {
        return _uploadToYouTube({
          masterPath,
          title:       youtubeTitle       || 'FrameForge Video',
          description: youtubeDescription || '',
          tags:        manifest?.metadata?.youtubeTags || [],
          clientId,
          clientSecret,
          refreshToken,
        });
      }).catch(err => ({ ok: false, error: err.message }));
    }
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
  fsSync.appendFileSync(reviewLog, entry, 'utf8');
}

// ── YouTube Upload Implementation ─────────────────────────────────────────────

/**
 * Exchange a refresh token for a short-lived access token.
 * @private
 */
async function _refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
  }).toString();

  return new Promise((resolve, reject) => {
    const url = new URL(YT_TOKEN_URL);
    const req = https.request({
      host:   url.hostname,
      path:   url.pathname,
      method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode !== 200) {
          return reject(new Error(`Token refresh failed HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
        }
        const data = JSON.parse(text);
        if (!data.access_token) return reject(new Error('No access_token in token response'));
        resolve(data.access_token);
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Token refresh timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * Initiate a YouTube resumable upload and return the upload URI.
 * @private
 */
async function _initiateResumableUpload({ accessToken, title, description, tags, fileSizeBytes }) {
  const metadata = JSON.stringify({
    snippet: {
      title:       title.slice(0, 100),
      description: description.slice(0, 5000),
      tags:        (tags || []).slice(0, 500),
      categoryId:  '27', // Education
    },
    status: {
      privacyStatus: process.env.YOUTUBE_PRIVACY || 'private', // default private — safe
    },
  });

  const uploadUrl = new URL(YT_UPLOAD_URL);
  uploadUrl.searchParams.set('uploadType', 'resumable');
  uploadUrl.searchParams.set('part', 'snippet,status');

  return new Promise((resolve, reject) => {
    const req = https.request({
      host:   uploadUrl.hostname,
      path:   `${uploadUrl.pathname}${uploadUrl.search}`,
      method: 'POST',
      headers: {
        'Authorization':           `Bearer ${accessToken}`,
        'Content-Type':            'application/json; charset=UTF-8',
        'Content-Length':          Buffer.byteLength(metadata),
        'X-Upload-Content-Type':   'video/mp4',
        'X-Upload-Content-Length': String(fileSizeBytes),
      },
    }, (res) => {
      res.resume();
      if (res.statusCode !== 200) {
        return reject(new Error(`Resumable upload initiation failed HTTP ${res.statusCode}`));
      }
      const location = res.headers['location'];
      if (!location) return reject(new Error('No Location header in resumable upload response'));
      resolve(location);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Upload initiation timeout')); });
    req.write(metadata);
    req.end();
  });
}

/**
 * Upload the video file in one chunk to the resumable upload URI.
 * For files > 256 MB the function uploads the first 256 MB chunk then retries
 * subsequent chunks until complete (simple linear chunked upload).
 * @private
 */
async function _uploadChunked(uploadUri, filePath, fileSizeBytes) {
  const fd     = fsSync.openSync(filePath, 'r');
  let   offset = 0;
  let   videoId;

  try {
    while (offset < fileSizeBytes) {
      const chunkSize = Math.min(YT_MAX_CHUNK_BYTES, fileSizeBytes - offset);
      const chunkBuf  = Buffer.allocUnsafe(chunkSize);
      fsSync.readSync(fd, chunkBuf, 0, chunkSize, offset);

      const parsedUri = new URL(uploadUri);
      const result    = await new Promise((resolve, reject) => {
        const req = https.request({
          host:   parsedUri.hostname,
          path:   `${parsedUri.pathname}${parsedUri.search}`,
          method: 'PUT',
          headers: {
            'Content-Length': chunkSize,
            'Content-Range':  `bytes ${offset}-${offset + chunkSize - 1}/${fileSizeBytes}`,
            'Content-Type':   'video/mp4',
          },
        }, (res) => {
          const chunks = [];
          res.on('data', d => chunks.push(d));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            // 200/201 = upload complete
            if (res.statusCode === 200 || res.statusCode === 201) {
              const data = JSON.parse(text || '{}');
              return resolve({ done: true, videoId: data.id });
            }
            // 308 = resume incomplete (chunk accepted, more to send)
            if (res.statusCode === 308) {
              return resolve({ done: false });
            }
            reject(new Error(`Upload chunk failed HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
          });
        });
        req.on('error', reject);
        req.setTimeout(300_000, () => { req.destroy(); reject(new Error('Chunk upload timeout')); });
        req.write(chunkBuf);
        req.end();
      });

      if (result.done) {
        videoId = result.videoId;
        break;
      }
      offset += chunkSize;
    }
  } finally {
    fsSync.closeSync(fd);
  }

  return videoId;
}

/**
 * Full YouTube upload flow: refresh token → initiate resumable → upload chunks.
 * @private
 */
async function _uploadToYouTube({ masterPath, title, description, tags, clientId, clientSecret, refreshToken }) {
  const fileStat     = fsSync.statSync(masterPath);
  const fileSizeBytes = fileStat.size;

  console.log(`[YouTube] Refreshing access token...`);
  const accessToken = await _refreshAccessToken({ clientId, clientSecret, refreshToken });

  console.log(`[YouTube] Initiating resumable upload (${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB)...`);
  const uploadUri = await _initiateResumableUpload({ accessToken, title, description, tags, fileSizeBytes });

  console.log(`[YouTube] Uploading video...`);
  const videoId = await _uploadChunked(uploadUri, masterPath, fileSizeBytes);

  if (!videoId) throw new Error('Upload completed but no videoId returned');

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[YouTube] ✅ Upload complete: ${videoUrl}`);

  return {
    ok:       true,
    videoId,
    videoUrl,
    privacy:  process.env.YOUTUBE_PRIVACY || 'private',
  };
}

module.exports = { runPublishing };
