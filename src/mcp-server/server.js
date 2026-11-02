/**
 * Video Agent MCP Server — MCP 2024-11-05 spec compliant
 *
 * Exposes the full video production pipeline as 6 MCP tools.
 * Works with IBM Bob, Kiro IDE, Cursor, Windsurf, Claude Code, or any
 * MCP-capable agent.
 *
 * Tools:
 *   research_topic       — multi-source fact-checked research
 *   write_script         — 55-scene structured JSON (schema v1.0.0)
 *   generate_scene_image — pluggable image backend
 *   render_tts           — pluggable TTS backend
 *   assemble_video       — FFmpeg master + quality gate
 *   publish_video        — multi-channel delivery (Telegram, YouTube)
 *
 * Start: node src/mcp-server/server.js   (or: npm start)
 * Port:  MCP_PORT env (default 3210)
 *
 * Env required:
 *   GROQ_API_KEY (or OPENAI_API_KEY / WATSONX_API_KEY)
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  (for Telegram delivery)
 *
 * Env optional:
 *   PROVIDER_LLM=groq|openai|watsonx|ollama    (default: groq)
 *   PROVIDER_TTS=edge-tts|elevenlabs|azure|openai (default: edge-tts)
 *   PROVIDER_IMAGE=pollinations|falai|replicate|dalle (default: pollinations)
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
  research_topic: {
    description: 'Research a topic with fact extraction. Returns verified claims ready for script generation.',
    inputSchema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic:       { type: 'string', description: 'Topic to research' },
        claimCount:  { type: 'number', default: 10, description: 'Number of claims to extract' },
      },
    },
    handler: async ({ topic, claimCount = 10 }) => {
      const productionId = await sm.createProduction({ topic, pipelineVersion: '1.0.0' });
      await sm.startStage(productionId, 'Research');

      const content = await retryPol.executeStage('Research', async () => {
        const system = 'You are a YouTube history researcher. Output ONLY raw JSON. No markdown. No code fences. Start with { and end with }.';
        const user   = `TOPIC: ${topic}\n\nReturn ${claimCount} factual claims as JSON:\n{"topic":"...","claims":[{"claim":"...","confidence":"high","safe_wording":"..."}],"common_myths":["..."],"modern_comparisons":["..."],"story_angles":["..."]}`;
        return llm.chat({ system, user, temperature: 0.7, maxTokens: 4000 });
      });

      let research;
      try { research = LLMProvider.parseJson(content); } catch (e) { throw new Error(`Research JSON parse failed: ${e.message}`); }
      if (!Array.isArray(research.claims) || research.claims.length < 5) throw new Error(`Research returned too few claims: ${research.claims?.length}`);

      await sm.completeStage(productionId, 'Research', { outputHash: crypto.createHash('sha256').update(content).digest('hex').slice(0,16) });
      await telemetry.track({ productionId, stage: 'Research', provider: process.env.PROVIDER_LLM || 'groq', operation: 'research_generation', units: content.length / 4 });

      return { productionId, topic, claims: research.claims, myths: research.common_myths || [], angles: research.story_angles || [] };
    },
  },

  // ── Tool 2: Script ───────────────────────────────────────────────────────
  write_script: {
    description: 'Write a 55-scene video script from research claims. Returns structured scene JSON.',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'claims', 'topic'],
      properties: {
        productionId: { type: 'string' },
        claims:       { type: 'array' },
        topic:        { type: 'string' },
        style:        { type: 'string', default: 'educational comedy' },
      },
    },
    handler: async ({ productionId, claims, topic, style = 'educational comedy' }) => {
      await sm.startStage(productionId, 'Script');
      const facts = claims.slice(0, 8).map(c => c.safe_wording || c.claim).join('; ');

      const content = await retryPol.executeStage('Script', async () => {
        const system = [
          'You are a YouTube scriptwriter. Style: rapid-fire educational comedy.',
          'Output ONLY raw JSON. No markdown. Start with { end with }.',
          'Every scene MUST include all fields in schema_version 1.0.0.',
        ].join(' ');
        const user = [
          `TOPIC: ${topic}`,
          `FACTS: ${facts}`,
          `STYLE: ${style}`,
          '',
          'Write exactly 55 scenes using schema_version "1.0.0". Each scene has:',
          '- scene_id: integer 1-55',
          '- schema_version: "1.0.0"',
          '- narration: 15-35 words, punchy conversational',
          '- caption: 3-6 word UPPERCASE summary',
          '- visual_description: vivid cartoon image + ONE tag: [CAMP] [MODERN] [COMPARE] [REACTION] [TIMELINE]',
          '- character: { character_id: "ancient_man"|"modern_man"|"none", pose: "standing"|"running"|"sitting"|"jumping"|"none", emotion: "neutral"|"happy"|"angry"|"sad"|"surprised"|"determined"|"relaxed"|"none", position: {x:0.0-1.0, y:0.0-1.0, scale:0.5-2.0} }',
          '- focal_point: { x:0.0-1.0, y:0.0-1.0, weight:0.0-1.0 }',
          '- overlay: { type: "prop"|"effect"|"text"|"none" }',
          '- sound_effects: [ { effect_id: "whoosh"|"fire_crackle"|"crowd_murmur"|"thunder"|"coins"|"heartbeat"|"camera_click"|"none", timing: "start"|"middle"|"end"|"continuous", volume: 0.0-1.0 } ]',
          '- music_mood: "tense"|"calm"|"energetic"|"mysterious"|"neutral"|"dramatic"|"humorous"',
          '- camera_hint: "zoom_in"|"zoom_out"|"pan_left"|"pan_right"|"static"|"auto"',
          '- metadata: { importance: "low"|"medium"|"high"|"critical", hook_potential: 0.0-1.0, standalone: true|false }',
          '',
          'RESPOND WITH EXACTLY:',
          '{"topic":"...","youtube_title":"...","youtube_description":"...","youtube_tags":["..."],"thumbnail_prompt":"...",',
          '"scenes":[{"scene_id":1,"schema_version":"1.0.0","narration":"...","caption":"CAPTION","visual_description":"description [CAMP]","character":{"character_id":"ancient_man","pose":"standing","emotion":"surprised","position":{"x":0.5,"y":0.8,"scale":1.0}},"focal_point":{"x":0.5,"y":0.3,"weight":0.9},"overlay":{"type":"none"},"sound_effects":[{"effect_id":"fire_crackle","timing":"continuous","volume":0.2}],"music_mood":"mysterious","camera_hint":"zoom_in","metadata":{"importance":"critical","hook_potential":0.9,"standalone":true}}],',
          '"shorts":[{"short_id":1,"title":"...","description":"...","scene_range":[1,5],"hook_scene":1}]}',
        ].join('\n');
        return llm.chat({ system, user, temperature: 1, maxTokens: 16000 });
      });

      let script;
      try { script = LLMProvider.parseJson(content); } catch (e) { throw new Error(`Script parse failed: ${e.message}`); }
      if (!Array.isArray(script.scenes) || script.scenes.length < 15) throw new Error(`Too few scenes: ${script.scenes?.length}`);

      const totalWords = script.scenes.reduce((n, s) => n + (s.narration || '').split(/\s+/).filter(Boolean).length, 0);
      if (totalWords < 1000) throw new Error(`Script too short: ${totalWords} words`);

      await sm.completeStage(productionId, 'Script', { outputHash: crypto.createHash('sha256').update(content).digest('hex').slice(0,16) });
      await telemetry.track({ productionId, stage: 'Script', provider: process.env.PROVIDER_LLM || 'groq', operation: 'script_generation', units: content.length / 4 });

      return { productionId, scenes: script.scenes, shorts: script.shorts || [], youtubeTitle: script.youtube_title, youtubeDescription: script.youtube_description, youtubeTags: script.youtube_tags, thumbnailPrompt: script.thumbnail_prompt, totalWords };
    },
  },

  // ── Tool 3: Generate scene image ─────────────────────────────────────────
  generate_scene_image: {
    description: 'Generate a doodle/illustration for one scene using the configured image provider.',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'sceneIndex', 'visualAction'],
      properties: {
        productionId: { type: 'string' },
        sceneIndex:   { type: 'number' },
        visualAction: { type: 'string', description: 'Scene visual description with [TAG]' },
        seed:         { type: 'number', default: 12345 },
      },
    },
    handler: async ({ productionId, sceneIndex, visualAction, seed = 12345 }) => {
      const vdir      = path.join(FILES_DIR, 'video_tmp');
      const outputPath = path.join(vdir, `scene_${sceneIndex}.png`);
      await fs.mkdir(vdir, { recursive: true });

      const STYLE = '2D flat vector cartoon, hand-drawn marker doodle, pure white background, thick solid black outlines 4px, zero shading, flat color fills, stick figure body, wild messy black hair, caveman wears brown animal pelt loincloth, big round expressive eyes, web comic panel style';
      const NEG   = 'photorealistic, 3D render, CGI, painting, dark background, gradient, shadow, texture, noise, watermark, text, logo';
      const prompt = `${visualAction.replace(/\[[A-Z]+\]/g, '').trim()}, ${STYLE}`;

      await retryPol.executeStage('Asset_Generation', async () => {
        return imageGen.generate({ prompt, negativePrompt: NEG, outputPath, width: 1920, height: 1080, seed: seed + sceneIndex * 37 });
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
    description: 'Deliver finished video to configured channels (Telegram, YouTube).',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'masterPath'],
      properties: {
        productionId:     { type: 'string' },
        masterPath:       { type: 'string' },
        channels:         { type: 'array', items: { type: 'string' }, default: ['telegram'] },
        youtubeTitle:     { type: 'string' },
        youtubeDescription: { type: 'string' },
      },
    },
    handler: async ({ productionId, masterPath, channels = ['telegram'], youtubeTitle = '', youtubeDescription = '' }) => {
      await sm.startStage(productionId, 'Publishing');

      // Delegate entirely to runPublishing — it handles Telegram, YouTube, and shorts.
      // Previously had an inline Telegram send here which caused double-delivery when
      // channels included 'telegram', since runPublishing also sends to Telegram.
      const manifest = {
        master: { path: masterPath },
        metadata: { youtubeTitle, youtubeDescription },
        shorts: [],
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

  // ── Tool 11 (was 7): n8n webhook trigger ─────────────────────────────────
  // Bridges the MCP protocol with n8n workflows — fires an n8n webhook to
  // trigger a full pipeline run without requiring direct n8n access.
  n8n_webhook_trigger: {
    description: 'Trigger an n8n webhook to start a video pipeline workflow. Returns {jobId, status} immediately. Requires N8N_WEBHOOK_URL env var.',
    inputSchema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic:    { type: 'string', description: 'Video topic to produce' },
        channels: { type: 'array', items: { type: 'string' }, default: ['telegram'], description: 'Delivery channels' },
        style:    { type: 'string', default: 'educational comedy', description: 'Narrative style' },
        language: { type: 'string', default: 'en', description: 'BCP-47 language code for TTS voice selection' },
        payload:  { type: 'object', description: 'Additional fields forwarded to the n8n workflow' },
      },
    },
    handler: async ({ topic, channels = ['telegram'], style = 'educational comedy', language = 'en', payload = {} }) => {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('N8N_WEBHOOK_URL not set. Add it to your .env file.');
      }
      const body = JSON.stringify({ topic, channels, style, language, ...payload, _source: 'frameforge-mcp' });
      const isHttps = webhookUrl.startsWith('https');
      const client = require(isHttps ? 'https' : 'http');
      const result = await new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const req = client.request({
          host: url.hostname, port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
          const chunks = [];
          res.on('data', d => chunks.push(d));
          res.on('end', () => {
            if (res.statusCode >= 400) return reject(new Error(`n8n webhook returned HTTP ${res.statusCode}`));
            const text = Buffer.concat(chunks).toString('utf8');
            try { resolve(JSON.parse(text)); } catch { resolve({ raw: text }); }
          });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('n8n webhook timeout')); });
        req.write(body);
        req.end();
      });
      const jobId = result.jobId || result.executionId || result.id || crypto.randomUUID?.() || crypto.randomBytes(8).toString('hex');
      return { jobId, status: result.status || 'triggered', topic, n8nResponse: result };
    },
  },
};

// ── MCP protocol handler (MCP 2024-11-05 spec) ───────────────────────────

const SERVER_INFO = {
  name:    'video-pipeline',
  version: '1.0.0',
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

async function start() {
  await sm.init();
  await telemetry.init();

  const server = http.createServer(async (req, res) => {
    // CORS pre-flight (required by browser-based IDE extensions)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      return res.end();
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', serverInfo: SERVER_INFO, tools: Object.keys(TOOLS) }));
    }

    if (req.method !== 'POST') {
      res.writeHead(405, CORS_HEADERS); return res.end();
    }

    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {
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
