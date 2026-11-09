/**
 * FrameForge MCP Server — MCP 2024-11-05 spec compliant
 *
 * Exposes 19 video production & autonomous editing tools via MCP.
 * Works with IBM Bob, Cursor, Windsurf, Codex, opencode, Claude Code, or any MCP-capable IDE.
 * Primary connection: Cloudflare Remote MCP (cloudflare-mcp/).
 * Alternative: stdio (src/mcp-server/stdio.js) or HTTP (this file).
 *
 * Primary path for agentic IDEs:
 *   create_video_from_script — IDE writes scenes, FrameForge renders (no internal LLM)
 *   edit_video               — Autonomous local video editor (cut, trim, speed, grade, transition, mix)
 *   multi_voice_tts          — per-call TTS platform override
 *
 * Full pipeline path (FrameForge does the research + scripting):
 *   research_topic, write_script, generate_scene_image, render_tts,
 *   assemble_video, publish_video
 *
 * Edit path:
 *   edit_video, ingest_media, edit_scenes, render_from_scenes, external_platform_call, export_to_editor
 *
 * Start: node src/mcp-server/server.js   (or: npm start)
 * Port:  MCP_PORT env (default 3210)
 *
 * Env (optional — only needed for pipeline-internal LLM calls):
 *   PROVIDER_LLM=groq|cerebras|openrouter|anthropic|gemini|mistral|together|openai|ollama|webhook
 *   PROVIDER_TTS=edge-tts|elevenlabs|azure|openai|webhook
 *   Visuals: 100% code-driven animation (default) or user media
 *   MCP_PORT=3210
 */

'use strict';

const http   = require('http');
const path   = require('path');
const os     = require('os');

const fs     = require('fs').promises;
const crypto = require('crypto');

const { LLMProvider, TTSProvider } = require('../pipeline/providers');
const { StateMachine }  = require('../pipeline/state-machine');
const { RetryPolicy }   = require('../pipeline/retry-policy');
const { Telemetry }     = require('../pipeline/telemetry');
const { VideoRenderer } = require('../video-renderer/renderer');
const { AudioMixer }    = require('../audio-mixer/mixer');
const { QualityGate }   = require('../quality-gate/gate');
const { runPublishing } = require('../workflows/publishing');

const PORT        = parseInt(process.env.MCP_PORT || '3210', 10);
const FILES_DIR   = process.env.N8N_FILES_DIR || path.join(os.homedir(), '.frameforge-files');
const STATE_DIR   = path.join(FILES_DIR, 'state');
const USAGE_LOG   = path.join(FILES_DIR, 'usage.ndjson');

// Singletons
const llm       = new LLMProvider();
const tts       = new TTSProvider();
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

  // ── Tool 3: Generate scene visual ─────────────────────────────────────────
  generate_scene_image: {
    description: 'Registers or generates a code-driven visual card for one scene. FrameForge uses 100% code-driven animation and user media instead of diffusion.',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'sceneIndex'],
      properties: {
        productionId:     { type: 'string' },
        sceneIndex:       { type: 'number' },
        visualDescription:{ type: 'string', description: 'Scene visual description' },
        imagePath:        { type: 'string', description: 'Optional user image path' },
      },
    },
    handler: async ({
      productionId,
      sceneIndex,
      visualDescription,
      visualAction,
      imagePath = null,
    }) => {
      const description = visualDescription || visualAction || '';
      await telemetry.track({ productionId, stage: 'Asset_Generation', provider: 'code_animation', operation: 'scene_visual_registered', units: 1 });

      return {
        productionId,
        sceneIndex,
        imagePath: imagePath || null,
        visualType: imagePath ? 'user_image' : 'code_animation',
        visualDescription: description,
        message: 'Scene visual ready. 100% code-driven kinetic animation active.',
      };
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
        orientation:  { type: 'string', enum: ['landscape', 'portrait'], default: 'landscape', description: 'Output orientation. "landscape" = 1920×1080 (16:9). "portrait" = 1080×1920 (9:16, TikTok/Reels/Shorts).' },
        skipImages:   { type: 'boolean', default: false, description: 'Skip AI image generation (use video_path / image_path in scenes)' },
        skipTts:      { type: 'boolean', default: false, description: 'Skip TTS synthesis (use audio_path in scenes)' },
        withMusic:    { type: 'boolean', default: true },
        musicVolume:  { type: 'number',  default: 0.07 },
        topic:        { type: 'string',  description: 'Overall topic/genre for visual theme and aesthetic selection' },
        style:        { type: 'string',  description: 'Visual style/theme override (e.g. cinematic_documentary, finance_executive, cyber_tech, retro_synthwave, nature_organic, hype_sports, minimal_luxury, breaking_news, cosmic_space)' },
        theme:        { type: 'string',  description: 'Theme preset alias' },
        title:        { type: 'string',  description: 'Video title' },
        language:     { type: 'string',  description: 'BCP-47 language hint (e.g. ml, hi, en, ta)' },
      },
    },
    handler: async ({ productionId, scenes, orientation = 'landscape', skipImages = false, skipTts = false, withMusic = true, musicVolume = 0.07, topic = '', style = '', theme = '', title = '', language = '' }) => {
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

      const renderWidth  = orientation === 'portrait' ? 1080 : 1920;
      const renderHeight = orientation === 'portrait' ? 1920 : 1080;

      // Run assets stage (respecting skip flags)
      const assetsResult = await runAssets({
        productionId: resolvedPid,
        scenes:       resolvedScenes,
        parallelism:  4,
        skipImages,
        skipTts,
        topic,
        style,
        theme,
        title,
        language,
        imageWidth:  renderWidth,
        imageHeight: renderHeight,
      });

      // Run render stage
      const renderResult = await runRender({
        productionId: resolvedPid,
        sceneAssets:  assetsResult.sceneAssets,
        withMusic,
        musicVolume,
        renderWidth,
        renderHeight,
        topic,
        style,
        theme,
        title,
        language,
        showCaptions,
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
    description: `Call any external platform or custom MCP-compatible app via HTTP — no env vars required when you pass platformUrl directly.

Works with any app that exposes an HTTP API: your own custom editor, VoxForge, Runway, Kling, Pika, Remotion, ElevenLabs, or anything you build.

Actions:
  ingest   — upload/import files (POST multipart to the platform)
  edit     — send an operations array to drive editing in the app
  render   — send scenes or a render job request
  status   — poll a job by jobId
  download — fetch a remote URL to a local file

Named presets (set EXTERNAL_PLATFORM_NAME to one of these and omit platformUrl):
  voxforge, elevenlabs, runway, kling, pika, remotion, premiere, resolve, capcut, aftereffects`,
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action:      { type: 'string', enum: ['ingest','edit','render','status','download'], description: 'ingest: upload files | edit: send operations to drive the app | render: submit render job | status: poll job | download: fetch output' },
        platformUrl: { type: 'string', description: 'Base URL of the target app/platform (e.g. http://localhost:8080 or https://api.myapp.io). Overrides EXTERNAL_PLATFORM_URL. Pass this to connect any custom app without touching .env.' },
        platformKey: { type: 'string', description: 'API key or bearer token for the platform. Overrides EXTERNAL_PLATFORM_KEY.' },
        platformName:{ type: 'string', description: 'Named preset to use (voxforge|elevenlabs|runway|kling|premiere|resolve|capcut|aftereffects|remotion). When set, default paths are applied automatically.' },
        files:       { type: 'array',  items: { type: 'string' }, description: 'Local file paths (for action=ingest)' },
        operations:  { type: 'array',  description: 'Edit operations array (for action=edit). Each: { op, clip?, at?, between?, type?, duration?, text?, ... }' },
        scenes:      { type: 'array',  description: 'Scene array (for action=render)' },
        productionId:{ type: 'string', description: 'productionId (for action=render)' },
        jobId:       { type: 'string', description: 'Job ID to poll (for action=status)' },
        outputUrl:   { type: 'string', description: 'URL to download (for action=download)' },
        outputPath:  { type: 'string', description: 'Local path to save download (for action=download)' },
        metadata:    { type: 'object', description: 'Extra fields forwarded to the platform' },
      },
    },
    handler: async ({ action, platformUrl, platformKey, platformName, files, operations, scenes, productionId, jobId, outputUrl, outputPath, metadata }) => {
      const { ExternalAdapter } = require('../pipeline/external-adapter');

      // Build adapter — per-call platformUrl/platformKey override env vars entirely.
      // This means you can connect any custom app without setting EXTERNAL_PLATFORM_* in .env.
      const adapterConfig = {};
      if (platformName) adapterConfig.name    = platformName;
      if (platformUrl)  adapterConfig.baseUrl = platformUrl;
      if (platformKey)  adapterConfig.apiKey  = platformKey;

      const adapter = new ExternalAdapter(adapterConfig);

      // If no URL was provided via param or env and action !== 'edit', give clear setup message
      if (!adapter.isConfigured() && action !== 'edit') {
        throw new Error(
          'No platform URL configured. Either:\n' +
          '  • Pass platformUrl: "http://localhost:8080" (connects any custom app immediately)\n' +
          '  • Set EXTERNAL_PLATFORM_URL in .env (persistent)\n' +
          '  • Run: npx frameforge-setup   (interactive wizard)'
        );
      }

      switch (action) {
        case 'ingest':
          return adapter.ingestMedia({ files: files || [], metadata: metadata || {} });

        case 'edit': {
          // Validate operations
          const ops = operations || [];
          if (ops.length === 0) throw new Error('action=edit requires at least one operation in the operations array');
          const validOps = ['cut','trim','transition','color','caption','mute','speed','swap','assemble'];
          for (const [i, o] of ops.entries()) {
            if (!o.op) throw new Error(`operations[${i}] missing "op" field`);
            if (!validOps.includes(o.op)) throw new Error(`operations[${i}].op "${o.op}" not valid. Use: ${validOps.join(', ')}`);
          }

          if (adapter.isConfigured()) {
            return adapter.renderScenes({ scenes: [], productionId: 'edit', options: { operations: ops, ...(metadata || {}) } });
          }

          // Fallback: Local autonomous VideoEditor execution
          const { VideoEditor } = require('../video-editor/editor');
          const localEditor = new VideoEditor({ filesDir: FILES_DIR });
          return localEditor.applyOperations({
            operations: ops,
            files: files || [],
            outputPath,
            orientation: metadata?.orientation || 'landscape',
            musicPath: metadata?.musicPath || metadata?.music_path,
            musicVolume: metadata?.musicVolume != null ? metadata?.musicVolume : 0.08,
            audioPath: metadata?.audioPath || metadata?.audio_path,
          });
        }

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
          throw new Error(`Unknown action: ${action}. Use ingest|edit|render|status|download`);
      }
    },
  },

  // ── Tool 11: Agent-first video creation (IDE writes the script, FF renders) ──
  // Primary path for IBM Bob / Claude Code / Cursor users.
  // The IDE agent writes the scenes array in its own context — no internal LLM needed.
  create_video_from_script: {
    description: `Agent-first video creation. YOU (the IDE agent) provide the complete scenes array — FrameForge renders it.
Features:
- Code-driven animation and kinetic typography by default (broadcast quality, zero AI artifacts).
- Supports direct agent/user code: pass "html" (complete page with window.seek(t)) or "code" (canvas drawing instructions for t).
- Procedural full-canvas cinematic animations (celestial orbits, DNA helices, candlestick charts, neural nets, 3D wireframe geometry).
- Supports manual user clips (video_path) and manual images (image_path).
- No internal LLM or research required. Primary path for Claude Code, IBM Bob, Cursor, and any agentic IDE.

Example scene:
{
  "narration": "The text spoken aloud in this scene",
  "caption": "OVERLAY TEXT",
  "visual_description": "Description of the scene visual / animation",
  "html": "<!doctype html>... window.seek = async (t) => { ... }",
  "code": "/* canvas drawing code for t */",
  "camera_hint": "zoom_in",
  "music_mood": "energetic",
  "image_path": "/optional/your/own/image.jpg",
  "video_path": "/optional/your/own/clip.mp4",
  "audio_path": "/optional/your/own/voice.mp3"
}`,
    inputSchema: {
      type: 'object',
      required: ['scenes'],
      properties: {
        scenes:         { type: 'array',   description: 'Complete scenes array written by the agent. Each scene: { narration, caption, visual_description, html?, code?, camera_hint?, music_mood?, image_path?, video_path?, audio_path?, voice? }' },
        title:          { type: 'string',  description: 'Video title' },
        orientation:    { type: 'string',  enum: ['landscape', 'portrait'], default: 'landscape', description: 'Output orientation. "landscape" = 1920×1080 (16:9, YouTube/desktop). "portrait" = 1080×1920 (9:16, TikTok/Reels/Shorts).' },
        voice:          { type: 'string',  description: 'edge-tts voice ID for all scenes, e.g. "ml-IN-MidhunNeural" (Malayalam male), "en-US-BrianNeural" (English). Per-scene voice field overrides this. Full list: edge-tts --list-voices' },
        language:       { type: 'string',  description: 'BCP-47 language hint, e.g. "ml" (Malayalam), "hi" (Hindi), "ta" (Tamil), "te" (Telugu), "en" (English). Auto-selects a default voice for the language when voice is not set.' },
        skipTts:        { type: 'boolean', default: false, description: 'Set true if all scenes already have audio_path' },
        parallelism:    { type: 'number',  default: 1, description: 'Concurrent TTS synthesis requests (default: 1).' },
        withMusic:      { type: 'boolean', default: true },
        musicVolume:    { type: 'number',  default: 0.07 },
        topic:          { type: 'string',  description: 'Overall topic/genre for visual aesthetic and background motion (e.g. "Kerala history", "crypto finance", "AI robotics")' },
        style:          { type: 'string',  description: 'Visual style/theme override (e.g. cinematic_documentary, finance_executive, cyber_tech, retro_synthwave, nature_organic, hype_sports, minimal_luxury, breaking_news, cosmic_space)' },
        theme:          { type: 'string',  description: 'Theme preset alias' },
        showCaptions:   { type: 'boolean', default: false, description: 'Display on-screen synchronized subtitles/captions. Default false (clean canvas without text unless explicitly requested in prompt).' },
        productionId:   { type: 'string',  description: 'Optional — reuse an existing productionId' },
      },
    },
    handler: async ({ scenes, title = 'FrameForge Video', orientation = 'landscape', voice, language, skipTts = false, parallelism = 1, withMusic = true, musicVolume = 0.07, topic = '', style = '', theme = '', showCaptions = false, productionId }) => {
      const { runAssets } = require('../workflows/assets');
      const { runRender } = require('../workflows/render');

      if (!Array.isArray(scenes) || scenes.length === 0) {
        throw new Error('scenes array is required and must not be empty. You (the IDE agent) write the scenes.');
      }

      // Auto-select voice from language hint when voice is not explicitly provided.
      // Maps BCP-47 language prefix → default edge-tts neural voice.
      const LANGUAGE_VOICES = {
        'ml': 'ml-IN-MidhunNeural',   // Malayalam male
        'hi': 'hi-IN-MadhurNeural',   // Hindi male
        'ta': 'ta-IN-ValluvarNeural',  // Tamil male
        'te': 'te-IN-MohanNeural',     // Telugu male
        'kn': 'kn-IN-GaganNeural',    // Kannada male
        'bn': 'bn-IN-BashkarNeural',  // Bengali male
        'mr': 'mr-IN-ManoharNeural',  // Marathi male
        'gu': 'gu-IN-NiranjanNeural', // Gujarati male
        'pa': 'pa-IN-OjasvNeural',    // Punjabi male
        'ur': 'ur-PK-AsadNeural',     // Urdu male
        'zh': 'zh-CN-YunxiNeural',    // Chinese male
        'ja': 'ja-JP-KeitaNeural',    // Japanese male
        'ko': 'ko-KR-InJoonNeural',   // Korean male
        'ar': 'ar-SA-HamedNeural',    // Arabic male
        'fr': 'fr-FR-HenriNeural',    // French male
        'de': 'de-DE-ConradNeural',   // German male
        'es': 'es-ES-AlvaroNeural',   // Spanish male
        'pt': 'pt-BR-AntonioNeural',  // Portuguese male
        'it': 'it-IT-DiegoNeural',    // Italian male
        'ru': 'ru-RU-DmitryNeural',   // Russian male
      };
      const resolvedVoice = voice || (language ? LANGUAGE_VOICES[language.toLowerCase().slice(0, 2)] : null) || null;

      const processedScenes = scenes.map((s, i) => ({
        scene_id:           s.scene_id || i + 1,
        schema_version:     '2.0.0',
        narration:          s.narration          || '',
        caption:            s.caption            || '',
        visual_description: s.visual_description || '',
        camera_hint:        s.camera_hint        || 'auto',
        music_mood:         s.music_mood         || 'neutral',
        image_path:         s.image_path         || null,
        video_path:         s.video_path         || null,
        audio_path:         s.audio_path         || null,
        voice:              s.voice              || null,  // per-scene voice override
        html:               s.html               || null,
        code:               s.code || s.animation_code || null,
        topic:              s.topic              || topic || '',
        style:              s.style              || style || '',
        theme:              s.theme              || theme || '',
        language:           s.language           || language || '',
        character:          s.character          || { character_id: 'none', pose: 'none', emotion: 'neutral', position: { x: 0.5, y: 0.8, scale: 1.0 } },
        focal_point:        s.focal_point        || { x: 0.5, y: 0.35, weight: 0.8 },
        overlay:            s.overlay            || { type: 'none' },
        sound_effects:      s.sound_effects      || [],
        metadata:           s.metadata           || { importance: 'medium', hook_potential: 0.5, standalone: false },
      }));

      const pid = productionId || `agent_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;

      // Resolve output dimensions from orientation
      const renderWidth  = orientation === 'portrait' ? 1080 : 1920;
      const renderHeight = orientation === 'portrait' ? 1920 : 1080;

      const assetsResult = await runAssets({
        productionId: pid,
        scenes: processedScenes,
        parallelism,
        skipTts,
        voice: resolvedVoice,
        topic,
        style,
        theme,
        title,
        language,
        showCaptions,
      });
      const renderResult = await runRender({
        productionId: pid,
        sceneAssets: assetsResult.sceneAssets,
        withMusic,
        musicVolume,
        renderWidth,
        renderHeight,
        topic,
        style,
        theme,
        title,
        language,
        showCaptions,
      });

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
    description: 'Convert text to speech using any supported voice platform per-call. Overrides the global PROVIDER_TTS for this one request. Supports: edge-tts, voxforge, elevenlabs, azure, openai, webhook.',
    inputSchema: {
      type: 'object',
      required: ['text', 'outputPath'],
      properties: {
        text:       { type: 'string', description: 'Text to synthesise' },
        outputPath: { type: 'string', description: 'Where to save the audio file (.m4a or .mp3)' },
        platform:   { type: 'string', enum: ['edge-tts','voxforge','elevenlabs','azure','openai','webhook'], description: 'TTS platform. Overrides PROVIDER_TTS for this call. "voxforge" = github.com/amg555/voxforge; uses VOXFORGE_URL + VOXFORGE_KEY.' },
        voice:      { type: 'string', description: 'Voice ID. edge-tts: e.g. en-US-GuyNeural. ElevenLabs: voice_id. Azure: short name. OpenAI: alloy/echo/fable/nova/onyx/shimmer.' },
        rate:       { type: 'string', description: 'Speaking rate, e.g. "-10%" for slower, "+20%" for faster (edge-tts)' },
        apiKey:     { type: 'string', description: 'API key for this call (optional — falls back to env var)' },
        webhookUrl: { type: 'string', description: 'TTS webhook URL (when platform=webhook)' },
        productionId: { type: 'string', description: 'Optional productionId for telemetry' },
        sceneIndex: { type: 'number', description: 'Optional scene index for naming the output file' },
      },
    },
    handler: async ({ text, outputPath, platform: _platform, voice, rate, apiKey, webhookUrl, productionId = 'adhoc', sceneIndex }) => {
      const syncFs  = require('fs');
      const pathMod = require('path');
      // Normalise platform name so 'voxforge' routes correctly
      const platform = _platform ? _platform.toLowerCase() : undefined;

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

      // SSRF guard — only when the URL came from agent input (webhookUrl param),
      // not from the operator-configured WORKER_API_URL env var (trusted).
      if (webhookUrl) {
        const { _assertSafeWebhookUrl } = require('../workflows/publishing');
        _assertSafeWebhookUrl(webhookUrl);
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
  // ── Tool 15: Scaffold animation project ──────────────────────────────────
  // Copies the HTML compositor template (reel/engine.js, index.html, scripts/)
  // into a new project folder and generates a starter edit.js from the scenes
  // the agent wrote. The agent then edits edit.js and calls render_animation.
  scaffold_animation_project: {
    description: `Scaffold a code-driven HTML compositor project for high-quality animated video.
Every frame is a pure function of time t rendered by Playwright + ffmpeg — no AI image generation needed.
Copies the engine template into outDir and generates a starter edit.js from your scenes.

Use this when:
- You want Remotion-style motion graphics (kinetic text, springs, morphing layouts)
- You want broadcast-grade visual quality with zero diffusion artifacts
- The user asks for animated video, code-rendered video, or "make it look good"

After scaffolding, the agent edits edit.js in outDir to animate each scene, then calls render_animation.`,
    inputSchema: {
      type: 'object',
      required: ['outDir'],
      properties: {
        outDir:    { type: 'string', description: 'Directory to scaffold the project into (created if absent)' },
        scenes:    { type: 'array',  description: 'Scene array from create_video_from_script / write_script. Each scene narration/caption/visual_description generates one layer() in edit.js.' },
        title:     { type: 'string', description: 'Video title — written into edit.js reel() config' },
        width:     { type: 'number', default: 1920, description: '1920 for landscape, 1080 for portrait (Shorts)' },
        height:    { type: 'number', default: 1080, description: '1080 for landscape, 1920 for portrait (Shorts)' },
        fps:       { type: 'number', default: 30 },
        audioPath: { type: 'string', description: 'Path to the mixed audio file to mux in (from multi_voice_tts or mix_audio.py)' },
      },
    },
    handler: async ({ outDir, scenes = [], title = 'FrameForge Animation', width = 1920, height = 1080, fps = 30, audioPath }) => {
      const syncFs = require('fs');
      const pathMod = require('path');

      if (!outDir) throw new Error('outDir is required');

      // Locate the engine template shipped with FrameForge
      const templateDir = pathMod.resolve(__dirname, '../../plugins/video-pipeline/skills/video-pipeline/assets/project');
      if (!syncFs.existsSync(templateDir)) {
        throw new Error(`Engine template not found at ${templateDir}. Ensure the FrameForge plugins/ folder is present.`);
      }

      // Create output directory
      syncFs.mkdirSync(outDir, { recursive: true });
      syncFs.mkdirSync(pathMod.join(outDir, 'out'), { recursive: true });
      syncFs.mkdirSync(pathMod.join(outDir, 'reel'), { recursive: true });
      syncFs.mkdirSync(pathMod.join(outDir, 'scripts'), { recursive: true });

      // Copy engine files — all scripts the agent and production pipeline may need
      const engineFiles = [
        ['reel/engine.js', 'reel/engine.js'],
        ['reel/engine.css', 'reel/engine.css'],
        ['reel/virtual-clock.js', 'reel/virtual-clock.js'],
        ['scripts/render.mjs', 'scripts/render.mjs'],
        ['scripts/harness.mjs', 'scripts/harness.mjs'],
        ['scripts/browser.mjs', 'scripts/browser.mjs'],
        ['scripts/verify-purity.mjs', 'scripts/verify-purity.mjs'],
        ['scripts/pixels.mjs', 'scripts/pixels.mjs'],
        ['scripts/sheets.mjs', 'scripts/sheets.mjs'],
        ['scripts/jobs.mjs', 'scripts/jobs.mjs'],
        ['scripts/encode.mjs', 'scripts/encode.mjs'],
        ['scripts/look.mjs', 'scripts/look.mjs'],
        ['scripts/storyboard-validator.mjs', 'scripts/storyboard-validator.mjs'],
        ['scripts/mix_audio.py', 'scripts/mix_audio.py'],
        ['scripts/transcribe.py', 'scripts/transcribe.py'],
        ['scripts/verify.py', 'scripts/verify.py'],
        ['scripts/capture.mjs', 'scripts/capture.mjs'],     // website/tweet screenshot b-roll
        ['scripts/stock.py', 'scripts/stock.py'],             // stock footage search
        ['scripts/video_job.py', 'scripts/video_job.py'],   // detached job queue with spend caps
        ['ANIMATION_GUIDE.md', 'ANIMATION_GUIDE.md'],
        ['STORYBOARD.md', 'STORYBOARD.md'],
        // Pipeline subagent briefings (loaded by subagents, not the orchestrator's context)
        ['pipeline/briefings/orchestrator.md', 'pipeline/briefings/orchestrator.md'],
        ['pipeline/briefings/scene-author.md', 'pipeline/briefings/scene-author.md'],
        ['pipeline/briefings/diagram-author.md', 'pipeline/briefings/diagram-author.md'],
      ];

      const copied = [];
      for (const [src, dest] of engineFiles) {
        const srcPath  = pathMod.join(templateDir, src);
        const destPath = pathMod.join(outDir, dest);
        if (syncFs.existsSync(srcPath)) {
          syncFs.mkdirSync(pathMod.dirname(destPath), { recursive: true });
          syncFs.copyFileSync(srcPath, destPath);
          copied.push(dest);
        }
      }

      // Copy index.html (compositor page — requires #stage div, engine.css, and edit.js module)
      const indexSrc = pathMod.join(templateDir, 'index.html');
      if (syncFs.existsSync(indexSrc)) {
        syncFs.copyFileSync(indexSrc, pathMod.join(outDir, 'index.html'));
        copied.push('index.html');
      } else {
        // Fallback compositor — correct structure with #stage for engine.js to append layers into
        const minimalHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="reel/engine.css">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  #stage { position: relative; width: var(--reel-width, 1920px); height: var(--reel-height, 1080px); overflow: hidden; background: #000; }
  #stage > [data-layer] { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
</style>
</head><body>
<div id="stage"></div>
<script type="module" src="edit.js"></script>
</body></html>`;
        syncFs.writeFileSync(pathMod.join(outDir, 'index.html'), minimalHtml, 'utf8');
        copied.push('index.html (generated fallback)');
      }

      // Generate starter edit.js from scenes with contextual code-driven animation components
      let duration = 0;
      const sceneBlocks = scenes.map((scene, idx) => {
        const wordsPerSec = 2.5;
        const words = (scene.narration || '').split(/\s+/).filter(Boolean).length;
        const dur = Math.max(2, Math.round((words / wordsPerSec) * 10) / 10);
        const start = Math.round(duration * 10) / 10;
        duration = Math.round((duration + dur) * 10) / 10;
        const caption = (scene.caption || `Scene ${idx + 1}`).replace(/'/g, "\\'");
        const visual = (scene.visual_description || scene.narration || '').slice(0, 80).replace(/'/g, "\\'");
        const textLower = ((scene.narration || '') + ' ' + (scene.visual_description || '') + ' ' + caption).toLowerCase();

        let componentCode;
        if (scene.image_path) {
          componentCode = `at(${start}, imageCard(${JSON.stringify(scene.image_path)}, { caption: ${JSON.stringify(caption)}, width: ${Math.round(width * 0.72)}, x: 'center', y: 'center', duration: ${dur} }));`;
        } else if (scene.video_path) {
          componentCode = `at(${start}, wallCard([{ text: ${JSON.stringify(caption)}, size: 28, weight: 800, color: 'var(--accent)' }], { x: 'center', y: ${Math.round(height * 0.78)}, width: ${Math.round(width * 0.8)}, duration: ${dur} }));`;
        } else if (/\b(code|function|syntax|api|javascript|python|typescript|json|sql|query|endpoint|algorithm|struct)\b/.test(textLower)) {
          const snippet = visual.length > 20 ? visual : `// ${caption}\nfunction execute() {\n  return "${caption.toLowerCase()}";\n}`;
          componentCode = `at(${start}, codeCard(${JSON.stringify(snippet)}, 'js', { title: ${JSON.stringify(caption)}, width: ${Math.round(width * 0.76)}, x: 'center', y: ${Math.round(height * 0.22)}, duration: ${dur} }));`;
        } else if (/\b(terminal|command|cli|bash|shell|npm|install|curl|git|docker|deploy|run)\b/.test(textLower)) {
          const cmd = caption.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          componentCode = `at(${start}, terminal(['$ frameforge ${cmd}', '${caption} — initializing...', '✓ complete (${dur}s)'], { title: ${JSON.stringify(caption)}, width: ${Math.round(width * 0.74)}, x: 'center', y: ${Math.round(height * 0.24)}, duration: ${dur} }));`;
        } else {
          componentCode = [
            `at(${start}, wallCard([`,
            `  { text: ${JSON.stringify(caption)}, size: 36, weight: 800, color: 'var(--accent)' },`,
            `  { text: ${JSON.stringify((scene.narration || '').slice(0, 130).replace(/'/g, "\\'"))}, size: 24, weight: 400 }`,
            `], { x: 'center', y: ${Math.round(height * 0.30)}, width: ${Math.round(width * 0.82)}, duration: ${dur} }));`,
            `at(${start}, stamp(${JSON.stringify(caption.slice(0, 16))}, { x: ${Math.round(width * 0.75)}, y: ${Math.round(height * 0.18)}, color: 'var(--accent)', duration: ${dur} }));`,
          ].join('\n');
        }

        return [
          `// ─── Scene ${idx + 1}: ${start}s–${duration}s ────────────────────────────────`,
          `// Visual: ${visual}`,
          `layer('scene${idx + 1}').on(t => {`,
          `  const lt = t - ${start};`,
          `  if (lt < 0 || lt > ${dur}) return { opacity: 0 };`,
          `  const fadeIn  = Math.min(1, lt / 0.3);`,
          `  const fadeOut = lt > ${dur} - 0.3 ? 1 - (lt - (${dur} - 0.3)) / 0.3 : 1;`,
          `  return { opacity: fadeIn * fadeOut };`,
          `});`,
          componentCode,
          '',
        ].join('\n');
      });

      const editJs = [
        `/**`,
        ` * edit.js — generated by FrameForge scaffold_animation_project`,
        ` * Title: ${title}`,
        ` *`,
        ` * AGENT INSTRUCTIONS:`,
        ` * 1. Read ANIMATION_GUIDE.md for the six determinism rules.`,
        ` * 2. Validate STORYBOARD.md: node scripts/storyboard-validator.mjs STORYBOARD.md`,
        ` * 3. Replace each scene block below with real animation (see reel/engine.js API).`,
        ` * 4. Check visuals: node scripts/render.mjs sheet`,
        ` * 5. Full render:   node scripts/render.mjs full${audioPath ? ` --audio="${audioPath}"` : ''}`,
        ` *`,
        ` * Iron rule: every style must be a PURE FUNCTION OF t.`,
        ` * Never use Math.random(), Date.now(), setTimeout, or module-level mutable counters.`,
        ` * Use hash(i) from engine.js for deterministic randomness.`,
        ` */`,
        `import { reel, layer, at, text, wallCard, codeCard, terminal, imageCard, stamp, chip, hash } from './reel/engine.js';`,
        ``,
        `reel({ width: ${width}, height: ${height}, fps: ${fps}, duration: ${duration} });`,
        ``,
        ...sceneBlocks,
      ].join('\n');

      syncFs.writeFileSync(pathMod.join(outDir, 'edit.js'), editJs, 'utf8');

      return {
        outDir,
        title,
        duration,
        sceneCount: scenes.length,
        copied,
        editJs: pathMod.join(outDir, 'edit.js'),
        nextSteps: [
          `1. Read ANIMATION_GUIDE.md — six determinism rules and four storyboard gates (run from ${outDir})`,
          `2. Edit STORYBOARD.md — every shot needs an event, non-overlapping reads, named transitions, no text`,
          `3. Validate: node scripts/storyboard-validator.mjs STORYBOARD.md (run from ${outDir})`,
          `4. Edit edit.js — replace starter layers with real animation (pure functions of t)`,
          `5. Pre-flight: node scripts/look.mjs (fonts, clipped text, NaN transforms)`,
          `6. Check sheet: node scripts/render.mjs sheet  (one sheet per shot)`,
          `   Check motion: node scripts/render.mjs strip <start> <end>  (every frame of a key motion)`,
          `   Check mobile: node scripts/render.mjs crop 9:16 <t>`,
          `7. Full render: node scripts/render.mjs full${audioPath ? ` --audio="${audioPath}"` : ''} (run from ${outDir})`,
          `   Requires: npm install playwright && npx playwright install chromium`,
          `8. Unattended/batch: python scripts/video_job.py submit --spec spec.json --max-usd 2.00`,
        ],
        message: `Animation project scaffolded at ${outDir}. Read ANIMATION_GUIDE.md, validate STORYBOARD.md, edit edit.js, then render.`,
      };
    },
  },

  // ── Tool 16: Validate storyboard ─────────────────────────────────────────
  // Hard-gate check on STORYBOARD.md before any scene code is allowed.
  validate_storyboard: {
    description: 'Validate a STORYBOARD.md or storyboard.json against the four hard gates (event, non-overlapping reads, named transitions, no on-screen text). Returns { passed, errors, warnings }. Must pass before writing scene code.',
    inputSchema: {
      type: 'object',
      required: ['storyboardPath'],
      properties: {
        storyboardPath: { type: 'string', description: 'Path to STORYBOARD.md or storyboard.json' },
      },
    },
    handler: async ({ storyboardPath }) => {
      const syncFs  = require('fs');
      const pathMod = require('path');
      const { spawnSync } = require('child_process');

      if (!storyboardPath) throw new Error('storyboardPath is required');
      if (!syncFs.existsSync(storyboardPath)) throw new Error(`Storyboard file not found: ${storyboardPath}`);

      // Find the validator script relative to the storyboard file's project
      const projectDir = pathMod.dirname(storyboardPath);
      const validatorPath = pathMod.join(projectDir, 'scripts', 'storyboard-validator.mjs');
      const fallbackValidator = pathMod.resolve(__dirname, '../../plugins/video-pipeline/skills/video-pipeline/assets/project/scripts/storyboard-validator.mjs');
      const validator = syncFs.existsSync(validatorPath) ? validatorPath : fallbackValidator;

      if (!syncFs.existsSync(validator)) {
        throw new Error(`Storyboard validator not found. Run scaffold_animation_project first.`);
      }

      const result = spawnSync('node', [validator, storyboardPath], { encoding: 'utf8', timeout: 15000 });
      const output = (result.stdout || '') + (result.stderr || '');
      const passed = result.status === 0;

      // Parse errors and warnings from the validator output
      const errors   = [];
      const warnings = [];
      for (const line of output.split('\n')) {
        if (line.includes('❌')) errors.push(line.replace(/\s*❌\s*/, '').trim());
        if (line.includes('⚠️')) warnings.push(line.replace(/\s*⚠️\s*/, '').trim());
      }

      return {
        passed,
        errors,
        warnings,
        message: passed
          ? `All 4 storyboard gates passed${warnings.length ? ` (${warnings.length} warning(s))` : ''}.`
          : `${errors.length} gate violation(s). Fix STORYBOARD.md before writing scene code.`,
        output,
      };
    },
  },

  // ── Tool 17: Render animation ─────────────────────────────────────────────
  // Triggers render.mjs in a scaffolded project folder.
  // Returns output path and QC results.
  render_animation: {
    description: `Run the HTML compositor renderer on a scaffolded animation project.
Modes:
  "sheet"      — contact sheet (one frame every 0.5s), fast visual check of the whole film
  "stills"     — frames at specific timestamps (pass timestamps array)
  "strip"      — every frame in a time range (motion/transition check); pass timestamps as [start, end]
  "storyboard" — 4 keyframes at 0%, 33%, 66%, 100% of duration
  "crop"       — focal-point 9:16 mobile crop preview; pass timestamps as [aspect_ratio_string, t]
  "full"       — full render → out/<title>.mp4
  "mux"        — re-mux audio only (no re-render, use after changing audio)
  "kit"        — export EDL/XML for Premiere Pro / DaVinci Resolve; run after "full"
  "look"       — pre-render linter (fonts, clipped text, NaN transforms, missing assets)

Review budget: at least one "sheet" per shot, one "strip" per key motion/transition, one "crop" per story-carrying face.
Returns { outputPath, passed } for "full", or { outputPath } for sheet/strip/storyboard/kit.
Requires: npm install playwright && npx playwright install chromium (one-time setup in projectDir).`,
    inputSchema: {
      type: 'object',
      required: ['projectDir', 'mode'],
      properties: {
        projectDir:  { type: 'string', description: 'The directory created by scaffold_animation_project' },
        mode:        { type: 'string', enum: ['sheet', 'stills', 'strip', 'storyboard', 'crop', 'full', 'mux', 'kit', 'look', 'verify', 'doctor', 'pixels'], description: 'Render mode' },
        timestamps:  { type: 'array', items: {}, description: 'For mode="stills": [t1, t2, ...]. For mode="strip": [startSeconds, endSeconds]. For mode="crop": ["9:16", t]. For mode="sheet": omit or pass shot times.' },
        audioPath:   { type: 'string', description: 'Audio file to mux in (for mode="full" or "mux")' },
        workers:     { type: 'number', default: 4, description: 'Parallel Playwright pages for mode="full"' },
        crf:         { type: 'number', default: 18, description: 'FFmpeg CRF quality (lower = better, larger file)' },
      },
    },
    handler: async ({ projectDir, mode, timestamps = [], audioPath, workers = 4, crf = 18 }) => {
      const syncFs = require('fs');
      const pathMod = require('path');
      const { spawnSync } = require('child_process');

      if (!projectDir) throw new Error('projectDir is required');
      if (!syncFs.existsSync(projectDir)) throw new Error(`Project directory not found: ${projectDir}`);

      const renderScript = pathMod.join(projectDir, 'scripts', 'render.mjs');
      if (!syncFs.existsSync(renderScript)) {
        throw new Error(`render.mjs not found in ${projectDir}/scripts/. Run scaffold_animation_project first.`);
      }

      // ── Validate timestamps ─────────────────────────────────────────────────
      // For mode="crop" the first item may be an aspect-ratio string like "9:16".
      // All other items must be numeric (seconds). No item may start with "--"
      // or contain shell metacharacters that could inject extra CLI flags.
      const SAFE_TS = /^[0-9]+([.:][0-9]+)*$/;  // e.g. "1.5", "9:16", "02:30"
      const sanitisedTimestamps = timestamps.map((v, i) => {
        const s = String(v);
        if (s.startsWith('--') || !SAFE_TS.test(s)) {
          throw new Error(`timestamps[${i}] is not a valid time value or aspect ratio: "${s}"`);
        }
        return s;
      });

      // ── Validate audioPath ──────────────────────────────────────────────────
      // Must resolve inside FILES_DIR so an agent cannot write outside the
      // sandbox by passing "../../etc/passwd" or similar.
      if (audioPath) {
        const resolved = pathMod.resolve(audioPath);
        const filesDir = pathMod.resolve(process.env.N8N_FILES_DIR || pathMod.join(os.homedir(), '.frameforge-files'));
        if (!resolved.startsWith(filesDir + pathMod.sep) && !resolved.startsWith(pathMod.resolve(projectDir) + pathMod.sep)) {
          throw new Error(`audioPath must be inside the project directory or FILES_DIR: ${audioPath}`);
        }
      }

      const harnessScript = pathMod.join(projectDir, 'scripts', 'harness.mjs');
      const isHarnessMode = ['verify', 'doctor', 'pixels'].includes(mode);
      const scriptToRun = (isHarnessMode && syncFs.existsSync(harnessScript)) ? harnessScript : renderScript;

      const args = [scriptToRun, mode];
      if ((mode === 'stills' || mode === 'strip' || mode === 'crop') && sanitisedTimestamps.length > 0) {
        args.push(...sanitisedTimestamps);
      }
      if (audioPath) args.push(`--audio=${audioPath}`);
      if (mode === 'full') {
        args.push(`--workers=${workers}`, `--crf=${crf}`);
      }

      const result = spawnSync('node', args, {
        cwd:      projectDir,
        encoding: 'utf8',
        timeout:  30 * 60 * 1000,  // 30 min ceiling
      });

      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      const exitCode = result.status;

      if (exitCode !== 0 && mode === 'full') {
        throw new Error(`render.mjs ${mode} failed (exit ${exitCode}):\n${stderr.slice(-1000)}`);
      }

      // Locate produced file
      const outDir = pathMod.join(projectDir, 'out');
      let outputPath = null;
      if (syncFs.existsSync(outDir)) {
        const files = syncFs.readdirSync(outDir);
        if (mode === 'sheet' || mode === 'storyboard') {
          const sheet = files.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
          if (sheet) outputPath = pathMod.join(outDir, sheet);
        } else if (mode === 'full' || mode === 'mux') {
          const mp4 = files.find(f => f.endsWith('.mp4') && !f.includes('_preview'));
          if (mp4) outputPath = pathMod.join(outDir, mp4);
        } else if (mode === 'kit') {
          const edl = files.find(f => f.endsWith('.edl') || f.endsWith('.xml'));
          if (edl) outputPath = pathMod.join(outDir, edl);
        } else if (mode === 'stills' || mode === 'strip' || mode === 'crop') {
          const stills = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
          if (stills.length > 0) outputPath = stills.map(f => pathMod.join(outDir, f));
        }
      }

      let purityReport = null;
      const purityReportFile = pathMod.join(outDir, 'check', 'purity_report.json');
      if (mode === 'verify' && syncFs.existsSync(purityReportFile)) {
        try {
          purityReport = JSON.parse(syncFs.readFileSync(purityReportFile, 'utf8'));
          outputPath = purityReportFile;
        } catch (_) {}
      }

      const passed = exitCode === 0;

      return {
        mode,
        passed,
        exitCode,
        outputPath,
        purityReport,
        projectDir,
        stdout: stdout.slice(-2000),
        stderr: passed ? undefined : stderr.slice(-1000),
        message: passed
          ? `${mode} complete. Output: ${Array.isArray(outputPath) ? outputPath.join(', ') : (outputPath || outDir)}`
          : `${mode} failed (exit ${exitCode}). Check stderr for details.`,
      };
    },
  },

  // ── Tool 18: Edit in external app ─────────────────────────────────────────
  // Import a FrameForge animation into an editing app AND optionally drive
  // real editing operations — cuts, transitions, color, captions, render.
  //
  // How it works per editor:
  //
  //   resolve      — DaVinci Resolve 18.6+ built-in REST API (no bridge needed).
  //                  Enable in Preferences → System → General → "IP Remote Control".
  //                  Full edit support: import, timeline, cut, color, render.
  //
  //   premiere     — Adobe Premiere Pro via CEP panel companion server.
  //                  The companion runs ExtendScript on the Premiere side and
  //                  exposes a local REST API. Supports: import, cut, transition,
  //                  caption overlay, export.
  //                  Install: see docs/editor-bridges/premiere.md
  //
  //   aftereffects — After Effects via AE REST bridge (ExtendScript server).
  //                  Supports: import comp, add effects, render queue.
  //                  Install: see docs/editor-bridges/aftereffects.md
  //
  //   remotion     — Remotion IS code: operations are applied by editing the
  //                  composition props and calling `npx remotion render`.
  //                  No bridge needed — FrameForge writes the prop patches directly.
  //
  //   capcut       — CapCut has no public desktop editing API as of 2026.
  //                  Only import + render export are supported (same as export_to_editor).
  //
  //   custom       — Any HTTP endpoint. You control what operations it handles.
  export_to_editor: {
    description: `Import a FrameForge animation into an editing app and optionally apply editing operations.

Supported editors:
  "resolve"      — DaVinci Resolve 18.6+ built-in REST API. Enable in Preferences → System → General → "IP Remote Control". Port default: 8080.
  "premiere"     — Adobe Premiere Pro via CEP companion server. Full timeline editing via ExtendScript. Port default: 7777.
  "aftereffects" — After Effects via AE REST bridge. Import comp, add effects, render queue. Port default: 7878.
  "remotion"     — Remotion composition — patches props, triggers CLI render. Port default: 3001.
  "capcut"       — CapCut Desktop — import + export only (no programmatic edit API available). Port default: 9090.
  "custom"       — Any HTTP endpoint (pass editorUrl).

Actions (pass as "action" parameter):
  "import"       — Import the rendered MP4 (and EDL if present) into the editor. Default.
  "edit"         — Apply a list of operations to an existing timeline (see "operations").
  "render"       — Trigger the editor's own render/export pipeline.
  "status"       — Poll a previously started render job (pass jobId).

Operations (used with action="edit"):
  { op: "cut",        at: 4.5 }                          — add a cut at 4.5s
  { op: "trim",       clip: 0, startDelta: 0.5 }         — trim clip 0 start by +0.5s
  { op: "transition", between: [0,1], type: "dissolve", duration: 0.5 }
  { op: "color",      clip: 0, lut: "/path/to/lut.cube" }
  { op: "color",      clip: 0, grade: { lift: [0,0,0,0], gamma: [1,1,1,1], gain: [1,1,1,1] } }
  { op: "caption",    at: 2.0, duration: 3.0, text: "Hello", position: "bottom" }
  { op: "mute",       clip: 1 }
  { op: "speed",      clip: 0, factor: 0.5 }             — 50% slow-motion
  { op: "swap",       clip: 0, newPath: "/new/clip.mp4" } — replace a clip`,
    inputSchema: {
      type: 'object',
      required: ['editor'],
      properties: {
        editor:     { type: 'string', enum: ['resolve', 'premiere', 'aftereffects', 'remotion', 'capcut', 'custom'], description: 'Target editing app' },
        action:     { type: 'string', enum: ['import', 'edit', 'render', 'status'], default: 'import', description: 'What to do: import clip, apply edit operations, trigger render, or poll status' },
        projectDir: { type: 'string', description: 'FrameForge animation project directory. Required for action=import (finds the rendered MP4 and EDL automatically).' },
        videoPath:  { type: 'string', description: 'Explicit MP4 path to import (overrides auto-detection from projectDir)' },
        audioPath:  { type: 'string', description: 'Audio stem to import alongside the video' },
        timelineName: { type: 'string', description: 'Timeline/sequence name to create or target in the editor' },
        operations: { type: 'array',  description: 'Edit operations for action="edit". Each op: { op, clip?, at?, between?, type?, duration?, text?, position?, lut?, grade?, factor?, newPath? }' },
        jobId:      { type: 'string', description: 'Render job ID to poll (for action="status")' },
        editorUrl:  { type: 'string', description: 'Override the editor bridge URL. Useful for non-default ports or remote bridges.' },
        exportPath: { type: 'string', description: 'Where the editor should save the export (for action="render")' },
      },
    },
    handler: async ({ editor = 'resolve', action = 'import', projectDir, videoPath, audioPath, timelineName, operations = [], jobId, editorUrl, exportPath }) => {
      const syncFs  = require('fs');
      const pathMod = require('path');
      const { ExternalAdapter } = require('../pipeline/external-adapter');

      if (!editor) throw new Error('editor is required');

      // ── Resolve video path ────────────────────────────────────────────────
      let masterPath = videoPath || null;
      let edlPath    = null;

      if (!masterPath && projectDir) {
        if (!syncFs.existsSync(projectDir)) throw new Error(`Project directory not found: ${projectDir}`);
        const outDir = pathMod.join(projectDir, 'out');
        if (!syncFs.existsSync(outDir)) throw new Error(`No out/ in ${projectDir}. Run render_animation mode="full" first.`);

        const mp4s = syncFs.readdirSync(outDir)
          .filter(f => f.endsWith('.mp4') && !f.includes('_preview'))
          .map(f => pathMod.join(outDir, f))
          .sort((a, b) => syncFs.statSync(b).mtimeMs - syncFs.statSync(a).mtimeMs);
        if (mp4s.length === 0) throw new Error(`No MP4 in ${outDir}. Run render_animation mode="full" first.`);
        masterPath = mp4s[0];

        const edls = syncFs.readdirSync(outDir).filter(f => f.endsWith('.edl') || f.endsWith('.xml'));
        if (edls.length > 0) edlPath = pathMod.join(outDir, edls[0]);
      }

      // ── Configure adapter ─────────────────────────────────────────────────
      const adapterConfig = editorUrl ? { name: editor, baseUrl: editorUrl } : { name: editor };
      const adapter = new ExternalAdapter(adapterConfig);

      // ── Dispatch action ───────────────────────────────────────────────────
      const callAdapter = async (method, payload) => {
        try {
          return await method(payload);
        } catch (err) {
          throw new Error(
            `Could not reach ${editor} bridge at ${adapter.baseUrl}.\n` +
            `Ensure the bridge is running. Error: ${err.message}\n` +
            `Setup docs: docs/editor-bridges/${editor}.md`
          );
        }
      };

      if (action === 'import') {
        if (!masterPath) throw new Error('Provide projectDir or videoPath for action="import"');
        const files = [masterPath];
        if (audioPath && syncFs.existsSync(audioPath)) files.push(audioPath);
        if (edlPath) files.push(edlPath);
        const result = await callAdapter(
          p => adapter.ingestMedia(p),
          { files, metadata: { source: 'frameforge', timelineName: timelineName || pathMod.basename(masterPath, '.mp4'), edlPath: edlPath || '' } }
        );
        return { editor, action, bridgeUrl: adapter.baseUrl, importedFiles: files.map(f => pathMod.basename(f)), masterPath, edlPath, result,
          message: `Imported into ${editor}. ${edlPath ? 'EDL/XML timeline included.' : 'Tip: run render_animation mode="kit" for an EDL.'}` };
      }

      if (action === 'edit') {
        if (operations.length === 0) throw new Error('Provide at least one operation for action="edit"');
        // Validate each operation has an "op" field
        for (const [i, o] of operations.entries()) {
          if (!o.op) throw new Error(`operations[${i}] is missing required field "op"`);
          const valid = ['cut','trim','transition','color','caption','mute','speed','swap'];
          if (!valid.includes(o.op)) throw new Error(`operations[${i}].op "${o.op}" is not valid. Use: ${valid.join(', ')}`);
        }
        const body = { operations, timelineName: timelineName || 'FrameForge', source: 'frameforge' };
        const result = await callAdapter(
          p => adapter.renderScenes({ scenes: [], productionId: 'edit', options: p }),
          body
        );
        return { editor, action, bridgeUrl: adapter.baseUrl, operationCount: operations.length, result,
          message: `Applied ${operations.length} edit operation(s) in ${editor}.` };
      }

      if (action === 'render') {
        const body = { exportPath: exportPath || '', timelineName: timelineName || 'FrameForge', source: 'frameforge' };
        const result = await callAdapter(
          p => adapter.renderScenes({ scenes: [], productionId: 'render', options: p }),
          body
        );
        const newJobId = result?.jobId || result?.id || result?.data?.id;
        return { editor, action, bridgeUrl: adapter.baseUrl, jobId: newJobId, result,
          message: newJobId ? `Render started in ${editor}. Poll with action="status" jobId="${newJobId}".` : `Render triggered in ${editor}.` };
      }

      if (action === 'status') {
        if (!jobId) throw new Error('Provide jobId for action="status"');
        const result = await callAdapter(p => adapter.checkStatus(p), jobId);
        return { editor, action, jobId, status: result.status, outputUrl: result.outputUrl, result };
      }

      throw new Error(`Unknown action: ${action}. Use import | edit | render | status`);
    },
  },

  // ── Tool 19: Autonomous Local Video Editor ──────────────────────────────
  // Edit, cut, trim, speed-ramp, color-grade, reframe, add captions, and transition
  // multiple video clips, and mix with voiceover & ducked background music locally.
  edit_video: {
    description: `Autonomous local video editor. Edit, cut, trim, speed-ramp, color-grade, reframe (16:9 landscape / 9:16 portrait / 1:1 square), add captions, apply xfade transitions, and mix clip audio with voiceover & ducked background music locally using FFmpeg. Fully autonomous — zero external APIs or subscriptions needed.

Features:
- Fast & frame-accurate trimming (start_time, end_time, duration).
- Speed ramping (0.25x to 4.0x) with audio pitch preserving (atempo).
- Cinematic color grading (cinematic, warm, cool, vintage, bw, vibrant, cyberpunk).
- Broadcast-quality captions with HarfBuzz text shaping & multilingual Indic/Malayalam support.
- Transitions: fade, dissolve, wipeleft, wiperight, slideup, slidedown, circleopen, smoothleft, etc.
- Multi-track audio: clip ambient audio volume control, master voiceover, and background music with sidechain ducking.
- Auto-fit mode: automatically calculates clip durations so video perfectly matches master audio length.`,
    inputSchema: {
      type: 'object',
      required: ['clips'],
      properties: {
        clips: {
          type: 'array',
          description: 'Array of clip objects. Each clip: { video_path, start_time?, end_time?, duration?, speed?, clip_volume?, color_grade?, caption?, transition?, transition_duration?, audio_path? }',
          items: {
            type: 'object',
            required: ['video_path'],
            properties: {
              video_path:          { type: 'string', description: 'Path to source video clip' },
              start_time:          { type: ['number', 'string'], description: 'Start time offset (e.g. 5, "00:05", "01:23.45")' },
              end_time:            { type: ['number', 'string'], description: 'End time offset (e.g. 15, "00:15")' },
              duration:            { type: ['number', 'string'], description: 'Desired duration in seconds' },
              speed:               { type: 'number', default: 1.0, description: 'Speed multiplier (e.g. 0.5 for 2x slow-mo, 1.5 for fast)' },
              clip_volume:         { type: 'number', default: 1.0, description: 'Volume of original clip audio (0 to mute, 1.0 normal)' },
              color_grade:         { type: 'string', enum: ['none', 'cinematic', 'warm', 'cool', 'vintage', 'bw', 'vibrant', 'cyberpunk'], description: 'Color grading preset' },
              caption:             { type: 'string', description: 'Caption text to burn into the lower third of this clip' },
              transition:          { type: 'string', default: 'fade', description: 'Transition into next clip (fade, dissolve, wipeleft, wiperight, slideup, slidedown, circleopen, none)' },
              transition_duration: { type: 'number', default: 0.5, description: 'Duration of transition in seconds (default 0.5)' },
              audio_path:          { type: 'string', description: 'Optional scene-specific audio/voice file' },
            },
          },
        },
        audio_path:          { type: 'string', description: 'Master voiceover / narration audio track across whole video' },
        music_path:          { type: 'string', description: 'Background music track' },
        music_volume:        { type: 'number', default: 0.08, description: 'Background music volume level (default 0.08)' },
        orientation:         { type: 'string', enum: ['landscape', 'portrait', 'square'], default: 'landscape', description: 'Target canvas orientation' },
        width:               { type: 'number', description: 'Custom canvas width (default 1920 for landscape, 1080 for portrait/square)' },
        height:              { type: 'number', description: 'Custom canvas height (default 1080 for landscape, 1920 for portrait, 1080 for square)' },
        color_grade:         { type: 'string', enum: ['none', 'cinematic', 'warm', 'cool', 'vintage', 'bw', 'vibrant', 'cyberpunk'], description: 'Global color grade fallback for all clips' },
        transition:          { type: 'string', default: 'fade', description: 'Global transition fallback between clips' },
        transition_duration: { type: 'number', default: 0.5, description: 'Global transition duration in seconds' },
        auto_fit:            { type: 'boolean', default: false, description: 'Auto-adjust clip durations to match audio_path duration' },
        output_path:         { type: 'string', description: 'Destination file path for the assembled MP4' },
      },
    },
    handler: async ({
      clips = [],
      audio_path = null,
      music_path = null,
      music_volume = 0.08,
      orientation = 'landscape',
      width,
      height,
      color_grade = null,
      transition = 'fade',
      transition_duration = 0.5,
      auto_fit = false,
      output_path = null,
    }) => {
      const { VideoEditor } = require('../video-editor/editor');
      const editor = new VideoEditor({ filesDir: FILES_DIR });
      return editor.editAndAssemble({
        clips,
        audioPath: audio_path,
        musicPath: music_path,
        musicVolume: music_volume,
        orientation,
        width,
        height,
        colorGrade: color_grade,
        transition,
        transitionDuration: transition_duration,
        autoFit: auto_fit,
        outputPath: output_path,
      });
    },
  },

  // ── Tool 20: Generate Scene Code ──────────────────────────────────────────
  // Writes pure-function-of-t Canvas drawing code using LLM or procedural synthesis
  generate_scene_code: {
    description: `Generate pure-function-of-t JavaScript HTML5 Canvas drawing code for a scene.
Matches the Claude Opus 5.5 / ClaudeAnimationBase contract where every frame is a pure mathematical function of time t.
Returns the raw code and complete wrapped HTML ready for headless browser execution.`,
    inputSchema: {
      type: 'object',
      required: ['visual_description'],
      properties: {
        visual_description: { type: 'string', description: 'Visual direction and motion description of the scene' },
        caption:            { type: 'string', description: 'Headline / key concept' },
        narration:          { type: 'string', description: 'Voiceover narration text' },
        topic:              { type: 'string', description: 'Overall video topic' },
        style:              { type: 'string', description: 'Aesthetic / genre (cosmic_space, cyber_tech, cinematic_documentary, finance_executive, retro_synthwave, nature_organic, hype_sports, minimal_luxury, breaking_news, warm_creative)' },
        language:           { type: 'string', default: 'en', description: 'Language code (e.g. en, ml, hi, ta)' },
        duration:           { type: 'number', default: 3, description: 'Duration in seconds' },
        width:              { type: 'number', default: 1920 },
        height:             { type: 'number', default: 1080 },
      },
    },
    handler: async ({ visual_description, caption = '', narration = '', topic = '', style = '', language = 'en', duration = 3, width = 1920, height = 1080 }) => {
      const { generateSceneCodeWithLLM, wrapCodeInHarnessHtml, generateSceneHtml } = require('../video-renderer/scene-animator');
      let code = await generateSceneCodeWithLLM({ visualDescription: visual_description, caption, narration, topic, style, language, duration, width, height });
      let html;
      if (code) {
        html = wrapCodeInHarnessHtml({ code, duration, width, height, language, style, topic });
      } else {
        html = generateSceneHtml({ visualDescription: visual_description, caption, narration, topic, style, language, duration, width, height });
      }
      return { code: code || '// Procedural animation used', html, duration, width, height, success: true };
    },
  },

  // ── Tool 21: Preview Scene ───────────────────────────────────────────────
  // Renders still preview frames at specified timestamps so the agent can inspect them
  preview_scene: {
    description: `Render still frame previews (PNGs) of an animated scene at specified timestamps (default: 0.1s, duration/2, duration - 0.1s).
Allows the agent in Claude Code, Cursor, or any IDE to inspect the visual output, verify fonts, colors, and compositions, and patch the code before encoding. Satisfies Layer 3 verification loop.`,
    inputSchema: {
      type: 'object',
      properties: {
        code:               { type: 'string', description: 'Raw JavaScript canvas drawing code for window.seek(t)' },
        html:               { type: 'string', description: 'Complete self-contained HTML page conforming to window.seek(t)' },
        visual_description: { type: 'string', description: 'Visual description (used to generate scene if code/html omitted)' },
        caption:            { type: 'string' },
        narration:          { type: 'string' },
        topic:              { type: 'string' },
        style:              { type: 'string' },
        language:           { type: 'string', default: 'en' },
        duration:           { type: 'number', default: 3 },
        timestamps:         { type: 'array', items: { type: 'number' }, description: 'Timestamps in seconds to capture (default: [0.1, duration/2, duration - 0.1])' },
        width:              { type: 'number', default: 1920 },
        height:             { type: 'number', default: 1080 },
      },
    },
    handler: async ({ code, html, visual_description = '', caption = '', narration = '', topic = '', style = '', language = 'en', duration = 3, timestamps, width = 1920, height = 1080 }) => {
      const { wrapCodeInHarnessHtml, generateSceneHtml } = require('../video-renderer/scene-animator');
      const { launchHarnessBrowser } = require('../harness/lib/browser.mjs');
      const { openPageWithVirtualClock } = require('../harness/lib/capture.mjs');
      const syncFs = require('fs');
      const pathMod = require('path');

      let htmlContent = html;
      if (!htmlContent) {
        if (code) {
          htmlContent = wrapCodeInHarnessHtml({ code, duration, width, height, language, style, topic });
        } else {
          htmlContent = generateSceneHtml({ visualDescription: visual_description, caption, narration, topic, style, language, duration, width, height });
        }
      }

      const previewDir = pathMod.join(FILES_DIR, 'previews');
      syncFs.mkdirSync(previewDir, { recursive: true });
      const tempHtmlPath = pathMod.join(previewDir, `preview_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.html`);
      syncFs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

      const tsList = Array.isArray(timestamps) && timestamps.length > 0
        ? timestamps
        : [0.1, Number((duration / 2).toFixed(2)), Number((duration - 0.1).toFixed(2))];

      const { browser } = await launchHarnessBrowser();
      const captures = [];

      try {
        const page = await openPageWithVirtualClock(browser, tempHtmlPath, { width, height });
        const { captureFrame } = require('../harness/lib/capture.mjs');
        for (const t of tsList) {
          const buf = await captureFrame(page, t, { type: 'image/png' });
          const outPng = pathMod.join(previewDir, `still_t${t.toString().replace('.', '_')}_${Date.now()}.png`);
          syncFs.writeFileSync(outPng, buf);
          captures.push({ timestamp: t, path: outPng, sizeBytes: buf.length });
        }
      } finally {
        await browser.close();
        try { syncFs.unlinkSync(tempHtmlPath); } catch (_) {}
      }

      return {
        previews: captures,
        count: captures.length,
        width,
        height,
        duration,
        message: 'Preview stills captured. You can read the image files from disk to inspect the visual composition.'
      };
    },
  },

};

// ── MCP protocol handler (MCP 2024-11-05 spec) ───────────────────────────

const SERVER_INFO = {
  name:    'video-pipeline',
  version: '2.4.5',
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

// Timing-safe token comparison — prevents timing oracle on the MCP auth token.
function _checkMCPAuth(req) {
  const expected = process.env.MCP_AUTH_TOKEN;
  if (!expected) return true; // auth disabled — local dev only
  const header = req.headers['authorization'] || '';
  const token  = header.replace(/^Bearer\s+/i, '').trim();
  const bufA   = Buffer.from(token);
  const bufB   = Buffer.from(expected);
  if (bufA.length !== bufB.length) {
    // Compare equal-length buffers to avoid short-circuit timing leak
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
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

    // Auth check — enforce MCP_AUTH_TOKEN when set
    if (!_checkMCPAuth(req)) {
      res.writeHead(401, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized — set Authorization: Bearer <MCP_AUTH_TOKEN>' } }));
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
  });
}

if (require.main === module) {
  start().catch(err => { console.error('[video-agent MCP] startup failed:', err); process.exit(1); });
}

module.exports = { handleMCPRequest, TOOLS, SERVER_INFO, start };
