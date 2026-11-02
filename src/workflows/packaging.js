/**
 * Workflow E — Packaging
 * Task #33: collect master + shorts + thumbnail + metadata + manifest + QC report
 *           into one complete production package ready for human review or publish.
 *
 * Returns: { productionId, packageDir, manifest }
 */
'use strict';

const path   = require('path');
const crypto = require('crypto');
const fsSync = require('fs');
const fs     = require('fs').promises;
const { StateMachine } = require('../pipeline/state-machine');
const { Telemetry }    = require('../pipeline/telemetry');

const FILES_DIR = process.env.N8N_FILES_DIR || '/home/node/.n8n-files';
const STATE_DIR = `${FILES_DIR}/state`;

/**
 * Assemble a production package from all rendered artefacts.
 *
 * @param {{
 *   productionId: string,
 *   masterPath: string,
 *   shorts?: object[],
 *   scenes: object[],
 *   youtubeTitle: string,
 *   youtubeDescription: string,
 *   youtubeTags?: string[],
 *   thumbnailPrompt?: string,
 *   qcReport: object,
 *   totalWords?: number,
 * }} opts
 */
async function runPackaging({
  productionId,
  masterPath,
  shorts = [],
  scenes = [],
  youtubeTitle,
  youtubeDescription,
  youtubeTags = [],
  thumbnailPrompt = '',
  qcReport,
  totalWords = 0,
}) {
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });

  await sm.init();
  await telemetry.init();
  await sm.startStage(productionId, 'Packaging');

  // Create package directory
  const pkgDir = path.join(FILES_DIR, 'packages', productionId);
  await fs.mkdir(pkgDir, { recursive: true });

  // ── Copy master video ───────────────────────────────────────────────────
  const masterDest = path.join(pkgDir, 'master.mp4');
  await fs.copyFile(masterPath, masterDest).catch(() => {});

  // ── Copy shorts ────────────────────────────────────────────────────────
  const shortsMeta = [];
  for (let i = 0; i < shorts.length; i++) {
    const s = shorts[i];
    if (!s.shortPath || !fsSync.existsSync(s.shortPath)) continue;
    const shortDest = path.join(pkgDir, `short_${i + 1}.mp4`);
    await fs.copyFile(s.shortPath, shortDest).catch(() => {});
    shortsMeta.push({
      index:    i + 1,
      path:     shortDest,
      score:    s.score,
      startSec: s.startSec,
      endSec:   s.endSec,
      sizeBytes: s.sizeBytes,
      qcPassed:  s.passed,
    });
  }

  // ── Compute content hash ────────────────────────────────────────────────
  const masterStat   = fsSync.existsSync(masterDest) ? fsSync.statSync(masterDest) : { size: 0 };
  const contentHash  = crypto.createHash('sha256')
    .update(`${productionId}:${masterStat.size}:${scenes.length}`)
    .digest('hex').slice(0, 16);

  // ── Build manifest ───────────────────────────────────────────────────────
  const manifest = {
    schemaVersion:   '1.0.0',
    productionId,
    contentHash,
    createdAt:       new Date().toISOString(),
    master: {
      path:      masterDest,
      sizeBytes: masterStat.size,
      qcPassed:  qcReport?.passed ?? false,
    },
    shorts:           shortsMeta,
    sceneCount:       scenes.length,
    totalWords,
    metadata: {
      youtubeTitle,
      youtubeDescription,
      youtubeTags,
      thumbnailPrompt,
    },
    qcSummary: {
      passed:   qcReport?.passed,
      checks:   (qcReport?.checks || []).map(c => ({ name: c.name, passed: c.passed, actual: c.actual })),
    },
    // Risk-based publish decision
    publishDecision: _publishDecision(qcReport, scenes),
  };

  // ── Write manifest JSON ──────────────────────────────────────────────────
  const manifestPath = path.join(pkgDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  // ── Write YouTube description file ───────────────────────────────────────
  const descLines = [
    youtubeTitle,
    '',
    youtubeDescription,
    '',
    youtubeTags.length ? `Tags: ${youtubeTags.slice(0, 10).join(', ')}` : '',
    '',
    '---',
    'Produced with autonomous AI video pipeline.',
  ];
  await fs.writeFile(path.join(pkgDir, 'youtube_description.md'), descLines.join('\n'), 'utf8');

  await sm.completeStage(productionId, 'Packaging', {
    outputHash: contentHash,
    metrics:    { sizeBytes: masterStat.size, shortCount: shortsMeta.length },
  });
  await telemetry.track({ productionId, stage: 'Packaging', provider: 'local', operation: 'package_assembly', units: 1 });

  return { productionId, packageDir: pkgDir, manifestPath, manifest };
}

/**
 * Determine publish decision based on QC report and scene risk levels.
 * LOW risk + all gates pass → AUTO_PUBLISH
 * MEDIUM risk → SAMPLE_REVIEW
 * HIGH risk or failed gates → MANDATORY_REVIEW
 */
function _publishDecision(qcReport, scenes) {
  if (!qcReport?.passed) return 'MANDATORY_REVIEW';
  const highRisk = scenes.filter(s => s.metadata?.importance === 'critical').length;
  if (highRisk === 0) return 'AUTO_PUBLISH';
  if (highRisk <= 3)  return 'SAMPLE_REVIEW';
  return 'MANDATORY_REVIEW';
}

module.exports = { runPackaging };
