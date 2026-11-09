/**
 * Workflow D — Rendering
 * Task #31: assets → TTS → audio mix → master video
 *
 * Returns: { productionId, masterPath, qcReport, sizeBytes }
 */
'use strict';

const path   = require('path');
const crypto = require('crypto');
const { StateMachine }  = require('../pipeline/state-machine');
const { RetryPolicy }   = require('../pipeline/retry-policy');
const { Telemetry }     = require('../pipeline/telemetry');
const { VideoRenderer } = require('../video-renderer/renderer');
const { AudioMixer }    = require('../audio-mixer/mixer');
const { QualityGate }   = require('../quality-gate/gate');

const os = require('os');
const FILES_DIR = process.env.N8N_FILES_DIR || require('path').join(os.homedir(), '.frameforge-files');
const STATE_DIR = `${FILES_DIR}/state`;

/**
 * Render all scene assets into a final master video.
 * @param {{ productionId: string, sceneAssets: object[], withMusic?: boolean, musicVolume?: number, renderWidth?: number, renderHeight?: number, topic?: string, style?: string, theme?: string, title?: string, language?: string }} opts
 * @returns {Promise<RenderResult>}
 */
async function runRender({
  productionId,
  sceneAssets,
  withMusic = true,
  musicVolume = 0.07,
  renderWidth = 1920,
  renderHeight = 1080,
  topic = '',
  style = '',
  theme = '',
  title = '',
  language = '',
  showCaptions = false,
}) {
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 2, baseDelayMs: 15000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });
  const renderer  = new VideoRenderer({ filesDir: FILES_DIR });
  const mixer     = new AudioMixer({ filesDir: FILES_DIR });
  const qc        = new QualityGate();

  await sm.init();
  await telemetry.init();
  await sm.startStage(productionId, 'Video_Rendering');

  // ── Phase 1: Render individual scenes ─────────────────────────────────
  const sceneFiles = [];
  for (const asset of sceneAssets) {
    const idx = asset.sceneId - 1;
    try {
      const scenePath = renderer.renderScene({
        sceneIndex:        idx,
        imagePath:         asset.imagePath,
        videoPath:         asset.videoPath,
        voicePath:         asset.voicePath,
        caption:           asset.caption || '',
        narration:         asset.narration || '',
        visualDescription: asset.visualDescription || '',
        visualType:        asset.visualType || 'code_animation',
        topic:             asset.topic || topic || '',
        style:             asset.style || style || '',
        theme:             asset.theme || theme || '',
        title:             asset.title || title || '',
        musicMood:         asset.musicMood || 'neutral',
        language:          asset.language || language || '',
        camera:            asset.camera  || 'static',
        focalPoint:        asset.focalPoint || null,
        html:              asset.html || null,
        code:              asset.code || null,
        startTime:         asset.startTime,
        endTime:           asset.endTime,
        speed:             asset.speed,
        clipVolume:        asset.clipVolume,
        colorGrade:        asset.colorGrade,
        showCaptions:      asset.showCaptions !== undefined ? asset.showCaptions : showCaptions,
        renderWidth,
        renderHeight,
      });
      sceneFiles.push(scenePath);
    } catch (err) {
      console.error(`[Render] Scene ${idx} failed: ${err.message} — skipping`);
    }
  }

  if (sceneFiles.length < 1) {
    await sm.failStage(productionId, 'Video_Rendering', `No scenes rendered successfully`);
    throw new Error(`No scenes rendered successfully`);
  }
  if (sceneFiles.length < 3) {
    console.warn(`[Render] WARNING: only ${sceneFiles.length} scene(s) rendered — video will be short. Minimum 3 recommended.`);
  }

  // ── Phase 2: Assemble master ──────────────────────────────────────────
  const masterPath = await retryPol.executeStage('Video_Rendering', async () =>
    renderer.assembleMain({ productionId, sceneCount: sceneFiles.length, withMusic, musicVolume })
  );

  // ── Phase 3: Quality gate ─────────────────────────────────────────────
  const qcReport = await qc.validateMaster(masterPath);
  if (!qcReport.passed) {
    const failed = qcReport.checks.filter(c => !c.passed).map(c => c.name).join(', ');
    await sm.failStage(productionId, 'Video_Rendering', `QC failed: ${failed}`);
    return { productionId, passed: false, qcReport, masterPath: null };
  }

  const stat = require('fs').statSync(masterPath);
  const outputHash = crypto.createHash('sha256')
    .update(`${productionId}:${stat.size}:${sceneFiles.length}`)
    .digest('hex').slice(0, 16);

  await sm.completeStage(productionId, 'Video_Rendering', {
    outputHash,
    metrics: { sceneCount: sceneFiles.length, sizeBytes: stat.size },
  });
  await telemetry.track({
    productionId,
    stage: 'Video_Rendering',
    provider: 'ffmpeg',
    operation: 'master_render',
    units: Math.round(stat.size / 1024 / 1024),
  });

  return { productionId, masterPath, passed: true, qcReport, sizeBytes: stat.size, sceneCount: sceneFiles.length, outputHash };
}

module.exports = { runRender };
