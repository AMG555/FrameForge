/**
 * Workflow A — Research
 * Task #28: topic → facts → verification
 *
 * Can be called from:
 *   1. n8n Code node:  const { runResearch } = require('/home/node/.n8n-files/workflows/research.js');
 *   2. MCP server:     research_topic tool (already wires into this)
 *   3. CLI:            node src/workflows/research.js --topic "..."
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
 * @param {string} topic
 * @param {{ claimCount?: number, productionId?: string }} opts
 * @returns {Promise<ResearchResult>}
 */
async function runResearch(topic, { claimCount = 10, productionId = null } = {}) {
  const llm       = new LLMProvider();
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 10000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });
  const checker   = new FactChecker({ llm });

  await sm.init();
  await telemetry.init();

  // Create production if not continuing an existing one
  const pid = productionId || await sm.createProduction({ topic, pipelineVersion: '1.0.0' });
  await sm.startStage(pid, 'Research');

  // ── Phase 1: Initial research ──────────────────────────────────────────
  const researchRaw = await retryPol.executeStage('Research', async () => {
    const system = 'You are a YouTube history researcher. Output ONLY raw JSON. No markdown. No code fences. Start with { and end with }.';
    const user = [
      `TOPIC: ${topic}`,
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

  // ── Phase 2: Fact-check all claims ────────────────────────────────────
  const checkedClaims = await Promise.all(
    research.claims.map(async c => {
      try {
        const result = await checker.checkClaim(c.claim, { context: topic });
        return {
          ...c,
          factCheckResult: result.decision,
          riskLevel:       result.riskLevel,
          requiresReview:  result.requiresHumanReview,
          sources:         result.evidence || [],
        };
      } catch {
        // Fact checker failure is non-blocking — flag for review
        return { ...c, factCheckResult: 'UNVERIFIED', requiresReview: true };
      }
    })
  );

  // Partition: auto-approved vs needs human review
  const approved       = checkedClaims.filter(c => !c.requiresReview);
  const needsReview    = checkedClaims.filter(c =>  c.requiresReview);

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
    productionId:   pid,
    topic,
    claims:         approved,
    claimsForReview: needsReview,
    myths:          research.common_myths || [],
    angles:         research.story_angles || [],
    hookIdeas:      research.hook_ideas || [],
    outputHash,
  };
}

module.exports = { runResearch };

// ── CLI entrypoint ────────────────────────────────────────────────────────
if (require.main === module) {
  const args  = process.argv.slice(2);
  const tIdx  = args.indexOf('--topic');
  const topic = tIdx >= 0 ? args[tIdx + 1] : args[0];
  if (!topic) { console.error('Usage: node src/workflows/research.js --topic "..."'); process.exit(1); }
  runResearch(topic).then(r => {
    console.log(JSON.stringify(r, null, 2));
  }).catch(e => { console.error(e.message); process.exit(1); });
}
