/**
 * Workflow D2 — Shorts
 * Task #32: master → segment scoring → vertical render with saliency/focal-point → QC
 *
 * Returns: { productionId, shorts[{ shortPath, score, qcReport }] }
 */
'use strict';

const path   = require('path');
const crypto = require('crypto');
const { StateMachine }      = require('../pipeline/state-machine');
const { RetryPolicy }       = require('../pipeline/retry-policy');
const { Telemetry }         = require('../pipeline/telemetry');
const { ShortsExtractor }   = require('../shorts-extractor/extractor');
const { QualityGate }       = require('../quality-gate/gate');

const os = require('os');
const FILES_DIR = process.env.N8N_FILES_DIR || require('path').join(os.homedir(), '.frameforge-files');
const STATE_DIR = `${FILES_DIR}/state`;

/**
 * Extract and render shorts from a master video.
 * @param {{ productionId: string, masterPath: string, scenes: object[], maxShorts?: number }} opts
 */
async function runShorts({ productionId, masterPath, scenes = [], maxShorts = 3 }) {
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 2, baseDelayMs: 10000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });
  const extractor = new ShortsExtractor({ filesDir: FILES_DIR });
  const qc        = new QualityGate();

  await sm.init();
  await telemetry.init();
  await sm.startStage(productionId, 'Shorts_Extraction');

  // Build scene metadata map for focal-point-aware cropping
  const sceneMeta = Object.fromEntries(
    scenes.map(s => [s.scene_id, {
      focalPoint:   s.focal_point,
      hookPotential: s.metadata?.hook_potential || 0.5,
      standalone:   s.metadata?.standalone || false,
    }])
  );

  // Discover candidate segments from master
  let segments;
  try {
    segments = await retryPol.executeStage('Shorts_Extraction', async () =>
      extractor.extractCandidates(masterPath, { sceneMeta, maxCandidates: maxShorts * 3 })
    );
  } catch (err) {
    await sm.failStage(productionId, 'Shorts_Extraction', err.message);
    throw err;
  }

  if (!segments || segments.length === 0) {
    await sm.skipStage(productionId, 'Shorts_Extraction', 'No suitable short segments found');
    return { productionId, shorts: [], skipped: true };
  }

  // Render top-N shorts as 9:16 vertical videos
  const shorts = [];
  const topSegments = segments.slice(0, maxShorts);

  for (let i = 0; i < topSegments.length; i++) {
    const seg = topSegments[i];
    const shortPath = path.join(FILES_DIR, `final_short_${productionId}_${i + 1}.mp4`);

    try {
      await retryPol.executeStage('Shorts_Extraction', async () =>
        extractor.renderShort(masterPath, seg, shortPath)
      );

      const qcReport = await qc.validateShort(shortPath);
      const stat = require('fs').statSync(shortPath);

      shorts.push({
        index:    i + 1,
        shortPath,
        score:    seg.score,
        startSec: seg.startSec,
        endSec:   seg.endSec,
        sizeBytes: stat.size,
        passed:   qcReport.passed,
        qcReport,
      });

      await telemetry.track({
        productionId,
        stage: 'Shorts_Extraction',
        provider: 'ffmpeg',
        operation: 'short_render',
        units: 1,
      });
    } catch (err) {
      console.error(`[Shorts] Short ${i + 1} render failed: ${err.message}`);
    }
  }

  const passedShorts = shorts.filter(s => s.passed);
  const outputHash   = crypto.createHash('sha256')
    .update(passedShorts.map(s => s.shortPath).join(','))
    .digest('hex').slice(0, 16);

  await sm.completeStage(productionId, 'Shorts_Extraction', {
    outputHash,
    metrics: { total: shorts.length, passed: passedShorts.length },
  });

  return { productionId, shorts: passedShorts, allShorts: shorts, outputHash };
}

module.exports = { runShorts };
