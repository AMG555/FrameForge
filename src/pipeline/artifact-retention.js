/**
 * Artifact Retention Rules — Task #27
 *
 * Defines which artifacts to keep permanently, for 30 days, or delete immediately.
 * Runs as part of post-publish cleanup and the nightly cron sweep.
 *
 * Policy:
 *   PERMANENT   — master MP4, shorts, thumbnails, manifests, character assets
 *   30_DAY      — intermediate scene renders (scene_N_out.mp4), concat files, TTS audio
 *   DELETE_NOW  — temp files from failed runs, raw_concat before mixing
 *
 * Usage (called after successful publish):
 *   const { applyRetentionRules } = require('./artifact-retention');
 *   applyRetentionRules({ productionId, filesDir, manifestData });
 *
 * Usage (nightly sweep):
 *   const { sweepExpiredIntermediates } = require('./artifact-retention');
 *   sweepExpiredIntermediates({ filesDir, dryRun: false });
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const RETENTION_DAYS  = parseInt(process.env.RETENTION_DAYS_INTERMEDIATES || '30', 10);
const MS_PER_DAY      = 24 * 60 * 60 * 1000;

// ── Permanent file patterns ───────────────────────────────────────────────────
// These are never deleted by the sweep.
const PERMANENT_PATTERNS = [
  /final_video_.*\.mp4$/,   // master video
  /short_.*\.mp4$/,         // shorts
  /thumbnail_.*\.(jpg|png|webp)$/,
  /manifest\.json$/,        // production manifests
  /assets\//,               // character/prop assets
];

// ── 30-day intermediate patterns ─────────────────────────────────────────────
// Deleted after RETENTION_DAYS days.
const INTERMEDIATE_PATTERNS = [
  /scene_\d+_out\.mp4$/,
  /scene_\d+_voice\.(m4a|mp3|aac)$/,
  /scene_\d+_image\.(png|jpg|webp)$/,
  /concat_main\.txt$/,
  /raw_concat_.*\.mp4$/,
];

// ── Delete-immediately patterns ───────────────────────────────────────────────
// Cleaned up right after stage completion.
const TEMP_PATTERNS = [
  /_raw\.mp3$/,
  /\.tmp$/,
  /\.part$/,
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Apply retention rules after a successful production run.
 * Deletes temp files immediately; schedules intermediates for 30-day sweep
 * by writing a .retention file alongside each intermediate.
 *
 * @param {{ productionId: string, filesDir: string, dryRun?: boolean }} opts
 * @returns {{ deleted: string[], tagged: string[] }}
 */
function applyRetentionRules({ productionId, filesDir, dryRun = false }) {
  const vdir     = path.join(filesDir, 'video_tmp');
  const deleted  = [];
  const tagged   = [];

  // 1. Delete temp files immediately
  for (const dir of [filesDir, vdir]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of _listFiles(dir)) {
      if (TEMP_PATTERNS.some(p => p.test(file))) {
        if (!dryRun) _safeUnlink(file);
        deleted.push(file);
      }
    }
  }

  // 2. Tag intermediates with a .retention file (mtime-based expiry)
  if (fs.existsSync(vdir)) {
    for (const file of _listFiles(vdir)) {
      if (INTERMEDIATE_PATTERNS.some(p => p.test(file))) {
        const tagPath = file + '.retention';
        if (!dryRun && !fs.existsSync(tagPath)) {
          const tag = {
            production_id:  productionId,
            created_at:     new Date().toISOString(),
            expires_at:     new Date(Date.now() + RETENTION_DAYS * MS_PER_DAY).toISOString(),
            policy:         '30_day',
          };
          fs.writeFileSync(tagPath, JSON.stringify(tag), 'utf8');
        }
        tagged.push(file);
      }
    }
  }

  return { deleted, tagged };
}

/**
 * Sweep all intermediates whose .retention expiry has passed.
 * Safe to run as a nightly cron.
 *
 * @param {{ filesDir: string, dryRun?: boolean }} opts
 * @returns {{ swept: string[], skipped: number }}
 */
function sweepExpiredIntermediates({ filesDir, dryRun = false }) {
  const swept   = [];
  let   skipped = 0;
  const now     = Date.now();

  // Scan all subdirectories under filesDir (recursive — productions nest several levels deep)
  const dirs = [];
  const _walkDirs = (dir) => {
    dirs.push(dir);
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) _walkDirs(path.join(dir, entry.name));
      }
    } catch { /* permission error or disappeared — skip */ }
  };
  _walkDirs(filesDir);

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let entries;
    try { entries = fs.readdirSync(dir); } catch { continue; }

    for (const f of entries) {
      if (!f.endsWith('.retention')) continue;
      const tagPath  = path.join(dir, f);
      const filePath = tagPath.replace(/\.retention$/, '');
      try {
        const tag     = JSON.parse(fs.readFileSync(tagPath, 'utf8'));
        const expires = new Date(tag.expires_at).getTime();
        if (now >= expires) {
          if (!dryRun) {
            _safeUnlink(filePath);
            _safeUnlink(tagPath);
          }
          swept.push(filePath);
        } else {
          skipped++;
        }
      } catch {
        // Corrupt tag — delete both to be safe
        if (!dryRun) { _safeUnlink(tagPath); _safeUnlink(filePath); }
        swept.push(filePath);
      }
    }
  }

  return { swept, skipped };
}

/**
 * Classify a file path by its retention policy.
 * @param {string} filePath
 * @returns {'permanent'|'30_day'|'temp'|'unknown'}
 */
function classifyRetention(filePath) {
  if (PERMANENT_PATTERNS.some(p => p.test(filePath)))    return 'permanent';
  if (TEMP_PATTERNS.some(p => p.test(filePath)))         return 'temp';
  if (INTERMEDIATE_PATTERNS.some(p => p.test(filePath))) return '30_day';
  return 'unknown';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _listFiles(dir) {
  try {
    return fs.readdirSync(dir)
      .map(f => path.join(dir, f))
      .filter(f => {
        try { return fs.statSync(f).isFile(); } catch { return false; }
      });
  } catch { return []; }
}

function _safeUnlink(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
}

module.exports = { applyRetentionRules, sweepExpiredIntermediates, classifyRetention };
