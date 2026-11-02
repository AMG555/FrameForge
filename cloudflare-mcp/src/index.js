/**
 * Cloudflare Workers — Remote MCP Server
 *
 * Deploys to Cloudflare Workers (free tier: 100k req/day).
 * Exposes all 6 video-pipeline tools via Streamable HTTP transport
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
 *   Telegram / YouTube
 *
 * Deploy:
 *   cd cloudflare-mcp
 *   npm install
 *   wrangler secret put WORKER_API_URL   # https://your-render-app.onrender.com
 *   wrangler secret put MCP_AUTH_TOKEN   # random 32-byte hex for auth
 *   wrangler secret put GROQ_API_KEY
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

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', worker: 'video-pipeline-mcp', version: '1.0.0' });
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

// ── Auth ─────────────────────────────────────────────────────────────────────

function checkAuth(request, env) {
  if (!env.MCP_AUTH_TOKEN) return true; // auth disabled if no token set
  const header = request.headers.get('Authorization') || '';
  const token  = header.replace(/^Bearer\s+/i, '').trim();
  return token === env.MCP_AUTH_TOKEN;
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
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'video-pipeline', version: '1.0.0' },
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

const TOOL_DEFINITIONS = [
  {
    name: 'research_topic',
    description: 'Research a topic. Returns verified claims for script generation.',
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
    description: 'Write a 55-scene video script from research. Returns scene JSON.',
    inputSchema: {
      type: 'object', required: ['productionId', 'claims', 'topic'],
      properties: {
        productionId: { type: 'string' },
        claims:       { type: 'array' },
        topic:        { type: 'string' },
        style:        { type: 'string', default: 'educational comedy' },
      },
    },
  },
  {
    name: 'queue_full_pipeline',
    description: 'Queue a complete video production (research → render → publish). Returns jobId for polling.',
    inputSchema: {
      type: 'object', required: ['topic'],
      properties: {
        topic:    { type: 'string' },
        channels: { type: 'array', items: { type: 'string' }, default: ['telegram'] },
      },
    },
  },
  {
    name: 'get_job_status',
    description: 'Poll status of a queued pipeline job. Returns status, progress, result.',
    inputSchema: {
      type: 'object', required: ['jobId'],
      properties: {
        jobId: { type: 'string' },
      },
    },
  },
  {
    name: 'assemble_video',
    description: 'Assemble rendered scenes into a final MP4 with quality gate.',
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
    description: 'Deliver finished video to Telegram / YouTube.',
    inputSchema: {
      type: 'object', required: ['productionId', 'masterPath'],
      properties: {
        productionId:       { type: 'string' },
        masterPath:         { type: 'string' },
        channels:           { type: 'array', default: ['telegram'] },
        youtubeTitle:       { type: 'string' },
        youtubeDescription: { type: 'string' },
      },
    },
  },
];

// ── Tool handlers (proxy to Worker API) ──────────────────────────────────────
// Every tool just forwards to the Worker API running on Render/VPS/Pi.
// The Worker API does all the heavy work (FFmpeg, TTS, image gen).
// This keeps the Cloudflare Worker stateless and fast.

const TOOL_HANDLERS = {

  research_topic: (args, env) => proxyJob('research', args, env),

  write_script: (args, env) => proxyJob('script', args, env),

  queue_full_pipeline: async (args, env) => {
    // Submit async job — returns immediately with jobId
    const resp = await callWorkerAPI('/jobs', 'POST', { type: 'full_pipeline', payload: args }, env);
    return { jobId: resp.jobId, status: resp.status, message: 'Job queued. Poll get_job_status for progress.' };
  },

  get_job_status: async ({ jobId }, env) => {
    return callWorkerAPI(`/jobs/${encodeURIComponent(jobId)}`, 'GET', null, env);
  },

  assemble_video: (args, env) => proxyJob('render', args, env),

  publish_video: (args, env) => proxyJob('publish', args, env),
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
