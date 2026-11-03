/**
 * FrameForge MCP Server — MCP 2024-11-05 spec compliant
 *
 * Exposes 14 video production tools via MCP.
 * Works with IBM Bob, Cursor, Windsurf, Codex, opencode, or any MCP-capable IDE.
 * Primary connection: Cloudflare Remote MCP (cloudflare-mcp/).
 * Alternative: stdio (src/mcp-server/stdio.js) or HTTP (this file).
 *
 * Primary path for agentic IDEs:
 *   create_video_from_script — IDE writes scenes, FrameForge renders (no internal LLM)
 *   multi_voice_tts          — per-call TTS platform override
 *
 * Full pipeline path (FrameForge does the research + scripting):
 *   research_topic, write_script, generate_scene_image, render_tts,
 *   assemble_video, publish_video
 *
 * Edit path:
 *   ingest_media, edit_scenes, render_from_scenes, external_platform_call
 *
 * Start: node src/mcp-server/server.js   (or: npm start)
 * Port:  MCP_PORT env (default 3210)
 *
 * Env (optional — only needed for pipeline-internal LLM calls):
 *   PROVIDER_LLM=groq|cerebras|openrouter|anthropic|gemini|mistral|together|openai|ollama|webhook
 *   PROVIDER_TTS=edge-tts|elevenlabs|azure|openai|webhook
 *   PROVIDER_IMAGE=pollinations|falai|replicate|dalle|webhook
 *   MCP_PORT=3210
 */

'use strict';

const http   = require('http');
const path   = require('path');
const fs     = require('fs').promises;
const crypto = require('crypto');

const { LLMProvider, TTSProvider, ImageProvider } = require('../pipeline/providers');
const { StateMachine }  = require('../pipeline/state-machine');
const { RetryPolicy }   = require('../pipeline/retry-policy');
const { Telemetry }     = require('../pipeline/telemetry');
const { VideoRenderer } = require('../video-renderer/renderer');
const { AudioMixer }    = require('../audio-mixer/mixer');
const { QualityGate }   = require('../quality-gate/gate');
const { runPublishing } = require('../workflows/publishing');

const PORT        = parseInt(process.env.MCP_PORT || '3210', 10);
const FILES_DIR   = process.env.N8N_FILES_DIR || '/home/node/.n8n-files';
const STATE_DIR   = path.join(FILES_DIR, 'state');
const USAGE_LOG   = path.join(FILES_DIR, 'usage.ndjson');

// Singletons
const llm       = new LLMProvider();
const tts       = new TTSProvider();
const imageGen  = new ImageProvider();
const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
const retryPol  = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 10000 });
const telemetry = new Telemetry({ mode: 'file', logPath: USAGE_LOG });

// ── Tool definitions ──────────────────────────────────────────────────────

const TOOLS = {

  // ── Tool 1: Research ────────────────────────────────────────────────────
  // Delegates to runResearch() which is fully generic — no hardcoded domain.
  research_topic: {
    description: 'Research any topic with fact extraction. Returns verified claims ready for script generation. Works for any content type: tech, cooking, travel, history, tutorials, etc.',
    inputSchema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic:      { type: 'string', description: 'Topic to research' },
        claimCount: { type: 'number', default: 10, description: 'Number of claims to extract' },
        persona:    { type: 'string', default: 'video content researcher', description: 'Researcher persona, e.g. "tech journalist", "travel blogger"' },
        format:     { type: 'string', default: 'video', description: 'e.g. "short-form reel", "long YouTube video", "explainer"' },
        style:      { type: 'string', default: 'informative', description: 'e.g. "educational", "comedic", "documentary"' },
        audience:   { type: 'string', default: 'general public', description: 'Target audience' },
      },
    },
    handler: async ({ topic, claimCount = 10, persona, format, style, audience }) => {
      const { runResearch } = require('../workflows/research');
      return runResearch(topic, { claimCount, persona, format, style, audience });
    },
  },

  // ── Tool 2: Script ───────────────────────────────────────────────────────
  // Delegates to runScript() which is fully generic — no hardcoded characters or domain.
  write_script: {
    description: 'Write a video script from research claims. Generic — works for any topic, style, language, or format. Returns structured scene JSON.',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'claims', 'topic'],
      properties: {
        productionId:    { type: 'string' },
        claims:          { type: 'array' },
        topic:           { type: 'string' },
        style:           { type: 'string', default: 'informative', description: 'e.g. "educational", "comedic", "documentary", "tutorial", "vlog"' },
        persona:         { type: 'string', default: 'video host', description: 'Who the narrator is, e.g. "travel blogger", "tech reviewer"' },
        format:          { type: 'string', default: 'YouTube video', description: 'e.g. "YouTube short", "Instagram reel", "long-form tutorial"' },
        language:        { type: 'string', default: 'en', description: 'BCP-47 language code for the script' },
        sceneCount:      { type: 'number', default: 55, description: 'Target number of scenes' },
        targetDuration:  { type: 'number', description: 'Target video duration in seconds (overrides sceneCount)' },
        imageStyle:      { type: 'string', default: 'clean flat illustration', description: 'Visual aesthetic for AI image prompts, e.g. "photorealistic", "anime", "watercolour"' },
      },
    },
    handler: async ({ productionId, claims, topic, style, persona, format, language, sceneCount, targetDuration, imageStyle }) => {
      const { runScript } = require('../workflows/script');
      const result = await runScript({ productionId, claims, topic, style, persona, format, language, sceneCount, targetDuration, imageStyle });
      return {
        productionId: result.productionId,
        scenes:       result.scenes,
        shorts:       result.shorts,
        title:        result.title,
        description:  result.description,
        tags:         result.tags,
        thumbnailPrompt: result.thumbnailPrompt,
        totalWords:   result.totalWords,
        sceneCount:   result.sceneCount,
      };
    },
  },

  // ── Tool 3: Generate scene image ─────────────────────────────────────────
  generate_scene_image: {
    description: 'Generate an image for one scene using the configured image provider. Pass imageStyle to control the visual aesthetic (default: clean flat illustration). No hardcoded art style.',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'sceneIndex', 'visualDescription'],
      properties: {
        productionId:     { type: 'string' },
        sceneIndex:       { type: 'number' },
        visualDescription:{ type: 'string', description: 'Scene visual description — used directly as image prompt' },
        imageStyle:       { type: 'string', description: 'Visual aesthetic, e.g. "flat design", "photorealistic", "anime", "watercolour sketch". Default: clean flat illustration.' },
        negativePrompt:   { type: 'string', description: 'What to exclude from the image (optional)' },
        seed:             { type: 'number', default: 12345 },
      },
    },
    handler: async ({
      productionId,
      sceneIndex,
      visualDescription,
      // Accept legacy 'visualAction' param name for backwards compat
      visualAction,
      imageStyle = 'clean flat illustration, white background, bold lines',
      negativePrompt = 'watermark, text, logo, blurry, low quality',
      seed = 12345,
    }) => {
      const vdir       = path.join(FILES_DIR, 'video_tmp');
      const outputPath = path.join(vdir, `scene_${sceneIndex}.png`);
      await fs.mkdir(vdir, { recursive: true });

      const description = visualDescription || visualAction || '';
      const prompt = `${description.trim()}, ${imageStyle}`;

      await retryPol.executeStage('Asset_Generation', async () => {
        return imageGen.generate({ prompt, negativePrompt, outputPath, width: 1920, height: 1080, seed: seed + sceneIndex * 37 });
      });

      const stat = await fs.stat(outputPath);
      await telemetry.track({ productionId, stage: 'Asset_Generation', provider: process.env.PROVIDER_IMAGE || 'pollinations', operation: 'scene_image_generation', units: 1 });

      return { productionId, sceneIndex, imagePath: outputPath, sizeBytes: stat.size };
    },
  },

  // ── Tool 4: TTS ──────────────────────────────────────────────────────────
  render_tts: {
    description: 'Convert narration text to audio using the configured TTS provider. Speech rate is controlled via TTS_RATE env var (default: -5%).',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'sceneIndex', 'text'],
      properties: {
        productionId: { type: 'string' },
        sceneIndex:   { type: 'number' },
        text:         { type: 'string' },
        voice:        { type: 'string', description: 'Voice ID (e.g. en-US-GuyNeural). Overrides TTS_VOICE env var.' },
      },
    },
    handler: async ({ productionId, sceneIndex, text, voice }) => {
      const vdir      = path.join(FILES_DIR, 'video_tmp');
      const outputPath = path.join(vdir, `voice_${sceneIndex}.m4a`);
      await fs.mkdir(vdir, { recursive: true });

      await retryPol.executeStage('TTS', async () => {
        // voice arg overrides env; rate is read from TTS_RATE env inside synthesize()
        return tts.synthesize({ text, voice, outputPath });
      });

      const stat = await fs.stat(outputPath);
      await telemetry.track({ productionId, stage: 'TTS', provider: process.env.PROVIDER_TTS || 'edge-tts', operation: 'tts_synthesis', units: text.length });

      return { productionId, sceneIndex, audioPath: outputPath, sizeBytes: stat.size };
    },
  },

  // ── Tool 5: Assemble video ────────────────────────────────────────────────
  assemble_video: {
    description: 'Assemble rendered scenes into a final MP4. Runs quality gate before returning.',
    inputSchema: {
      type: 'object',
      required: ['productionId'],
      properties: {
        productionId:  { type: 'string' },
        sceneCount:    { type: 'number', description: 'Number of scenes to assemble' },
        withMusic:     { type: 'boolean', default: true },
        musicVolume:   { type: 'number', default: 0.07 },
      },
    },
    handler: async ({ productionId, sceneCount, withMusic = true, musicVolume = 0.07 }) => {
      await sm.startStage(productionId, 'Video_Rendering');
      const renderer = new VideoRenderer({ filesDir: FILES_DIR });
      const mixer    = new AudioMixer({ filesDir: FILES_DIR });
      const qc       = new QualityGate();

      const masterPath = await retryPol.executeStage('Video_Rendering', async () => {
        return renderer.assembleMain({ productionId, sceneCount, withMusic, musicVolume });
      });

      const qcReport = await qc.validateMaster(masterPath);
      if (!qcReport.passed) {
        await sm.failStage(productionId, 'Video_Rendering', `QC failed: ${qcReport.checks.filter(c => !c.passed).map(c => c.name).join(', ')}`);
        return { productionId, passed: false, qcReport };
      }

      const hash = crypto.createHash('sha256');
      const stat = await fs.stat(masterPath);
      await sm.completeStage(productionId, 'Video_Rendering', { outputHash: hash.update(`${productionId}:${stat.size}`).digest('hex').slice(0,16) });
      await telemetry.track({ productionId, stage: 'Video_Rendering', provider: 'ffmpeg', operation: 'master_render', units: Math.round(stat.size / 1024 / 1024) });

      return { productionId, masterPath, passed: true, qcReport, sizeBytes: stat.size };
    },
  },

  // ── Tool 6: Publish video ─────────────────────────────────────────────────
  publish_video: {
    description: 'Deliver finished video via file copy or HTTP webhook. Channels: "file" (copy to published/) and/or "webhook" (POST JSON summary to PUBLISH_WEBHOOK_URL).',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'masterPath'],
      properties: {
        productionId:     { type: 'string' },
        masterPath:       { type: 'string' },
        channels:         { type: 'array', items: { type: 'string' }, default: ['file'], description: 'Delivery channels: file | webhook' },
        title:            { type: 'string', description: 'Video title for metadata and webhook payload' },
        description:      { type: 'string', description: 'Video description for metadata and webhook payload' },
      },
    },
    handler: async ({ productionId, masterPath, channels = ['file'], title = '', description = '' }) => {
      await sm.startStage(productionId, 'Publishing');

      const manifest = {
        master: { path: masterPath },
        metadata: { title, description },
        shorts: [],
        publishDecision: 'AUTO_PUBLISH',
      };
      const pubResult = await runPublishing({ productionId, manifest, channels });
      const results = pubResult.results || {};

      await sm.completeStage(productionId, 'Publishing', {});
      await sm.transitionProduction(productionId, 'SUCCEEDED').catch(() => {});
      await telemetry.track({ productionId, stage: 'Publishing', provider: 'multi', operation: 'video_delivery', units: 1 });

      return { productionId, results };
    },
  },

  // ── Tool 7: Ingest media (edit-only entry point) ──────────────────────────
  // Lets an IDE agent supply video clips, images, and audio without any LLM.
  // Returns a scenes manifest JSON ready for render_from_scenes.
  ingest_media: {
    description: 'Ingest user-supplied video clips, images, and/or audio files into a scenes manifest. No AI generation — edit-only entry point. Returns { productionId, scenesFile, sceneCount }.',
    inputSchema: {
      type: 'object',
      properties: {
        scenes:      { type: 'array',  description: 'Inline scene array. Each scene: { narration, caption, video_path, image_path, audio_path, camera_hint, music_mood }' },
        scenesFile:  { type: 'string', description: 'Path to a scenes.json file on disk' },
        mediaDir:    { type: 'string', description: 'Directory to auto-discover clips from' },
        productionId:{ type: 'string', description: 'Reuse an existing productionId (optional)' },
      },
    },
    handler: async ({ scenes, scenesFile, mediaDir, productionId } = {}) => {
      const { runIngest } = require('../workflows/ingest');
      const result = await runIngest({
        productionId,
        rawScenes:  scenes,
        scenesFile,
        mediaDir,
        outDir: FILES_DIR,
      });
      return { productionId: result.productionId, scenesFile: result.scenesFile, sceneCount: result.sceneCount, stats: result.stats };
    },
  },

  // ── Tool 8: Edit scenes (modify a scenes manifest) ────────────────────────
  // Lets an IDE agent read, modify, or annotate an existing scenes manifest.
  edit_scenes: {
    description: 'Read and optionally modify an existing scenes manifest. Use to add/update narration, captions, camera hints, or swap media files before rendering.',
    inputSchema: {
      type: 'object',
      required: ['productionId'],
      properties: {
        productionId: { type: 'string' },
        edits:        { type: 'array', description: 'Array of { sceneIndex: number, field: string, value: any } patches to apply' },
        appendScenes: { type: 'array', description: 'New scenes to append to the manifest' },
      },
    },
    handler: async ({ productionId, edits = [], appendScenes = [] }) => {
      const fsp       = require('fs').promises;
      const syncFs    = require('fs');
      // Guard: productionId must not contain path separators (prevents path traversal)
      if (!productionId || /[/\\]/.test(productionId)) {
        throw new Error(`Invalid productionId: must not contain path separators`);
      }
      // Find the scenes manifest for this productionId
      const scenesPath = path.join(FILES_DIR, `${productionId}-scenes.json`);
      if (!syncFs.existsSync(scenesPath)) {
        throw new Error(`No scenes manifest found for productionId: ${productionId}. Run ingest_media first.`);
      }
      const manifest = JSON.parse(syncFs.readFileSync(scenesPath, 'utf8'));
      const scenes   = manifest.scenes || [];

      // Apply field-level edits
      for (const { sceneIndex, field, value } of edits) {
        if (sceneIndex >= 0 && sceneIndex < scenes.length && field) {
          scenes[sceneIndex][field] = value;
        }
      }

      // Append new scenes
      for (const s of appendScenes) {
        scenes.push({ scene_id: scenes.length + 1, schema_version: '1.0.0', ...s });
      }

      manifest.scenes    = scenes;
      manifest.sceneCount = scenes.length;
      manifest.updatedAt  = new Date().toISOString();

      const tmpPath = scenesPath + '.tmp';
      syncFs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf8');
      syncFs.renameSync(tmpPath, scenesPath);

      return { productionId, scenesFile: scenesPath, sceneCount: scenes.length, message: `Applied ${edits.length} edit(s), appended ${appendScenes.length} scene(s)` };
    },
  },

  // ── Tool 9: Render from scenes (edit-only render path) ────────────────────
  // Renders a scenes manifest directly — skipping research and script stages.
  render_from_scenes: {
    description: 'Render a video directly from a scenes manifest, skipping research and script generation. Supply a productionId from ingest_media, or pass scenes inline.',
    inputSchema: {
      type: 'object',
      properties: {
        productionId: { type: 'string', description: 'From ingest_media / edit_scenes' },
        scenes:       { type: 'array',  description: 'Inline scenes array (alternative to productionId)' },
        skipImages:   { type: 'boolean', default: false, description: 'Skip AI image generation (use video_path / image_path in scenes)' },
        skipTts:      { type: 'boolean', default: false, description: 'Skip TTS synthesis (use audio_path in scenes)' },
        withMusic:    { type: 'boolean', default: true },
        musicVolume:  { type: 'number',  default: 0.07 },
      },
    },
    handler: async ({ productionId, scenes, skipImages = false, skipTts = false, withMusic = true, musicVolume = 0.07 }) => {
      const syncFs = require('fs');
      const { runAssets }   = require('../workflows/assets');
      const { runRender }   = require('../workflows/render');
      const { runIngest }   = require('../workflows/ingest');

      // Guard: productionId must not contain path separators (prevents path traversal)
      if (productionId && /[/\\]/.test(productionId)) {
        throw new Error(`Invalid productionId: must not contain path separators`);
      }

      // Resolve scenes
      let resolvedScenes = scenes;
      let resolvedPid    = productionId;

      if (!resolvedScenes && productionId) {
        const scenesPath = path.join(FILES_DIR, `${productionId}-scenes.json`);
        if (!syncFs.existsSync(scenesPath)) throw new Error(`No scenes manifest for: ${productionId}. Run ingest_media first.`);
        const m = JSON.parse(syncFs.readFileSync(scenesPath, 'utf8'));
        resolvedScenes = m.scenes;
      }

      if (!resolvedScenes || resolvedScenes.length === 0) {
        throw new Error('No scenes to render. Provide productionId or inline scenes.');
      }

      if (!resolvedPid) {
        const crypto = require('crypto');
        resolvedPid = `render_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;
      }

      // Run assets stage (respecting skip flags)
      const assetsResult = await runAssets({
        productionId: resolvedPid,
        scenes:       resolvedScenes,
        parallelism:  4,
        skipImages,
        skipTts,
      });

      // Run render stage
      const renderResult = await runRender({
        productionId: resolvedPid,
        sceneAssets:  assetsResult.sceneAssets,
        withMusic,
        musicVolume,
      });

      if (!renderResult.passed) {
        return { productionId: resolvedPid, passed: false, qcReport: renderResult.qcReport };
      }

      return {
        productionId: resolvedPid,
        masterPath:   renderResult.masterPath,
        passed:       true,
        sizeBytes:    renderResult.sizeBytes,
        sceneCount:   renderResult.sceneCount,
        qcReport:     renderResult.qcReport,
      };
    },
  },

  // ── Tool 10: External platform call ────────────────────────────────────────
  // Bridge to VoxForge, Runway, ElevenLabs, Remotion, or any external platform.
  external_platform_call: {
    description: 'Send media or scenes to an external platform (VoxForge, Runway, ElevenLabs, Remotion, etc.). Configured via EXTERNAL_PLATFORM_* env vars or setup-keys wizard.',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action:      { type: 'string', enum: ['ingest','render','status','download'], description: 'ingest: upload media files | render: send scenes for rendering | status: poll job | download: fetch output' },
        files:       { type: 'array',  items: { type: 'string' }, description: 'Local file paths (for action=ingest)' },
        scenes:      { type: 'array',  description: 'Scene array (for action=render)' },
        productionId:{ type: 'string', description: 'productionId (for action=render)' },
        jobId:       { type: 'string', description: 'Job ID to poll (for action=status)' },
        outputUrl:   { type: 'string', description: 'URL to download (for action=download)' },
        outputPath:  { type: 'string', description: 'Local path to save download (for action=download)' },
        metadata:    { type: 'object', description: 'Extra fields forwarded to the platform' },
      },
    },
    handler: async ({ action, files, scenes, productionId, jobId, outputUrl, outputPath, metadata }) => {
      const { ExternalAdapter } = require('../pipeline/external-adapter');
      const adapter = new ExternalAdapter();
      if (!adapter.isConfigured()) {
        throw new Error('External platform not configured. Run: node src/cli/setup-keys.js to set EXTERNAL_PLATFORM_URL and EXTERNAL_PLATFORM_KEY.');
      }

      switch (action) {
        case 'ingest':
          return adapter.ingestMedia({ files: files || [], metadata: metadata || {} });
        case 'render':
          return adapter.renderScenes({ scenes: scenes || [], productionId, options: metadata || {} });
        case 'status':
          if (!jobId) throw new Error('action=status requires jobId');
          return adapter.checkStatus(jobId);
        case 'download':
          if (!outputUrl || !outputPath) throw new Error('action=download requires outputUrl and outputPath');
          await adapter.downloadOutput(outputUrl, outputPath);
          return { outputPath, downloaded: true };
        default:
          throw new Error(`Unknown action: ${action}. Use ingest|render|status|download`);
      }
    },
  },

  // ── Tool 11: Agent-first video creation (IDE writes the script, FF renders) ──
  // Primary path for IBM Bob / Claude Code / Cursor users.
  // The IDE agent writes the scenes array in its own context — no internal LLM needed.
  create_video_from_script: {
    description: `Agent-first video creation. YOU (the IDE agent) provide the complete scenes array — FrameForge just renders it. No internal LLM, no research stage. This is the primary path for Claude Code, IBM Bob, Cursor, and any agentic IDE.

Example scene:
{
  "narration": "The text spoken aloud in this scene",
  "caption": "OVERLAY TEXT",
  "visual_description": "A description used as the AI image prompt",
  "camera_hint": "zoom_in",
  "music_mood": "energetic",
  "image_path": "/optional/your/own/image.jpg",
  "audio_path": "/optional/your/own/voice.mp3"
}`,
    inputSchema: {
      type: 'object',
      required: ['scenes'],
      properties: {
        scenes:       { type: 'array',   description: 'Complete scenes array written by the agent. Each scene: { narration, caption, visual_description, camera_hint?, music_mood?, image_path?, video_path?, audio_path? }' },
        title:        { type: 'string',  description: 'Video title' },
        skipImages:   { type: 'boolean', default: false, description: 'Set true if all scenes already have image_path or video_path' },
        skipTts:      { type: 'boolean', default: false, description: 'Set true if all scenes already have audio_path' },
        imageStyle:   { type: 'string',  description: 'Visual aesthetic for AI-generated images, e.g. "photorealistic", "anime", "flat design". Only used when skipImages is false.' },
        withMusic:    { type: 'boolean', default: true },
        musicVolume:  { type: 'number',  default: 0.07 },
        productionId: { type: 'string',  description: 'Optional — reuse an existing productionId' },
      },
    },
    handler: async ({ scenes, title = 'FrameForge Video', skipImages = false, skipTts = false, imageStyle, withMusic = true, musicVolume = 0.07, productionId }) => {
      const { runAssets } = require('../workflows/assets');
      const { runRender } = require('../workflows/render');

      if (!Array.isArray(scenes) || scenes.length === 0) {
        throw new Error('scenes array is required and must not be empty. You (the IDE agent) write the scenes.');
      }

      // Apply imageStyle to visual_description if provided and skipImages is false
      const processedScenes = scenes.map((s, i) => ({
        scene_id:           s.scene_id || i + 1,
        schema_version:     '2.0.0',
        narration:          s.narration          || '',
        caption:            s.caption            || '',
        visual_description: imageStyle && !s.image_path && !s.video_path
          ? `${s.visual_description || ''}, ${imageStyle}`.trim()
          : (s.visual_description  || ''),
        camera_hint:        s.camera_hint        || 'auto',
        music_mood:         s.music_mood         || 'neutral',
        image_path:         s.image_path         || null,
        video_path:         s.video_path         || null,
        audio_path:         s.audio_path         || null,
        character:          s.character          || { character_id: 'none', pose: 'none', emotion: 'neutral', position: { x: 0.5, y: 0.8, scale: 1.0 } },
        focal_point:        s.focal_point        || { x: 0.5, y: 0.35, weight: 0.8 },
        overlay:            s.overlay            || { type: 'none' },
        sound_effects:      s.sound_effects      || [],
        metadata:           s.metadata           || { importance: 'medium', hook_potential: 0.5, standalone: false },
      }));

      const pid = productionId || `agent_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;

      const assetsResult = await runAssets({ productionId: pid, scenes: processedScenes, parallelism: 4, skipImages, skipTts });
      const renderResult = await runRender({ productionId: pid, sceneAssets: assetsResult.sceneAssets, withMusic, musicVolume });

      if (!renderResult.passed) {
        return { productionId: pid, passed: false, qcReport: renderResult.qcReport };
      }

      return {
        productionId: pid,
        masterPath:   renderResult.masterPath,
        passed:       true,
        sizeBytes:    renderResult.sizeBytes,
        sceneCount:   renderResult.sceneCount,
        title,
        message: `Video ready at: ${renderResult.masterPath}`,
      };
    },
  },

  // ── Tool 12: Multi-platform TTS ──────────────────────────────────────────
  // Call any voice platform per-request without changing global .env
  multi_voice_tts: {
    description: 'Convert text to speech using any supported voice platform per-call. Overrides the global PROVIDER_TTS for this one request. Supports: edge-tts, elevenlabs, azure, openai, custom webhook.',
    inputSchema: {
      type: 'object',
      required: ['text', 'outputPath'],
      properties: {
        text:       { type: 'string', description: 'Text to synthesise' },
        outputPath: { type: 'string', description: 'Where to save the audio file (.m4a or .mp3)' },
        platform:   { type: 'string', enum: ['edge-tts','elevenlabs','azure','openai','webhook'], description: 'TTS platform. Overrides PROVIDER_TTS for this call.' },
        voice:      { type: 'string', description: 'Voice ID. edge-tts: e.g. en-US-GuyNeural. ElevenLabs: voice_id. Azure: short name. OpenAI: alloy/echo/fable/nova/onyx/shimmer.' },
        rate:       { type: 'string', description: 'Speaking rate, e.g. "-10%" for slower, "+20%" for faster (edge-tts)' },
        apiKey:     { type: 'string', description: 'API key for this call (optional — falls back to env var)' },
        webhookUrl: { type: 'string', description: 'TTS webhook URL (when platform=webhook)' },
        productionId: { type: 'string', description: 'Optional productionId for telemetry' },
        sceneIndex: { type: 'number', description: 'Optional scene index for naming the output file' },
      },
    },
    handler: async ({ text, outputPath, platform, voice, rate, apiKey, webhookUrl, productionId = 'adhoc', sceneIndex }) => {
      const syncFs  = require('fs');
      const pathMod = require('path');

      // Guard: outputPath must not escape FILES_DIR — prevent path traversal
      if (outputPath) {
        const absOutput  = pathMod.resolve(outputPath);
        const absFilesDir = pathMod.resolve(FILES_DIR);
        if (!absOutput.startsWith(absFilesDir + pathMod.sep) && !absOutput.startsWith(absFilesDir)) {
          throw new Error(`outputPath must be inside the files directory (${FILES_DIR})`);
        }
      } else {
        throw new Error('outputPath is required');
      }

      // Auto-derive outputPath if sceneIndex given and outputPath is a directory
      let resolvedOutput = outputPath;
      if (sceneIndex !== undefined && syncFs.existsSync(outputPath) && syncFs.statSync(outputPath).isDirectory()) {
        resolvedOutput = pathMod.join(outputPath, `voice_${sceneIndex}.m4a`);
      }
      await fs.mkdir(pathMod.dirname(resolvedOutput), { recursive: true });

      // Create a TTSProvider with per-call options — no process.env mutation needed.
      // This is concurrency-safe: each invocation has its own provider instance.
      const { TTSProvider } = require('../pipeline/providers');
      const ttsInstance = new TTSProvider({ platform, voice, rate, apiKey, webhookUrl });

      await retryPol.executeStage('TTS', async () => {
        return ttsInstance.synthesize({ text, voice, outputPath: resolvedOutput });
      });

      const stat = await fs.stat(resolvedOutput);
      const resolvedPlatform = platform || process.env.PROVIDER_TTS || 'edge-tts';
      await telemetry.track({ productionId, stage: 'TTS', provider: resolvedPlatform, operation: 'multi_voice_tts', units: text.length });

      return { audioPath: resolvedOutput, sizeBytes: stat.size, platform: resolvedPlatform, voice };
    },
  },

  // ── Tool 14: Get job status ────────────────────────────────────────────────
  // Poll a job that was queued via queue_full_pipeline (Tool 13).
  // Returns the current status, stage, and result when the job completes.
  get_job_status: {
    description: 'Poll a queued pipeline job by jobId. Returns { status:"RUNNING"|"SUCCEEDED"|"FAILED", stage, result, error }. Call every 30s until SUCCEEDED. Required after queue_full_pipeline.',
    inputSchema: {
      type: 'object',
      required: ['jobId'],
      properties: {
        jobId: { type: 'string', description: 'The jobId returned by queue_full_pipeline' },
      },
    },
    handler: async ({ jobId }) => {
      if (!jobId) throw new Error('jobId is required');
      const targetUrl = process.env.WORKER_API_URL;
      if (!targetUrl) {
        throw new Error('Set WORKER_API_URL in .env (the worker HTTP endpoint, e.g. http://localhost:3211)');
      }

      const isHttps = targetUrl.startsWith('https');
      const client  = require(isHttps ? 'https' : 'http');
      const safePath = `/jobs/${encodeURIComponent(jobId)}`;

      const internalToken = process.env.INTERNAL_API_TOKEN;
      return new Promise((resolve, reject) => {
        const url = new URL(targetUrl.replace(/\/$/, '') + safePath);
        const req = client.request({
          hostname: url.hostname,
          port:     url.port || (isHttps ? 443 : 80),
          path:     url.pathname + url.search,
          method:   'GET',
          headers:  internalToken ? { Authorization: `Bearer ${internalToken}` } : {},
        }, (res) => {
          const chunks = [];
          res.on('data', d => chunks.push(d));
          res.on('end', () => {
            if (res.statusCode >= 400) return reject(new Error(`Worker returned HTTP ${res.statusCode}`));
            const text = Buffer.concat(chunks).toString('utf8');
            try { resolve(JSON.parse(text)); } catch { resolve({ raw: text }); }
          });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('get_job_status timeout')); });
        req.end();
      });
    },
  },

  // ── Tool 13: Queue full pipeline ──────────────────────────────────────────
  // Trigger a full pipeline job on the worker API or a generic HTTP endpoint.
  queue_full_pipeline: {
    description: 'Queue a full video pipeline job (research → script → render → publish) on the worker API or any HTTP endpoint. Returns {jobId, status} immediately — poll get_job_status for completion. Set WORKER_API_URL to target the worker, or pass webhookUrl for any custom endpoint.',
    inputSchema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic:      { type: 'string', description: 'Video topic to produce' },
        style:      { type: 'string', default: 'informative', description: 'Narrative style, e.g. "educational", "comedic"' },
        language:   { type: 'string', default: 'en', description: 'BCP-47 language code for TTS voice selection' },
        channels:   { type: 'array', items: { type: 'string' }, default: ['file'], description: 'Delivery channels for the publish step: file | webhook' },
        webhookUrl: { type: 'string', description: 'HTTP endpoint to POST the job to. Overrides WORKER_API_URL env var.' },
        payload:    { type: 'object', description: 'Additional fields forwarded to the worker' },
      },
    },
    handler: async ({ topic, style = 'informative', language = 'en', channels = ['file'], webhookUrl, payload = {} }) => {
      const targetUrl = webhookUrl || process.env.WORKER_API_URL;
      if (!targetUrl) {
        throw new Error('Set WORKER_API_URL in .env (the worker HTTP endpoint, e.g. http://localhost:3211) or pass webhookUrl.');
      }

      const isHttps = targetUrl.startsWith('https');
      const client  = require(isHttps ? 'https' : 'http');
      const body    = JSON.stringify({ type: 'full_pipeline', payload: { topic, style, language, channels, ...payload } });
      const internalToken = process.env.INTERNAL_API_TOKEN;
      const authHeaders = internalToken ? { Authorization: `Bearer ${internalToken}` } : {};

      const result = await new Promise((resolve, reject) => {
        const url = new URL(`${targetUrl.replace(/\/$/, '')}/jobs`);
        const req = client.request({
          hostname: url.hostname,
          port:     url.port || (isHttps ? 443 : 80),
          path:     url.pathname + url.search,
          method:   'POST',
          headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...authHeaders },
        }, (res) => {
          const chunks = [];
          res.on('data', d => chunks.push(d));
          res.on('end', () => {
            if (res.statusCode >= 400) return reject(new Error(`Worker returned HTTP ${res.statusCode}`));
            const text = Buffer.concat(chunks).toString('utf8');
            try { resolve(JSON.parse(text)); } catch { resolve({ raw: text }); }
          });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Worker request timeout')); });
        req.write(body);
        req.end();
      });

      const jobId = result.id || result.jobId || crypto.randomBytes(8).toString('hex');
      return { jobId, status: result.status || 'QUEUED', topic, workerResponse: result };
    },
  },
};

// ── MCP protocol handler (MCP 2024-11-05 spec) ───────────────────────────

const SERVER_INFO = {
  name:    'video-pipeline',
  version: '2.3.0',
};

const CAPABILITIES = {
  tools: { listChanged: false },
};

async function handleMCPRequest(body) {
  const { method, params, id } = body;

  // ── MCP lifecycle ─────────────────────────────────────────────────────────

  // initialize — required handshake; IDEs send this first
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo:      SERVER_INFO,
        capabilities:    CAPABILITIES,
      },
    };
  }

  // notifications/initialized — no response expected
  if (method === 'notifications/initialized') return null;

  // ping
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };

  // ── Tool calls ────────────────────────────────────────────────────────────

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0', id,
      result: { tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema })) },
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const tool = TOOLS[name];
    if (!tool) return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } };
    try {
      const result = await tool.handler(args || {});
      return {
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      };
    } catch (err) {
      return {
        jsonrpc: '2.0', id,
        error: { code: -32000, message: err.message, data: { errorClass: err.errorClass, stageName: err.stageName } },
      };
    }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

// ── HTTP server ───────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 4 MB body limit — prevents OOM on Render free tier from oversized payloads
const MAX_BODY_BYTES = 4 * 1024 * 1024;

async function readBodyLimited(req) {
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
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function start() {
  await sm.init();
  await telemetry.init();

  // Warn on startup if auth is disabled (intentional for local dev, risky otherwise)
  if (!process.env.MCP_AUTH_TOKEN) {
    console.warn('[MCP] WARNING: MCP_AUTH_TOKEN not set — HTTP MCP endpoint is unauthenticated. Set MCP_AUTH_TOKEN in .env for production use.');
  }

  const server = http.createServer(async (req, res) => {
    // CORS pre-flight (required by browser-based IDE extensions)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      return res.end();
    }

    // Health check — omit tool list to avoid leaking internal API surface
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', serverInfo: SERVER_INFO }));
    }

    if (req.method !== 'POST') {
      res.writeHead(405, CORS_HEADERS); return res.end();
    }

    let rawBody;
    try {
      rawBody = await readBodyLimited(req);
    } catch (err) {
      const status = err.statusCode || 400;
      res.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: err.message } }));
    }

    let body;
    try { body = JSON.parse(rawBody); } catch {
      res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }));
    }

    // Handle JSON-RPC batch (array) or single request
    let response;
    if (Array.isArray(body)) {
      const results = await Promise.all(body.map(handleMCPRequest));
      response = results.filter(r => r !== null); // drop notifications
    } else {
      response = await handleMCPRequest(body);
      if (response === null) { res.writeHead(204, CORS_HEADERS); return res.end(); }
    }

    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[video-pipeline MCP] listening on http://127.0.0.1:${PORT}`);
    console.log(`[video-pipeline MCP] protocol: MCP 2024-11-05`);
    console.log(`[video-pipeline MCP] tools: ${Object.keys(TOOLS).join(', ')}`);
    console.log(`[video-pipeline MCP] LLM=${process.env.PROVIDER_LLM || 'groq'} TTS=${process.env.PROVIDER_TTS || 'edge-tts'} Image=${process.env.PROVIDER_IMAGE || 'pollinations'}`);
  });
}

if (require.main === module) {
  start().catch(err => { console.error('[video-agent MCP] startup failed:', err); process.exit(1); });
}

module.exports = { handleMCPRequest, TOOLS, SERVER_INFO, start };
