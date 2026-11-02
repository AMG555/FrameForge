/**
 * Workflow A — Research
 *
 * Generic topic researcher. Works for any content type: tech explainers,
 * cooking tutorials, travel vlogs, educational shorts, etc.
 *
 * The caller (agentic IDE or CLI) controls persona, format and style.
 * This module does NOT hardcode any domain or narrator persona.
 *
 * Can be called from:
 *   1. MCP server:  research_topic tool
 *   2. CLI:         node src/workflows/research.js --topic "..."
 *   3. Worker API:  full_pipeline job type
 *
 * Returns: { productionId, topic, claims[], myths[], angles[], hookIdeas[] }
 */
'use strict';

const crypto = require('crypto');
const { LLMProvider }  = require('../pipeline/providers');
const { StateMachine } = require('../pipeline/state-machine');
const { RetryPolicy }  = require('../pipeline/retry-policy');
const { Telemetry }    = require('../pipeline/telemetry');
const { FactChecker }  = require('../fact-checker/checker');

const FILES_DIR = process.env.N8N_FILES_DIR || '/home/node/.n8n-files';
const STATE_DIR = `${FILES_DIR}/state`;

/**
 * Run the research workflow for a single topic.
 *
 * @param {string} topic
 * @param {{
 *   claimCount?:   number,
 *   productionId?: string,
 *   persona?:      string,  // e.g. "tech journalist", "travel blogger", "cooking instructor"
 *   format?:       string,  // e.g. "short-form reel", "long YouTube video", "explainer"
 *   style?:        string,  // e.g. "educational", "comedic", "documentary", "tutorial"
 *   audience?:     string,  // e.g. "beginners", "professionals", "general public"
 * }} opts
 * @returns {Promise<ResearchResult>}
 */
async function runResearch(topic, {
  claimCount = 10,
  productionId = null,
  persona = 'video content researcher',
  format = 'video',
  style = 'informative',
  audience = 'general public',
} = {}) {
  const llm       = new LLMProvider();
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 10000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });
  const checker   = new FactChecker({ llm });

  await sm.init();
  await telemetry.init();

  const pid = productionId || await sm.createProduction({ topic, pipelineVersion: '2.0.0' });
  await sm.startStage(pid, 'Research');

  // ── Phase 1: Initial research ─────────────────────────────────────────────
  const researchRaw = await retryPol.executeStage('Research', async () => {
    const system = [
      `You are a ${persona} specialising in ${format} content.`,
      'Output ONLY raw JSON. No markdown. No code fences. Start with { and end with }.',
    ].join(' ');

    const user = [
      `TOPIC: ${topic}`,
      `FORMAT: ${format}`,
      `STYLE: ${style}`,
      `AUDIENCE: ${audience}`,
      '',
      `Return ${claimCount} factual claims as JSON:`,
      '{"topic":"...","claims":[{"claim":"...","confidence":"high|medium|low","safe_wording":"..."}],',
      '"common_myths":["..."],"modern_comparisons":["..."],"story_angles":["..."],',
      '"hook_ideas":["...","...","..."]}',
    ].join('\n');

    return llm.chat({ system, user, temperature: 0.7, maxTokens: 4000 });
  });

  let research;
  try { research = LLMProvider.parseJson(researchRaw); }
  catch (e) { throw new Error(`Research JSON parse failed: ${e.message}`); }
  if (!Array.isArray(research.claims) || research.claims.length < 5) {
    throw new Error(`Research returned too few claims: ${research.claims?.length}`);
  }

  // ── Phase 2: Fact-check all claims ───────────────────────────────────────
  const checkedClaims = await Promise.all(
    research.claims.map(async c => {
      try {
        const result = await checker.checkClaim(c, { context: topic });
        return {
          ...c,
          factCheckResult: result.decision,
          riskLevel:       result.riskLevel,
          requiresReview:  result.requiresHumanReview,
          sources:         result.evidence || [],
        };
      } catch {
        return { ...c, factCheckResult: 'UNVERIFIED', requiresReview: true };
      }
    })
  );

  const approved    = checkedClaims.filter(c => !c.requiresReview);
  const needsReview = checkedClaims.filter(c =>  c.requiresReview);

  if (needsReview.length > 0) {
    console.warn(`[Research] ${needsReview.length} claims flagged for review:`, needsReview.map(c => c.claim.slice(0, 60)));
  }

  const outputHash = crypto.createHash('sha256').update(researchRaw).digest('hex').slice(0, 16);
  await sm.completeStage(pid, 'Research', { outputHash });
  await telemetry.track({
    productionId: pid,
    stage: 'Research',
    provider: process.env.PROVIDER_LLM || 'groq',
    operation: 'research_generation',
    units: Math.ceil(researchRaw.length / 4),
  });

  return {
    productionId:    pid,
    topic,
    claims:          approved,
    claimsForReview: needsReview,
    myths:           research.common_myths || [],
    angles:          research.story_angles || [],
    hookIdeas:       research.hook_ideas   || [],
    outputHash,
  };
}

module.exports = { runResearch };

// ── CLI entrypoint ─────────────────────────────────────────────────────────
if (require.main === module) {
  const args  = process.argv.slice(2);
  const tIdx  = args.indexOf('--topic');
  const topic = tIdx >= 0 ? args[tIdx + 1] : args[0];
  if (!topic) { console.error('Usage: node src/workflows/research.js --topic "..."'); process.exit(1); }
  runResearch(topic).then(r => {
    console.log(JSON.stringify(r, null, 2));
  }).catch(e => { console.error(e.message); process.exit(1); });
}
