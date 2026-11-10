/**
 * Workflow C — Assets
 * Synthesizes voice audio (TTS) and resolves user media (video_path / image_path).
 * Operates 100% code-driven: diffusion image generation is eliminated.
 *
 * Returns: { productionId, sceneAssets[{ sceneId, imagePath, videoPath, voicePath, visualType }] }
 */
'use strict';

const path   = require('path');
const crypto = require('crypto');
const { TTSProvider }   = require('../pipeline/providers');
const { StateMachine }  = require('../pipeline/state-machine');
const { RetryPolicy }   = require('../pipeline/retry-policy');
const { Telemetry }     = require('../pipeline/telemetry');

const os = require('os');
const FILES_DIR = process.env.N8N_FILES_DIR || require('path').join(os.homedir(), '.frameforge-files');
const STATE_DIR = `${FILES_DIR}/state`;
const VDIR      = `${FILES_DIR}/video_tmp`;

/**
 * Prepare all scene visuals (user media or code animation) and TTS audio in parallel batches.
 * @param {{ productionId: string, scenes: object[], parallelism?: number, skipTts?: boolean, voice?: string, topic?: string, style?: string, theme?: string, title?: string, language?: string }} opts
 * @returns {Promise<AssetsResult>}
 */
async function runAssets({
  productionId,
  scenes,
  parallelism = 1,
  skipTts = false,
  voice = null,
  topic = '',
  style = '',
  theme = '',
  title = '',
  language = '',
}) {
  const ttsGen    = new TTSProvider();
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 8000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });

  await sm.init();
  await telemetry.init();

  const fs = require('fs').promises;
  await fs.mkdir(VDIR, { recursive: true });

  await sm.startStage(productionId, 'Asset_Generation');

  const results = [];

  // Process scenes in batches of `parallelism`
  for (let i = 0; i < scenes.length; i += parallelism) {
    const batch = scenes.slice(i, i + parallelism);
    const batchResults = await Promise.all(batch.map(async scene => {
      const idx  = scene.scene_id - 1;

      // ── Visual Asset / Code-Driven Animation / User Clip ───────────────
      // Priority:
      // 1. video_path (user manual clip / b-roll)
      // 2. image_path (user manual image / graphic)
      // 3. Default: Code-driven animation (kinetic typography, procedural motion graphics)
      let imagePath = null;
      let visualType = 'code_animation';

      if (scene.video_path) {
        imagePath = null; // renderer handles video_path directly
        visualType = 'user_video';
      } else if (scene.image_path) {
        imagePath = scene.image_path;
        visualType = 'user_image';
      }

      // Automatically synthesize custom programmatic Canvas animation code with LLM if available
      let sceneCode = scene.code || scene.animation_code || null;
      if (!scene.video_path && !scene.image_path && !scene.html && !sceneCode) {
        try {
          const { generateSceneCodeWithLLM } = require('../video-renderer/scene-animator');
          sceneCode = await generateSceneCodeWithLLM({
            visualDescription: scene.visual_description || scene.narration,
            caption:           scene.caption,
            narration:         scene.narration,
            topic:             scene.topic || topic,
            style:             scene.style || style,
            language:          scene.language || language,
          });
        } catch (_) {}
      }

      // ── TTS / User Audio ───────────────────────────────────────────────
      // Priority: audio_path (pre-recorded) > TTS synthesis.
      // --no-tts / skipTts: skip synthesis (scene must have audio_path or silence is used).
      let voicePath;
      if (scene.audio_path) {
        voicePath = scene.audio_path;
      } else if (skipTts || scene._skipTts) {
        voicePath = null;
      } else {
        voicePath = path.join(VDIR, `voice_${idx}.m4a`);
        const ttsVoice = scene.voice || voice || undefined;
        await retryPol.executeStage('TTS', async () =>
          ttsGen.synthesize({ text: scene.narration, voice: ttsVoice, outputPath: voicePath })
        );
        await telemetry.track({ productionId, stage: 'TTS', provider: process.env.PROVIDER_TTS || 'edge-tts', operation: 'tts_synthesis', units: scene.narration.length });
      }

      return {
        sceneId:   scene.scene_id,
        imagePath,
        videoPath: scene.video_path || null,
        visualType,
        voicePath,
        caption:   scene.caption,
        camera:    scene.camera_hint || scene.camera || 'auto',
        focalPoint: scene.focal_point || null,
        narration: scene.narration || '',
        prompt:    scene.prompt || '',
        visualDescription: scene.visual_description || scene.prompt || scene.narration || '',
        topic:     scene.topic || topic || '',
        style:     scene.style || style || '',
        theme:     scene.theme || theme || '',
        title:     scene.title || title || '',
        musicMood: scene.music_mood || 'neutral',
        language:  scene.language || language || '',
        html:      scene.html || null,
        code:      sceneCode,
        duration:  scene.duration != null ? Number(scene.duration) : null,
        startTime: scene.start_time != null ? scene.start_time : scene.trim_start,
        endTime:   scene.end_time != null ? scene.end_time : scene.trim_end,
        speed:     scene.speed != null ? scene.speed : 1.0,
        clipVolume: scene.clip_volume != null ? scene.clip_volume : (scene.clipVolume != null ? scene.clipVolume : 0),
        colorGrade: scene.color_grade || scene.colorGrade || null,
      };
    }));
    results.push(...batchResults);
    if (i + parallelism < scenes.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const outputHash = crypto.createHash('sha256')
    .update(results.map(r => `${r.sceneId}:${r.voicePath}`).join(','))
    .digest('hex').slice(0, 16);

  await sm.completeStage(productionId, 'Asset_Generation', { outputHash, metrics: { sceneCount: results.length } });

  return { productionId, sceneAssets: results, sceneCount: results.length, outputHash };
}

module.exports = { runAssets };
