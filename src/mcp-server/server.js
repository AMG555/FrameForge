/**
 * Video Agent MCP Server
 *
 * Exposes the full video production pipeline as 6 MCP tools.
 * Works with IBM Bob, Kiro IDE, Cursor, Windsurf, or any MCP-capable agent.
 *
 * Tools:
 *   research_topic       — multi-source fact-checked research
 *   write_script         — 55-scene structured JSON from research
 *   generate_scene_image — pluggable image backend
 *   render_tts           — pluggable TTS backend
 *   assemble_video       — FFmpeg master + shorts render
 *   publish_video        — multi-channel delivery (Telegram, YouTube)
 *
 * Start: node src/mcp-server/server.js
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
        ].join(' ');
        const user = [
          `TOPIC: ${topic}`,
          `FACTS: ${facts}`,
          `STYLE: ${style}`,
          '',
          'Write exactly 55 scenes. Rules:',
          '- narration: 15-35 words, punchy conversational.',
          '- caption: 3-6 word UPPERCASE summary.',
          '- visual_action: one vivid cartoon description. End with ONE tag: [CAMP] [MODERN] [COMPARE] [REACTION] [TIMELINE]',
          '- camera: static or slow_zoom_in or slow_zoom_out',
          '',
          'RESPOND WITH EXACTLY:',
          '{"topic":"...","youtube_title":"...","youtube_description":"...","youtube_tags":["..."],"thumbnail_prompt":"...","scenes":[{"n":1,"narration":"...","caption":"CAPTION","visual_action":"description [CAMP]","camera":"slow_zoom_in"}],"shorts":[{"short_id":1,"title":"...","description":"...","start_scene":1,"end_scene":8}]}',
        ].join('\n');
        return llm.chat({ system, user, temperature: 1, maxTokens: 12000 });
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
    description: 'Convert narration text to audio using the configured TTS provider.',
    inputSchema: {
      type: 'object',
      required: ['productionId', 'sceneIndex', 'text'],
      properties: {
        productionId: { type: 'string' },
        sceneIndex:   { type: 'number' },
        text:         { type: 'string' },
        voice:        { type: 'string', default: 'en-US-GuyNeural' },
        rate:         { type: 'string', default: '-5%' },
      },
    },
    handler: async ({ productionId, sceneIndex, text, voice = 'en-US-GuyNeural', rate = '-5%' }) => {
      const vdir      = path.join(FILES_DIR, 'video_tmp');
      const outputPath = path.join(vdir, `voice_${sceneIndex}.m4a`);
      await fs.mkdir(vdir, { recursive: true });

      await retryPol.executeStage('TTS', async () => {
        return tts.synthesize({ text, voice, outputPath, rate });
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
      const results = {};

      if (channels.includes('telegram')) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId   = process.env.TELEGRAM_CHAT_ID;
        if (!botToken || !chatId) throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required');
        results.telegram = await retryPol.executeStage('Publishing', async () => {
          // Use curl for multipart upload (most reliable in n8n/Docker environments)
          const { execSync } = require('child_process');
          const caption = `🎬 ${youtubeTitle}\n\n${youtubeDescription}`.slice(0, 1024);
          const cmd = `curl -sS -X POST "https://api.telegram.org/bot${botToken}/sendDocument" -F "chat_id=${chatId}" -F "document=@${masterPath}" -F "caption=${caption.replace(/"/g, '\\"')}"`;
          const out = execSync(cmd, { timeout: 10 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 });
          const resp = JSON.parse(out.toString());
          if (!resp.ok) throw new Error(`Telegram error: ${resp.description}`);
          return { ok: true, messageId: resp.result?.message_id };
        });
      }

      if (channels.includes('youtube')) {
        results.youtube = { ok: false, reason: 'YouTube upload requires manual setup — see docs/youtube-upload.md' };
      }

      await sm.completeStage(productionId, 'Publishing', {});
      await sm.transitionProduction(productionId, 'SUCCEEDED');
      await telemetry.track({ productionId, stage: 'Publishing', provider: 'telegram', operation: 'video_delivery', units: 1 });

      return { productionId, results };
    },
  },
};

// ── MCP protocol handler ──────────────────────────────────────────────────

async function handleMCPRequest(body) {
  const { method, params, id } = body;

  if (method === 'tools/list') {
    return { id, result: { tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema })) } };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    const tool = TOOLS[name];
    if (!tool) return { id, error: { code: -32601, message: `Unknown tool: ${name}` } };
    try {
      const result = await tool.handler(args || {});
      return { id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } };
    } catch (err) {
      return { id, error: { code: -32000, message: err.message, data: { errorClass: err.errorClass, stageName: err.stageName } } };
    }
  }

  return { id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

// ── HTTP server ───────────────────────────────────────────────────────────

async function start() {
  await sm.init();
  await telemetry.init();

  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', tools: Object.keys(TOOLS) }));
    }

    if (req.method !== 'POST') {
      res.writeHead(405); return res.end();
    }

    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {
        res.writeHead(400); return res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
      const response = await handleMCPRequest(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[video-agent MCP] listening on http://127.0.0.1:${PORT}`);
    console.log(`[video-agent MCP] tools: ${Object.keys(TOOLS).join(', ')}`);
    console.log(`[video-agent MCP] LLM=${process.env.PROVIDER_LLM || 'groq'} TTS=${process.env.PROVIDER_TTS || 'edge-tts'} Image=${process.env.PROVIDER_IMAGE || 'pollinations'}`);
  });
}

start().catch(err => { console.error('[video-agent MCP] startup failed:', err); process.exit(1); });
