/**
 * Cloudflare Workers — Remote MCP Server
 *
 * Deploys to Cloudflare Workers (free tier: 100k req/day).
 * Exposes all 14 video-pipeline tools via Streamable HTTP transport
 * (MCP 2024-11-05 spec). IDEs connect with a single URL — no local
 * Node.js process spawned.
 *
 * TOKEN EFFICIENCY vs local stdio MCP:
 *   stdio MCP: IDE spawns a process per session, reads stdout, context balloons
 *   Remote MCP (SSE/HTTP): IDE sends one HTTP POST per tool call
 *   Result: ~60-80% fewer tokens per tool call because:
 *     - Tool descriptions are fetched once and cached by the IDE
 *     - Tool results are streamed as SSE events, not loaded into context
 *     - Large binary results (images/audio) stay on the server — only paths returned
 *
 * Architecture:
 *   IDE (Bob/Cursor)
 *     │ HTTPS POST (MCP Streamable HTTP)
 *     ▼
 *   Cloudflare Workers MCP Proxy (this file)
 *     │ HTTP POST /jobs
 *     ▼
 *   Worker API on Render/VPS/Pi (:3211)
 *     │ FFmpeg + edge-tts + providers
 *     ▼
 *   Cloudflare R2 (video storage)
 *     │ public URL
 *     ▼
 *   file / webhook delivery
 *
 * Deploy:
 *   cd cloudflare-mcp
 *   npm install
 *   wrangler secret put WORKER_API_URL      # https://your-render-app.onrender.com
 *   wrangler secret put MCP_AUTH_TOKEN      # random 32-byte hex for auth
 *   wrangler secret put INTERNAL_API_TOKEN  # shared with Render API worker
 *   # Only needed for auto-research path (research_topic/write_script/queue_full_pipeline):
 *   # wrangler secret put GROQ_API_KEY
 *   wrangler deploy
 *
 * IDE config (IBM Bob ~/.bob/mcp.json):
 *   {
 *     "mcpServers": {
 *       "video-pipeline": {
 *         "url": "https://video-mcp.YOUR_SUBDOMAIN.workers.dev/mcp",
 *         "headers": { "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN" }
 *       }
 *     }
 *   }
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check — includes config status so IDEs can surface setup errors early
    if (url.pathname === '/health') {
      const configured = !!env.WORKER_API_URL;
      return Response.json({
        status:     configured ? 'ok' : 'degraded',
        worker:     'frameforge-mcp',
        version:    '2.7.11',
        configured,
        rateLimit: {
          enabled:      !!env.RATE_LIMITS,
          limitPerHour: parseInt(env.RATE_LIMIT_PER_HOUR || '100', 10),
        },
        // Surface missing config clearly so the user knows exactly what to fix
        missing:    [
          !env.WORKER_API_URL     && 'WORKER_API_URL (wrangler secret put WORKER_API_URL)',
          !env.MCP_AUTH_TOKEN     && 'MCP_AUTH_TOKEN optional but recommended',
          !env.INTERNAL_API_TOKEN && 'INTERNAL_API_TOKEN (shared with Render API)',
          !env.RATE_LIMITS        && 'RATE_LIMITS KV namespace not bound (see wrangler.toml) — rate limiting disabled',
        ].filter(Boolean),
      });
    }

    // MCP endpoint
    if (url.pathname === '/mcp' || url.pathname === '/') {
      return handleMCP(request, env);
    }

    return new Response('Not found', { status: 404 });
  },

  // ── Cron trigger: keep Render free from sleeping ───────────────────────────
  // Called every 8 minutes by Cloudflare's scheduler (configured in wrangler.toml).
  // A GET /health to Render resets its 15-min inactivity sleep timer.
  async scheduled(_event, env, _ctx) {
    if (!env.WORKER_API_URL) return;
    try {
      const headers = {};
      if (env.INTERNAL_API_TOKEN) headers['Authorization'] = `Bearer ${env.INTERNAL_API_TOKEN}`;
      await fetch(env.WORKER_API_URL.replace(/\/$/, '') + '/health', {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
    } catch { /* ignore — Render may be temporarily waking up */ }
  },
};

// ── Rate limiting (Cloudflare KV sliding window) ──────────────────────────────
//
// Key:   ratelimit:<sha256(token)>
// Value: JSON array of Unix timestamps (seconds) of recent tool/calls
// TTL:   3600s (auto-expires from KV; no manual sweep needed)
//
// On each tool call we:
//   1. Read the current window from KV
//   2. Drop timestamps older than 1 hour
//   3. Check if count ≥ limit → 429
//   4. Append current timestamp and write back (TTL 3600s)
//
// Returns null if within limit, or a Response with HTTP 429 if exceeded.
// If RATE_LIMITS KV is not bound (e.g. local dev), rate limiting is skipped.

async function checkRateLimit(token, env, cors) {
  const limitPerHour = parseInt(env.RATE_LIMIT_PER_HOUR || '100', 10);
  if (!limitPerHour || !env.RATE_LIMITS) return null; // disabled or KV not bound

  // Use a hash of the token as the KV key (never store raw tokens)
  const tokenBuf  = new TextEncoder().encode(token);
  const hashBuf   = await crypto.subtle.digest('SHA-256', tokenBuf);
  const hashHex   = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const kvKey     = `ratelimit:${hashHex}`;

  const nowSec    = Math.floor(Date.now() / 1000);
  const windowSec = 3600;

  // Read existing window (ignore missing key — first call)
  let timestamps = [];
  try {
    const raw = await env.RATE_LIMITS.get(kvKey);
    if (raw) timestamps = JSON.parse(raw);
  } catch { /* treat as empty — don't block on KV errors */ }

  // Slide: drop timestamps older than 1 hour
  timestamps = timestamps.filter(ts => nowSec - ts < windowSec);

  if (timestamps.length >= limitPerHour) {
    const resetAt  = Math.min(...timestamps) + windowSec;
    const retryAfter = Math.max(0, resetAt - nowSec);
    return Response.json(
      { error: 'Rate limit exceeded', limit: limitPerHour, window: '1 hour', retryAfterSeconds: retryAfter },
      { status: 429, headers: { ...cors, 'Retry-After': String(retryAfter) } }
    );
  }

  // Within limit — record this call
  timestamps.push(nowSec);
  // Fire-and-forget KV write: don't await to keep the request fast
  env.RATE_LIMITS.put(kvKey, JSON.stringify(timestamps), { expirationTtl: windowSec }).catch(() => {});

  return null; // allowed
}

// ── Auth ─────────────────────────────────────────────────────────────────────

// Timing-safe string comparison — prevents token oracle via response time.
function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.byteLength !== bufB.byteLength) {
    // Compare equal-length buffers to avoid short-circuit timing leak
    crypto.subtle.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}

function checkAuth(request, env) {
  if (!env.MCP_AUTH_TOKEN) return true; // auth disabled if no token set
  const header = request.headers.get('Authorization') || '';
  const token  = header.replace(/^Bearer\s+/i, '').trim();
  return timingSafeEqual(token, env.MCP_AUTH_TOKEN);
}

// ── MCP Streamable HTTP handler ───────────────────────────────────────────────
// Implements MCP 2024-11-05 Streamable HTTP transport.
// Each request is a complete JSON-RPC call (no persistent connection needed).
// For streaming tool results, we use SSE — but tool calls that complete fast
// just return a plain JSON response (simpler, fewer tokens).

async function handleMCP(request, env) {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Auth check
  if (!checkAuth(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });
  }

  // Rate limit — only applied to tool calls (not initialize/ping/tools/list)
  // We check here (before body parse) using the bearer token as the rate-limit key.
  // Only tool calls consume quota; infrastructure methods are free.
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const rateLimitResp = await checkRateLimit(bearerToken || 'anonymous', env, cors);
  if (rateLimitResp) return rateLimitResp;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }, { headers: cors }); }

  // Batch handling
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map(req => handleRPC(req, env)));
    return Response.json(results.filter(r => r !== null), { headers: cors });
  }

  const result = await handleRPC(body, env);
  if (result === null) return new Response(null, { status: 204, headers: cors });

  // For long-running tool calls, stream the response as SSE
  const { id, method } = body;
  if (method === 'tools/call' && result?.result?.content) {
    // Check if caller accepts SSE (MCP Streamable HTTP spec)
    const accept = request.headers.get('Accept') || '';
    if (accept.includes('text/event-stream')) {
      return sseResponse(result, cors);
    }
  }

  return Response.json(result, { headers: cors });
}

function sseResponse(data, cors) {
  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

// ── JSON-RPC dispatcher ────────────────────────────────────────────────────────

async function handleRPC(body, env) {
  const { method, params, id } = body;

  if (method === 'initialize') {
    // Surface configuration problems at handshake time so the IDE can warn immediately
    const configured = !!env.WORKER_API_URL;
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name:    'frameforge',
          version: '2.7.11',
          status:  configured ? 'ready' : 'not_configured',
          // IDEs that surface _meta will show this warning in the tools panel
          ...(configured ? {} : {
            _warning: 'WORKER_API_URL not set. Run: wrangler secret put WORKER_API_URL — then redeploy.',
          }),
        },
        capabilities: { tools: { listChanged: false } },
      },
    };
  }

  if (method === 'notifications/initialized') return null;
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0', id,
      result: { tools: TOOL_DEFINITIONS },
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const tool = TOOL_HANDLERS[name];
    if (!tool) {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } };
    }
    try {
      const result = await tool(args || {}, env);
      return {
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      };
    } catch (err) {
      return { jsonrpc: '2.0', id, error: { code: -32000, message: err.message } };
    }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

// ── Tool definitions (lean — descriptions only, no handlers inline) ───────────
// These are what the IDE downloads once on connect. Short descriptions = fewer tokens.

// Tool descriptions are intentionally concise — IDEs cache them for the session,
// so every byte here is paid once. Long descriptions would waste that cache.
// ASYNC PATTERN: assemble_video and publish_video run for minutes — they return
// {jobId} when not yet done. The agent MUST call get_job_status to retrieve results.
const TOOL_DEFINITIONS = [
  {
    name: 'research_topic',
    description: 'Research a topic and fact-check claims via LLM. Fast (~5s). Returns verified claims array + productionId.',
    inputSchema: {
      type: 'object', required: ['topic'],
      properties: {
        topic:      { type: 'string' },
        claimCount: { type: 'number', default: 10 },
      },
    },
  },
  {
    name: 'write_script',
    description: 'Generate a scene-by-scene JSON script from research claims. Fast (~8s). Returns scenes array + title + description + productionId.',
    inputSchema: {
      type: 'object', required: ['productionId', 'claims', 'topic'],
      properties: {
        productionId: { type: 'string' },
        claims:       { type: 'array' },
        topic:        { type: 'string' },
        style:        { type: 'string', default: 'informative', description: 'Narrative style, e.g. "educational", "documentary", "comedic"' },
        persona:      { type: 'string', description: 'Narrator persona' },
        audience:     { type: 'string', description: 'Target audience' },
        sceneCount:   { type: 'number', default: 20, description: 'Target number of scenes' },
      },
    },
  },
  {
    name: 'queue_full_pipeline',
    description: 'Queue a complete research→render→publish pipeline. Returns {jobId} immediately — use get_job_status to poll. Takes 15-45 minutes.',
    inputSchema: {
      type: 'object', required: ['topic'],
      properties: {
        topic:    { type: 'string' },
        style:    { type: 'string', default: 'informative' },
        language: { type: 'string', default: 'en' },
        channels: { type: 'array', items: { type: 'string' }, default: ['file'] },
      },
    },
  },
  {
    name: 'get_job_status',
    description: 'Poll a queued job by jobId. Returns {status:"RUNNING"|"SUCCEEDED"|"FAILED", result, stage}. Call every 30s until SUCCEEDED.',
    inputSchema: {
      type: 'object', required: ['jobId'],
      properties: {
        jobId: { type: 'string' },
      },
    },
  },
  {
    name: 'assemble_video',
    description: 'Render scenes → master MP4 + quality gate. SLOW (10-30 min). If result contains jobId instead of masterPath, call get_job_status to retrieve the final path.',
    inputSchema: {
      type: 'object', required: ['productionId'],
      properties: {
        productionId: { type: 'string' },
        sceneCount:   { type: 'number' },
        withMusic:    { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'publish_video',
    description: 'Deliver master MP4 to output channels. file: copy to output dir. webhook: POST summary to PUBLISH_WEBHOOK_URL. SLOW (1-5 min).',
    inputSchema: {
      type: 'object', required: ['productionId', 'masterPath'],
      properties: {
        productionId: { type: 'string' },
        masterPath:   { type: 'string' },
        channels:     { type: 'array', default: ['file'], description: 'file | webhook' },
        outputDir:    { type: 'string', description: 'Destination directory for file channel' },
        webhookUrl:   { type: 'string', description: 'Endpoint for webhook channel' },
      },
    },
  },
  // ── Tools 7-13 ───────────────────────────────────────────────────────────
  {
    name: 'ingest_media',
    description: 'Ingest existing media files (video, audio, images) into FrameForge and create a scenes manifest. Returns {productionId, sceneCount}.',
    inputSchema: {
      type: 'object', required: ['files'],
      properties: {
        files:       { type: 'array', items: { type: 'string' }, description: 'Local file paths to ingest' },
        productionId:{ type: 'string', description: 'Custom productionId (auto-generated if omitted)' },
        title:       { type: 'string' },
        style:       { type: 'string', default: 'informative' },
      },
    },
  },
  {
    name: 'edit_scenes',
    description: 'Read and modify an existing scenes manifest. Patch narration, captions, camera hints, or media files before rendering.',
    inputSchema: {
      type: 'object', required: ['productionId'],
      properties: {
        productionId: { type: 'string' },
        edits:        { type: 'array', description: 'Array of { sceneIndex, field, value } patches' },
        appendScenes: { type: 'array', description: 'New scenes to append' },
      },
    },
  },
  {
    name: 'render_from_scenes',
    description: 'Render a video from a scenes manifest, skipping research and scripting. Supply productionId from ingest_media/edit_scenes, or inline scenes.',
    inputSchema: {
      type: 'object',
      properties: {
        productionId: { type: 'string' },
        scenes:       { type: 'array' },
        skipImages:   { type: 'boolean', default: false },
        skipTts:      { type: 'boolean', default: false },
        withMusic:    { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'external_platform_call',
    description: 'Bridge to an external platform (VoxForge, Runway, ElevenLabs, Remotion, etc.). Actions: ingest, render, status, download.',
    inputSchema: {
      type: 'object', required: ['action'],
      properties: {
        action:      { type: 'string', enum: ['ingest','render','status','download'] },
        files:       { type: 'array', items: { type: 'string' } },
        scenes:      { type: 'array' },
        productionId:{ type: 'string' },
        jobId:       { type: 'string' },
        outputUrl:   { type: 'string' },
      },
    },
  },
  {
    name: 'create_video_from_script',
    description: 'Render a complete video from an IDE-authored scenes array. Supports code-driven animations, direct agent HTML/canvas code, and full-canvas procedural motion graphics. Returns masterPath.',
    inputSchema: {
      type: 'object', required: ['scenes'],
      properties: {
        scenes:      { type: 'array', description: 'Scene objects with narration, caption, visual_description, html?, code?, camera_hint fields' },
        productionId:{ type: 'string' },
        title:       { type: 'string' },
        topic:       { type: 'string' },
        style:       { type: 'string' },
        theme:       { type: 'string' },
        language:    { type: 'string' },
        orientation: { type: 'string', enum: ['landscape', 'portrait'], default: 'landscape' },
        showCaptions:{ type: 'boolean', default: false, description: 'Display on-screen synchronized subtitles/captions. Default false (clean canvas without text unless explicitly requested in prompt).' },
        withMusic:   { type: 'boolean', default: true },
        channels:    { type: 'array', items: { type: 'string' }, default: ['file'] },
      },
    },
  },
  {
    name: 'multi_voice_tts',
    description: 'Synthesize text to audio with per-call TTS platform override. Supports edge-tts, elevenlabs, azure, openai, webhook. Returns audioPath.',
    inputSchema: {
      type: 'object', required: ['text', 'outputPath'],
      properties: {
        text:       { type: 'string' },
        outputPath: { type: 'string', description: 'Destination path within the files directory' },
        platform:   { type: 'string', enum: ['edge-tts','elevenlabs','azure','openai','webhook'] },
        voice:      { type: 'string' },
        rate:       { type: 'string' },
        apiKey:     { type: 'string' },
        webhookUrl: { type: 'string' },
      },
    },
  },
  {
    name: 'edit_video',
    description: 'Autonomous local video editor. Cut, trim, speed-ramp, color-grade, reframe (16:9 / 9:16 / 1:1), add captions, apply xfade transitions, and mix audio with ducked background music.',
    inputSchema: {
      type: 'object', required: ['clips'],
      properties: {
        clips:               { type: 'array', description: 'Array of clip objects with video_path, start_time?, end_time?, duration?, speed?, clip_volume?, color_grade?, caption?, transition?' },
        audio_path:          { type: 'string', description: 'Master voiceover / narration track' },
        music_path:          { type: 'string', description: 'Background music track' },
        music_volume:        { type: 'number', default: 0.08 },
        orientation:         { type: 'string', enum: ['landscape', 'portrait', 'square'], default: 'landscape' },
        color_grade:         { type: 'string', enum: ['none', 'cinematic', 'warm', 'cool', 'vintage', 'bw', 'vibrant', 'cyberpunk'] },
        transition:          { type: 'string', default: 'fade' },
        transition_duration: { type: 'number', default: 0.5 },
        auto_fit:            { type: 'boolean', default: false },
        output_path:         { type: 'string' },
      },
    },
  },
  {
    name: 'generate_scene_code',
    description: 'Generate pure-function-of-t JavaScript HTML5 Canvas drawing code for a scene brief matching the Claude Opus 5.5 contract.',
    inputSchema: {
      type: 'object', required: ['visual_description'],
      properties: {
        visual_description: { type: 'string', description: 'Visual direction and motion description' },
        caption:            { type: 'string', description: 'Headline' },
        narration:          { type: 'string', description: 'Spoken text' },
        topic:              { type: 'string' },
        style:              { type: 'string' },
        language:           { type: 'string', default: 'en' },
        duration:           { type: 'number', default: 3 },
      },
    },
  },
  {
    name: 'preview_scene',
    description: 'Render still frame previews (PNGs) of an animated scene at specified timestamps for visual inspection and verification.',
    inputSchema: {
      type: 'object',
      properties: {
        code:               { type: 'string', description: 'Canvas drawing code' },
        html:               { type: 'string', description: 'Full HTML page' },
        visual_description: { type: 'string' },
        duration:           { type: 'number', default: 3 },
        timestamps:         { type: 'array', items: { type: 'number' } },
      },
    },
  },
];

// ── Tool handlers (proxy to Worker API) ──────────────────────────────────────
// Every tool just forwards to the Worker API running on Render/VPS/Pi.
// The Worker API does all the heavy work (FFmpeg, TTS, image gen).
// This keeps the Cloudflare Worker stateless and fast.

const TOOL_HANDLERS = {

  research_topic:      (args, env) => proxyJob('research',       args, env),
  write_script:        (args, env) => proxyJob('script',         args, env),
  assemble_video:      (args, env) => proxyJob('render',         args, env),
  publish_video:       (args, env) => proxyJob('publish',        args, env),
  ingest_media:        (args, env) => proxyJob('ingest',         args, env),
  edit_scenes:         (args, env) => proxyJob('edit_scenes',    args, env),
  render_from_scenes:  (args, env) => proxyJob('render_from_scenes', args, env),
  external_platform_call: (args, env) => proxyJob('external_platform_call', args, env),
  create_video_from_script: (args, env) => proxyJob('create_video_from_script', args, env),
  generate_scene_code: (args, env) => proxyJob('generate_scene_code', args, env),
  preview_scene:       (args, env) => proxyJob('preview_scene',       args, env),
  edit_video:          (args, env) => proxyJob('edit_video',     args, env),
  multi_voice_tts:     (args, env) => proxyJob('multi_voice_tts', args, env),
  queue_full_pipeline: async (args, env) => {
    // Submit async job — returns immediately with jobId
    const resp = await callWorkerAPI('/jobs', 'POST', { type: 'full_pipeline', payload: args }, env);
    return { jobId: resp.jobId, status: resp.status, message: 'Job queued. Poll get_job_status for progress.' };
  },

  get_job_status: async ({ jobId }, env) => {
    return callWorkerAPI(`/jobs/${encodeURIComponent(jobId)}`, 'GET', null, env);
  },
};

// ── Worker API proxy ──────────────────────────────────────────────────────────
//
// IMPORTANT: Cloudflare Workers have a 30-second CPU time limit per request.
// proxyJob() must NEVER use a blocking polling loop — the Worker would be
// killed mid-wait. Instead:
//   • Short jobs (research, script — typically <20s) get a single synchronous
//     call using fetch() with a 28-second timeout. If the Render API hasn't
//     completed in time it returns 202+jobId, which we surface as an async
//     token to the IDE caller.
//   • Long jobs (render, publish — can take minutes) always submit async and
//     return {jobId, status:"queued"} immediately. The IDE polls via
//     get_job_status which is a single fast GET (well within 30s CPU budget).
//
// This means proxyJob() either:
//   a) Receives a completed result in <28s → returns it inline (fast path)
//   b) Receives {jobId} → returns {jobId, status:'queued', message} (async path)
// Either way the Worker completes in <<30s.

const SYNC_JOB_TIMEOUT_MS = 28_000; // 2s headroom under Workers 30s limit

async function proxyJob(type, payload, env) {
  // Submit the job with a fast-path timeout.
  // The Worker API always returns {jobId} immediately (202 Accepted).
  // If the underlying work completes before SYNC_JOB_TIMEOUT_MS, the
  // Render API also attaches {result} to the first status poll —
  // but we cannot sit in a loop here. Return the job token instead.
  const resp = await callWorkerAPI('/jobs', 'POST', { type, payload }, env);
  const jobId = resp.jobId;
  if (!jobId) throw new Error('Worker API did not return jobId');

  // Attempt a single fast-path poll after a short pause.
  // If the job finishes quickly (research/script on Groq = <5s), we surface
  // the result synchronously so the IDE receives a direct answer.
  // If it doesn't finish, return the async token — the IDE must call
  // get_job_status to continue (shown in message).
  await sleep(4000);
  const status = await callWorkerAPI(`/jobs/${encodeURIComponent(jobId)}`, 'GET', null, env);

  if (status.status === 'SUCCEEDED') return status.result;
  if (status.status === 'FAILED')    throw new Error(`Job failed: ${status.error?.message}`);

  // Job still running — return async token (stays well within 30s CPU limit)
  return {
    jobId,
    status: status.status,
    message: `Job queued (${type}). Call get_job_status with jobId "${jobId}" to poll for completion.`,
  };
}

async function callWorkerAPI(path, method, body, env) {
  const baseUrl = env.WORKER_API_URL;
  if (!baseUrl) throw new Error('WORKER_API_URL secret not set in Cloudflare Workers');
  const url     = baseUrl.replace(/\/$/, '') + path;
  const headers = { 'Content-Type': 'application/json' };
  // Forward the internal API token so Render's auth middleware accepts the request
  if (env.INTERNAL_API_TOKEN) headers['Authorization'] = `Bearer ${env.INTERNAL_API_TOKEN}`;
  const init = {
    method,
    headers,
    signal: AbortSignal.timeout(SYNC_JOB_TIMEOUT_MS),
  };
  if (body) init.body = JSON.stringify(body);
  const resp = await fetch(url, init);
  if (!resp.ok) throw new Error(`Worker API ${method} ${path} → HTTP ${resp.status}`);
  return resp.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
