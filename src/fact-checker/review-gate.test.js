'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { FactCheckerReviewGate } = require('./review-gate');

// ── Helper to make a minimal fact-check result ────────────────────────────────

function makeResult({ claim_risk = 'NUMERICAL', evidence_strength = 'STRONG', status = 'VERIFIED', rawClaim = 'test claim' } = {}) {
  return { claim_risk, evidence_strength, status, rawClaim, sources: [], source_independence: 2 };
}

// ── FactCheckerReviewGate.classifyDecisions ───────────────────────────────────

describe('FactCheckerReviewGate.classifyDecisions', () => {
  let tmpDir;
  let gate;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-reviewgate-test-'));
    gate   = new FactCheckerReviewGate({ reviewsDir: tmpDir });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('auto-approves TRIVIAL claims with non-REJECTED status', () => {
    const report = { results: [makeResult({ claim_risk: 'TRIVIAL', status: 'VERIFIED' })] };
    const { autoApproved, needsReview, rejected } = gate.classifyDecisions(report);
    assert.equal(autoApproved.length, 1);
    assert.equal(needsReview.length, 0);
    assert.equal(rejected.length, 0);
  });

  it('rejects TRIVIAL claims with REJECTED status', () => {
    const report = { results: [makeResult({ claim_risk: 'TRIVIAL', status: 'REJECTED' })] };
    const { autoApproved, needsReview, rejected } = gate.classifyDecisions(report);
    assert.equal(rejected.length, 1);
    assert.equal(autoApproved.length, 0);
  });

  it('auto-approves NUMERICAL claims with STRONG evidence and non-DISPUTED status', () => {
    const report = { results: [makeResult({ claim_risk: 'NUMERICAL', evidence_strength: 'STRONG', status: 'VERIFIED' })] };
    const { autoApproved } = gate.classifyDecisions(report);
    assert.equal(autoApproved.length, 1);
  });

  it('auto-approves NUMERICAL claims with MODERATE evidence', () => {
    const report = { results: [makeResult({ claim_risk: 'NUMERICAL', evidence_strength: 'MODERATE', status: 'VERIFIED' })] };
    const { autoApproved } = gate.classifyDecisions(report);
    assert.equal(autoApproved.length, 1);
  });

  it('flags NUMERICAL claims with DISPUTED status for human review', () => {
    const report = { results: [makeResult({ claim_risk: 'NUMERICAL', status: 'DISPUTED' })] };
    const { needsReview } = gate.classifyDecisions(report);
    assert.equal(needsReview.length, 1);
  });

  it('flags NUMERICAL claims with INSUFFICIENT evidence for human review', () => {
    const report = { results: [makeResult({ claim_risk: 'NUMERICAL', evidence_strength: 'INSUFFICIENT', status: 'VERIFIED' })] };
    const { needsReview } = gate.classifyDecisions(report);
    assert.equal(needsReview.length, 1);
  });

  it('rejects UNSUPPORTED+CONTROVERSIAL claims immediately', () => {
    const report = { results: [makeResult({ claim_risk: 'CONTROVERSIAL', status: 'UNSUPPORTED' })] };
    const { rejected } = gate.classifyDecisions(report);
    assert.equal(rejected.length, 1);
  });

  it('flags CONTROVERSIAL DISPUTED for human review', () => {
    const report = { results: [makeResult({ claim_risk: 'CONTROVERSIAL', status: 'DISPUTED' })] };
    const { needsReview } = gate.classifyDecisions(report);
    assert.equal(needsReview.length, 1);
  });

  it('flags CONTROVERSIAL INSUFFICIENT_EVIDENCE for human review', () => {
    const report = { results: [makeResult({ claim_risk: 'CONTROVERSIAL', status: 'INSUFFICIENT_EVIDENCE' })] };
    const { needsReview } = gate.classifyDecisions(report);
    assert.equal(needsReview.length, 1);
  });

  it('auto-approves CONTROVERSIAL with STRONG evidence and non-DISPUTED status', () => {
    const report = { results: [makeResult({ claim_risk: 'CONTROVERSIAL', evidence_strength: 'STRONG', status: 'VERIFIED' })] };
    const { autoApproved } = gate.classifyDecisions(report);
    assert.equal(autoApproved.length, 1);
  });

  it('rejects claims with REJECTED status regardless of risk', () => {
    const report = {
      results: [
        makeResult({ claim_risk: 'NUMERICAL',    status: 'REJECTED' }),
        makeResult({ claim_risk: 'CONTROVERSIAL', status: 'REJECTED' }),
      ],
    };
    const { rejected } = gate.classifyDecisions(report);
    assert.equal(rejected.length, 2);
  });

  it('adds _decision field to each result', () => {
    const result = makeResult({ claim_risk: 'TRIVIAL', status: 'VERIFIED' });
    const report = { results: [result] };
    gate.classifyDecisions(report);
    assert.ok(result._decision);
  });

  it('handles empty results array', () => {
    const { autoApproved, needsReview, rejected } = gate.classifyDecisions({ results: [] });
    assert.equal(autoApproved.length, 0);
    assert.equal(needsReview.length, 0);
    assert.equal(rejected.length, 0);
  });

  it('handles missing results key', () => {
    const { autoApproved, needsReview, rejected } = gate.classifyDecisions({});
    assert.equal(autoApproved.length, 0);
    assert.equal(needsReview.length, 0);
    assert.equal(rejected.length, 0);
  });
});

// ── FactCheckerReviewGate.formatReviewRequest ─────────────────────────────────

describe('FactCheckerReviewGate.formatReviewRequest', () => {
  let tmpDir;
  let gate;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-reviewgate-fmt-'));
    gate   = new FactCheckerReviewGate({ reviewsDir: tmpDir });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns a non-empty string', () => {
    const claims = [makeResult({ rawClaim: 'The Earth is round', claim_risk: 'NUMERICAL', evidence_strength: 'STRONG' })];
    const msg = gate.formatReviewRequest(claims, 'prod_fmt_001');
    assert.ok(typeof msg === 'string');
    assert.ok(msg.length > 0);
  });

  it('includes productionId in the message', () => {
    const claims = [makeResult()];
    const msg = gate.formatReviewRequest(claims, 'prod_fmt_002');
    assert.ok(msg.includes('prod_fmt_002'));
  });

  it('includes the claim text in the message', () => {
    const claims = [makeResult({ rawClaim: 'Water boils at 100 degrees Celsius' })];
    const msg = gate.formatReviewRequest(claims, 'prod_fmt_003');
    assert.ok(msg.includes('Water boils at 100 degrees Celsius'));
  });

  it('includes approve and reject command instructions', () => {
    const claims = [makeResult()];
    const msg = gate.formatReviewRequest(claims, 'prod_fmt_004');
    assert.ok(msg.includes('/approve'));
    assert.ok(msg.includes('/reject'));
  });

  it('includes all claims when multiple are provided', () => {
    const claims = [
      makeResult({ rawClaim: 'First claim' }),
      makeResult({ rawClaim: 'Second claim' }),
      makeResult({ rawClaim: 'Third claim' }),
    ];
    const msg = gate.formatReviewRequest(claims, 'prod_fmt_005');
    assert.ok(msg.includes('First claim'));
    assert.ok(msg.includes('Second claim'));
    assert.ok(msg.includes('Third claim'));
  });
});

// ── FactCheckerReviewGate.recordHumanDecision ─────────────────────────────────

describe('FactCheckerReviewGate.recordHumanDecision', () => {
  let tmpDir;
  let gate;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-reviewgate-rec-'));
    gate   = new FactCheckerReviewGate({ reviewsDir: tmpDir });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a decision file to reviewsDir', () => {
    const record = gate.recordHumanDecision({
      claimHash:    'abc123',
      decision:     'APPROVE',
      reviewer:     'alice',
      productionId: 'prod_rec_001',
    });
    const filePath = path.join(tmpDir, 'prod_rec_001_abc123.json');
    assert.ok(fs.existsSync(filePath), 'decision file should exist');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(data.decision, 'APPROVE');
    assert.equal(data.reviewer, 'alice');
  });

  it('returned record contains all required fields', () => {
    const record = gate.recordHumanDecision({
      claimHash:    'def456',
      decision:     'REJECT',
      reviewer:     'bob',
      productionId: 'prod_rec_002',
    });
    assert.equal(record.claimHash, 'def456');
    assert.equal(record.decision, 'REJECT');
    assert.equal(record.reviewer, 'bob');
    assert.ok(record.timestamp);
  });
});
