/**
 * Workflow C — Assets
 * Task #30: scenes → character identity lookup → image generation per scene
 *
 * Returns: { productionId, sceneAssets[{ sceneId, imagePath, voicePath }] }
 */
'use strict';

const path   = require('path');
const crypto = require('crypto');
const { ImageProvider, TTSProvider } = require('../pipeline/providers');
const { StateMachine }  = require('../pipeline/state-machine');
const { RetryPolicy }   = require('../pipeline/retry-policy');
const { Telemetry }     = require('../pipeline/telemetry');
const { AssetLibrary }  = require('../asset-library/asset-library');

const FILES_DIR = process.env.N8N_FILES_DIR || '/home/node/.n8n-files';
const STATE_DIR = `${FILES_DIR}/state`;
const VDIR      = `${FILES_DIR}/video_tmp`;

// Visual style applied to every image
const STYLE_SUFFIX = '2D flat vector cartoon, hand-drawn marker doodle, pure white background, thick solid black outlines 4px, zero shading, flat color fills, big round expressive eyes, web comic panel style';
const NEG_PROMPT   = 'photorealistic, 3D render, CGI, painting, dark background, gradient, shadow, texture, noise, watermark, text, logo';

/**
 * Generate all scene images and TTS audio in parallel batches.
 * @param {{ productionId: string, scenes: object[], parallelism?: number }} opts
 * @returns {Promise<AssetsResult>}
 */
async function runAssets({ productionId, scenes, parallelism = 4 }) {
  const imageGen  = new ImageProvider();
  const ttsGen    = new TTSProvider();
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 8000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });
  const assetLib  = new AssetLibrary({ assetsDir: `${FILES_DIR}/assets` });

  await sm.init();
  await telemetry.init();
  await assetLib.initialize().catch(() => {}); // best-effort asset lib init

  const fs = require('fs').promises;
  await fs.mkdir(VDIR, { recursive: true });

  await sm.startStage(productionId, 'Asset_Generation');

  const results = [];

  // Process scenes in batches of `parallelism`
  for (let i = 0; i < scenes.length; i += parallelism) {
    const batch = scenes.slice(i, i + parallelism);
    const batchResults = await Promise.all(batch.map(async scene => {
      const idx  = scene.scene_id - 1;
      const seed = 42 + idx * 37; // deterministic seed per scene

      // ── Image ──────────────────────────────────────────────────────────
      const imagePath = path.join(VDIR, `scene_${idx}.png`);
      const prompt    = `${(scene.visual_description || scene.visual_action || '').replace(/\[[A-Z]+\]/g, '').trim()}, ${STYLE_SUFFIX}`;

      await retryPol.executeStage('Asset_Generation', async () =>
        imageGen.generate({ prompt, negativePrompt: NEG_PROMPT, outputPath: imagePath, width: 1920, height: 1080, seed })
      );

      // ── TTS ────────────────────────────────────────────────────────────
      const voicePath = path.join(VDIR, `voice_${idx}.m4a`);
      const voice     = process.env.DEFAULT_VOICE || 'en-US-GuyNeural';

      await retryPol.executeStage('TTS', async () =>
        ttsGen.synthesize({ text: scene.narration, voice, outputPath: voicePath, rate: '-5%' })
      );

      await telemetry.track({ productionId, stage: 'Asset_Generation', provider: process.env.PROVIDER_IMAGE || 'pollinations', operation: 'scene_image', units: 1 });
      await telemetry.track({ productionId, stage: 'TTS', provider: process.env.PROVIDER_TTS || 'edge-tts', operation: 'tts_synthesis', units: scene.narration.length });

      return { sceneId: scene.scene_id, imagePath, voicePath, caption: scene.caption, camera: scene.camera_hint || scene.camera || 'static' };
    }));
    results.push(...batchResults);
    if (i + parallelism < scenes.length) {
      // Small delay between batches to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const outputHash = crypto.createHash('sha256')
    .update(results.map(r => r.imagePath).join(','))
    .digest('hex').slice(0, 16);

  await sm.completeStage(productionId, 'Asset_Generation', { outputHash, metrics: { sceneCount: results.length } });

  return { productionId, sceneAssets: results, sceneCount: results.length, outputHash };
}

module.exports = { runAssets };
