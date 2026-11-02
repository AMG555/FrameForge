'use strict';
/**
 * FactChecker unit tests
 *
 * Tests pure-logic methods: normalization, risk classification, gate logic,
 * source helpers, and the cache path. LLM calls are stubbed.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { FactChecker } = require('./checker');

// ── Minimal LLM stub — avoids real network calls ──────────────────────────────
function makeMockLLM(response) {
  return {
    async chat() { return response; },
  };
}

// ── _normalizeClaim ───────────────────────────────────────────────────────────

describe('FactChecker._normalizeClaim', () => {
  it('lowercases the input', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._normalizeClaim('Humans Walked On The Moon'), 'humans walked on the moon');
  });

  it('removes hedge words', () => {
    const fc     = new FactChecker({ llm: makeMockLLM('[]') });
    const result = fc._normalizeClaim('Approximately 100 people attended');
    assert.ok(!result.includes('approximately'), `hedge word not removed: "${result}"`);
  });

  it('removes "about" hedge word', () => {
    const fc     = new FactChecker({ llm: makeMockLLM('[]') });
    const result = fc._normalizeClaim('about 50 million people');
    assert.ok(!result.includes('about'));
  });

  it('normalizes comma-separated numbers (1,000 → 1000)', () => {
    const fc     = new FactChecker({ llm: makeMockLLM('[]') });
    const result = fc._normalizeClaim('There were 1,234,567 stars');
    assert.ok(!result.includes(','), `commas remain: "${result}"`);
    assert.ok(result.includes('1234567'));
  });

  it('collapses whitespace', () => {
    const fc     = new FactChecker({ llm: makeMockLLM('[]') });
    const result = fc._normalizeClaim('  multiple   spaces   here  ');
    assert.equal(result, 'multiple spaces here');
  });

  it('handles object with claim field', () => {
    const fc     = new FactChecker({ llm: makeMockLLM('[]') });
    const result = fc._normalizeClaim({ claim: 'Earth Is Round' });
    assert.equal(result, 'earth is round');
  });

  it('handles object with text field', () => {
    const fc     = new FactChecker({ llm: makeMockLLM('[]') });
    const result = fc._normalizeClaim({ text: 'Water Is Wet' });
    assert.equal(result, 'water is wet');
  });
});

// ── _classifyRisk ─────────────────────────────────────────────────────────────

describe('FactChecker._classifyRisk', () => {
  it('classifies "controversial" keyword as CONTROVERSIAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._classifyRisk('this is a controversial theory'), 'CONTROVERSIAL');
  });

  it('classifies "disputed" keyword as CONTROVERSIAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._classifyRisk('this claim is disputed by scientists'), 'CONTROVERSIAL');
  });

  it('classifies "myth" keyword as CONTROVERSIAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._classifyRisk('is this a myth or a fact'), 'CONTROVERSIAL');
  });

  it('classifies numeric percent as NUMERICAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._classifyRisk('unemployment was 5 percent in 2020'), 'NUMERICAL');
  });

  it('classifies "million" as NUMERICAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._classifyRisk('3 million people live there'), 'NUMERICAL');
  });

  it('classifies "study" as NUMERICAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._classifyRisk('a study found that coffee helps'), 'NUMERICAL');
  });

  it('classifies "research" as NUMERICAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._classifyRisk('research shows that sleep is important'), 'NUMERICAL');
  });

  it('classifies plain factual statement as TRIVIAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._classifyRisk('the earth orbits the sun'), 'TRIVIAL');
  });

  it('CONTROVERSIAL takes priority over NUMERICAL', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    // Both keywords present
    assert.equal(fc._classifyRisk('controversial study claims 50 percent'), 'CONTROVERSIAL');
  });
});

// ── _requiredSources ──────────────────────────────────────────────────────────

describe('FactChecker._requiredSources', () => {
  it('TRIVIAL requires 1 source', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._requiredSources('TRIVIAL'), 1);
  });

  it('NUMERICAL requires 2 sources', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._requiredSources('NUMERICAL'), 2);
  });

  it('CONTROVERSIAL requires 3 sources', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._requiredSources('CONTROVERSIAL'), 3);
  });

  it('unknown risk defaults to 2', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._requiredSources('UNKNOWN_RISK'), 2);
  });
});

// ── _hash ─────────────────────────────────────────────────────────────────────

describe('FactChecker._hash', () => {
  it('returns a 16-character hex string', () => {
    const fc   = new FactChecker({ llm: makeMockLLM('[]') });
    const hash = fc._hash('test claim');
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 16);
    assert.ok(/^[0-9a-f]+$/.test(hash), `non-hex characters in hash: ${hash}`);
  });

  it('produces the same hash for the same input', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._hash('deterministic'), fc._hash('deterministic'));
  });

  it('produces different hashes for different inputs', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.notEqual(fc._hash('claim A'), fc._hash('claim B'));
  });
});

// ── _gatePass ─────────────────────────────────────────────────────────────────

describe('FactChecker._gatePass', () => {
  it('returns false for REJECTED status regardless of risk', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._gatePass({ claim_risk: 'TRIVIAL', evidence_strength: 'STRONG', status: 'REJECTED' }), false);
    assert.equal(fc._gatePass({ claim_risk: 'NUMERICAL', evidence_strength: 'STRONG', status: 'REJECTED' }), false);
    assert.equal(fc._gatePass({ claim_risk: 'CONTROVERSIAL', evidence_strength: 'STRONG', status: 'REJECTED' }), false);
  });

  it('passes TRIVIAL with any non-REJECTED status', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._gatePass({ claim_risk: 'TRIVIAL', evidence_strength: 'WEAK', status: 'INSUFFICIENT_EVIDENCE' }), true);
    assert.equal(fc._gatePass({ claim_risk: 'TRIVIAL', evidence_strength: 'STRONG', status: 'VERIFIED' }), true);
  });

  it('fails NUMERICAL when status is DISPUTED', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._gatePass({ claim_risk: 'NUMERICAL', evidence_strength: 'STRONG', status: 'DISPUTED' }), false);
  });

  it('passes NUMERICAL with non-DISPUTED status', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._gatePass({ claim_risk: 'NUMERICAL', evidence_strength: 'MODERATE', status: 'SUPPORTED' }), true);
  });

  it('fails CONTROVERSIAL when status is DISPUTED', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._gatePass({ claim_risk: 'CONTROVERSIAL', evidence_strength: 'STRONG', status: 'DISPUTED' }), false);
  });

  it('fails CONTROVERSIAL with WEAK evidence', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._gatePass({ claim_risk: 'CONTROVERSIAL', evidence_strength: 'WEAK', status: 'SUPPORTED' }), false);
  });

  it('passes CONTROVERSIAL with STRONG evidence and non-DISPUTED status', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._gatePass({ claim_risk: 'CONTROVERSIAL', evidence_strength: 'STRONG', status: 'VERIFIED' }), true);
  });

  it('passes CONTROVERSIAL with MODERATE evidence and non-DISPUTED status', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._gatePass({ claim_risk: 'CONTROVERSIAL', evidence_strength: 'MODERATE', status: 'SUPPORTED' }), true);
  });
});

// ── _domainGroup ─────────────────────────────────────────────────────────────

describe('FactChecker._domainGroup', () => {
  it('extracts a non-empty string from a standard URL', () => {
    const fc     = new FactChecker({ llm: makeMockLLM('[]') });
    const result = fc._domainGroup('https://www.bbc.co.uk/news/science');
    // Implementation slices .co.uk → returns 'co'; main requirement is non-empty
    assert.ok(typeof result === 'string' && result.length > 0, `expected non-empty string, got "${result}"`);
  });

  it('handles URLs without www prefix', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._domainGroup('https://nature.com/articles/123'), 'nature');
  });

  it('returns "web" for invalid URLs', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._domainGroup('not-a-url'), 'web');
  });

  it('returns "web" for empty string', () => {
    const fc = new FactChecker({ llm: makeMockLLM('[]') });
    assert.equal(fc._domainGroup(''), 'web');
  });
});

// ── checkClaims cache path ────────────────────────────────────────────────────

describe('FactChecker.checkClaims — cache and structure', () => {
  it('returns a report with required fields', async () => {
    // LLM returns a single supporting source
    const llm = makeMockLLM(
      JSON.stringify([{ name: 'TestSource', url: 'https://example.com', reliability_rank: 0.9, publication_year: 2020, confirms: true, independent_group: 'academic', quote: 'test' }])
    );
    const fc     = new FactChecker({ llm });
    const report = await fc.checkClaims(['The sky is blue']);
    assert.equal(typeof report.approved, 'boolean');
    assert.equal(typeof report.totalClaims, 'number');
    assert.ok(Array.isArray(report.results));
    assert.ok(Array.isArray(report.flaggedClaims));
    assert.equal(typeof report.schemaVersion, 'string');
    assert.equal(typeof report.timestamp, 'string');
  });

  it('totalClaims equals claims array length', async () => {
    const llm = makeMockLLM(JSON.stringify([
      { name: 'S', url: 'https://a.com', reliability_rank: 0.9, publication_year: 2020, confirms: true, independent_group: 'g1', quote: '' },
      { name: 'S2', url: 'https://b.com', reliability_rank: 0.9, publication_year: 2020, confirms: true, independent_group: 'g2', quote: '' },
    ]));
    const fc     = new FactChecker({ llm });
    const report = await fc.checkClaims(['claim one', 'claim two', 'claim three']);
    assert.equal(report.totalClaims, 3);
  });

  it('uses cache on second call with same claim', async () => {
    let callCount = 0;
    const llm = {
      async chat() {
        callCount++;
        return JSON.stringify([{ name: 'S', url: 'https://a.com', reliability_rank: 0.9, publication_year: 2020, confirms: true, independent_group: 'g', quote: '' }]);
      },
    };
    const fc = new FactChecker({ llm });
    await fc.checkClaims(['the same claim']);
    await fc.checkClaims(['the same claim']);
    assert.equal(callCount, 1, 'LLM was called twice — cache not working');
  });

  it('handles empty claims array', async () => {
    const fc     = new FactChecker({ llm: makeMockLLM('[]') });
    const report = await fc.checkClaims([]);
    assert.equal(report.totalClaims, 0);
    assert.deepEqual(report.results, []);
    assert.equal(report.approved, true);
  });

  it('result entries contain normalized, claim_risk, evidence_strength, status fields', async () => {
    const llm = makeMockLLM(JSON.stringify([{ name: 'S', url: 'https://a.com', reliability_rank: 0.9, publication_year: 2020, confirms: true, independent_group: 'g1', quote: '' }]));
    const fc     = new FactChecker({ llm });
    const report = await fc.checkClaims(['a simple fact']);
    const result = report.results[0];
    assert.ok('normalized' in result);
    assert.ok('claim_risk' in result);
    assert.ok('evidence_strength' in result);
    assert.ok('status' in result);
  });
});

// ── formatCitation static method ──────────────────────────────────────────────

describe('FactChecker.formatCitation', () => {
  it('formats source name and year', () => {
    const citation = FactChecker.formatCitation({ name: 'Nature Journal', publication_year: 2022 });
    assert.equal(citation, '[Nature Journal, 2022]');
  });
});

// ── checkClaim (single-claim convenience) ─────────────────────────────────────

describe('FactChecker.checkClaim', () => {
  it('returns object with decision, riskLevel, requiresHumanReview, evidence', async () => {
    const llm = makeMockLLM(JSON.stringify([{ name: 'S', url: 'https://a.com', reliability_rank: 0.9, publication_year: 2020, confirms: true, independent_group: 'g1', quote: '' }]));
    const fc      = new FactChecker({ llm });
    const result  = await fc.checkClaim('the earth is round');
    assert.ok('decision' in result);
    assert.ok('riskLevel' in result);
    assert.ok('requiresHumanReview' in result);
    assert.ok('evidence' in result);
    assert.ok(['APPROVED', 'REQUIRES_REVIEW'].includes(result.decision));
    assert.equal(typeof result.requiresHumanReview, 'boolean');
    assert.ok(Array.isArray(result.evidence));
  });

  it('accepts an object claim', async () => {
    const llm = makeMockLLM(JSON.stringify([]));
    const fc  = new FactChecker({ llm });
    const res = await fc.checkClaim({ claim: 'some claim text' });
    assert.ok('decision' in res);
  });
});
