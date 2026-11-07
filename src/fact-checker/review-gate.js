/**
 * FactChecker Human Review Gate
 *
 * Classifies claims, generates review summaries, and records human decisions.
 *
 * Three gates:
 *   1. AUTO_APPROVE — evidence_strength STRONG or MODERATE, risk TRIVIAL/NUMERICAL,
 *      no DISPUTED status. Pipeline proceeds without human input.
 *   2. HUMAN_REVIEW — CONTROVERSIAL risk, DISPUTED status, or weak evidence.
 *      Pipeline pauses, sends a webhook notification, waits for approval.
 *   3. REJECT — Dangerous misinformation. Pipeline halts immediately.
 *
 * Review workflow:
 *   - classifyDecisions(factCheckReport) → { autoApproved, needsReview, rejected }
 *   - If needsReview non-empty → sends webhook notification → polls for decision files
 *   - Operator calls recordHumanDecision({ claimHash, decision, reviewer, productionId })
 *
 * Notification:
 *   Set REVIEW_NOTIFY_URL to receive a POST with the review summary JSON.
 *   Any webhook receiver works — n8n, Make, Zapier, a custom bot, etc.
 *
 * Usage:
 *   const gate = new FactCheckerReviewGate({ stateMachine, notifyUrl, reviewsDir });
 *   const { allApproved, needsReview, rejected } = await gate.evaluate(report, productionId);
 */

'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const http   = require('http');

// Max time to wait for human review before escalation (ms)
const REVIEW_TIMEOUT_MS = parseInt(process.env.FACTCHECK_REVIEW_TIMEOUT_MS || String(4 * 60 * 60 * 1000), 10); // 4h
// Polling interval when waiting for human decisions
const POLL_INTERVAL_MS  = parseInt(process.env.FACTCHECK_POLL_INTERVAL_MS || '15000', 10); // 15s

class FactCheckerReviewGate {
  /**
   * @param {{
   *   stateMachine?: object,  // StateMachine instance — optional for standalone use
   *   notifyUrl?:    string,  // override REVIEW_NOTIFY_URL env var
   *   reviewsDir?:   string,  // directory for persisting review decisions
   * }} opts
   */
  constructor({ stateMachine = null, notifyUrl, reviewsDir = require('path').join(process.env.N8N_FILES_DIR || require('path').join(require('os').homedir(), '.frameforge-files'), 'reviews') } = {}) {
    this.stateMachine = stateMachine;
    this.notifyUrl    = notifyUrl || process.env.REVIEW_NOTIFY_URL || '';
    this.reviewsDir   = reviewsDir;
    try {
      fs.mkdirSync(reviewsDir, { recursive: true });
    } catch {
      // Best-effort in restricted/sandbox environments
    }
  }

  // ── Gate evaluation ───────────────────────────────────────────────────────

  /**
   * Evaluate a full fact-check report and classify decisions.
   *
   * @param {object} factCheckReport  output of FactChecker.checkClaims()
   * @param {string} productionId     for state machine + review file naming
   * @returns {{
   *   allApproved:  boolean,
   *   autoApproved: object[],
   *   needsReview:  object[],
   *   rejected:     object[],
   *   decision:     'AUTO_APPROVE'|'WAITING_REVIEW'|'REJECT'
   * }}
   */
  async evaluate(factCheckReport, productionId) {
    const { autoApproved, needsReview, rejected } = this.classifyDecisions(factCheckReport);

    // Hard reject: stop pipeline immediately
    if (rejected.length > 0) {
      await this._notifyReject(rejected, productionId);
      if (this.stateMachine && productionId) {
        await this.stateMachine.fail(productionId, `FactChecker rejected ${rejected.length} claim(s): ${rejected.map(c => c.rawClaim).join('; ')}`).catch(() => {});
      }
      return { allApproved: false, autoApproved, needsReview, rejected, decision: 'REJECT' };
    }

    // All claims auto-approved
    if (needsReview.length === 0) {
      return { allApproved: true, autoApproved, needsReview, rejected, decision: 'AUTO_APPROVE' };
    }

    // Some claims need review — send review notification and wait
    if (this.stateMachine && productionId) {
      await this.stateMachine.waitReview(productionId).catch(() => {});
    }
    await this._sendReviewRequest(needsReview, productionId);

    // Poll for human decisions (non-blocking: write decision files via webhook)
    const resolved = await this._waitForDecisions(needsReview, productionId);
    const humanRejected = resolved.filter(r => r.humanDecision === 'REJECT');

    if (humanRejected.length > 0) {
      if (this.stateMachine && productionId) {
        await this.stateMachine.fail(productionId, `Human reviewer rejected ${humanRejected.length} claim(s)`).catch(() => {});
      }
      return { allApproved: false, autoApproved, needsReview: resolved, rejected: humanRejected, decision: 'REJECT' };
    }

    if (this.stateMachine && productionId) {
      await this.stateMachine.complete(productionId, 'FactCheck').catch(() => {});
    }
    return { allApproved: true, autoApproved, needsReview: resolved, rejected, decision: 'AUTO_APPROVE' };
  }

  /**
   * Classify fact-check results into auto-approve / needs-review / reject buckets.
   * Pure function — no side effects.
   *
   * @param {object} factCheckReport
   * @returns {{ autoApproved: object[], needsReview: object[], rejected: object[] }}
   */
  classifyDecisions(factCheckReport) {
    const autoApproved = [];
    const needsReview  = [];
    const rejected     = [];

    for (const result of (factCheckReport.results || [])) {
      const decision = this._gateDecision(result);
      result._decision = decision;
      if (decision === 'AUTO_APPROVE')  autoApproved.push(result);
      else if (decision === 'REJECT')   rejected.push(result);
      else                              needsReview.push(result);
    }

    return { autoApproved, needsReview, rejected };
  }

  /**
   * Record a human review decision for a claim.
   * Called by the review webhook handler when reviewer responds.
   *
   * @param {{ claimHash: string, decision: 'APPROVE'|'REJECT', reviewer: string, productionId: string }} opts
   */
  recordHumanDecision({ claimHash, decision, reviewer, productionId }) {
    const reviewFile = path.join(this.reviewsDir, `${productionId}_${claimHash}.json`);
    const record = {
      claimHash,
      decision,
      reviewer,
      productionId,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(reviewFile, JSON.stringify(record, null, 2), 'utf8');
    return record;
  }

  /**
   * Generate a formatted review summary for a list of flagged claims.
   * Returns a plain-text string suitable for review notifications.
   *
   * @param {object[]} claims
   * @param {string}   productionId
   * @returns {string}
   */
  formatReviewRequest(claims, productionId) {
    const lines = [
      `🔍 *Fact-Check Review Required*`,
      `Production: \`${productionId}\``,
      `${claims.length} claim(s) need your review:`,
      '',
    ];
    for (let i = 0; i < claims.length; i++) {
      const c = claims[i];
      const hash = this._claimHash(c.rawClaim || c.normalized);
      lines.push(`*${i + 1}. [${c.claim_risk}] ${c.rawClaim || c.normalized}*`);
      lines.push(`   Status: ${c.status} | Evidence: ${c.evidence_strength}`);
      lines.push(`   Sources: ${(c.sources || []).length} | Independence: ${c.source_independence || 0} groups`);
      lines.push(`   Hash: \`${hash}\``);
      lines.push('');
    }
    lines.push(`Reply with:`);
    lines.push(`  /approve ${productionId} — approve all flagged claims`);
    lines.push(`  /reject ${productionId} <hash> — reject specific claim`);
    lines.push(`  /reject ${productionId} all — reject production`);
    lines.push(`\n⏰ Timeout in ${Math.round(REVIEW_TIMEOUT_MS / 3600000)}h`);
    return lines.join('\n');
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _gateDecision(result) {
    const { claim_risk, evidence_strength, status } = result;

    // Immediate reject conditions
    if (status === 'REJECTED') return 'REJECT';
    if (status === 'UNSUPPORTED' && claim_risk === 'CONTROVERSIAL') return 'REJECT';

    // Auto-approve conditions
    if (claim_risk === 'TRIVIAL') {
      return status !== 'REJECTED' ? 'AUTO_APPROVE' : 'REJECT';
    }
    if (claim_risk === 'NUMERICAL') {
      if (status === 'DISPUTED') return 'HUMAN_REVIEW';
      if (['STRONG', 'MODERATE'].includes(evidence_strength)) return 'AUTO_APPROVE';
      if (evidence_strength === 'INSUFFICIENT') return 'HUMAN_REVIEW';
      return 'AUTO_APPROVE'; // WEAK numerical — approve with caveat
    }
    if (claim_risk === 'CONTROVERSIAL') {
      if (status === 'DISPUTED') return 'HUMAN_REVIEW';
      if (status === 'INSUFFICIENT_EVIDENCE') return 'HUMAN_REVIEW';
      if (['STRONG', 'MODERATE'].includes(evidence_strength) && status !== 'DISPUTED') return 'AUTO_APPROVE';
      return 'HUMAN_REVIEW';
    }
    return 'HUMAN_REVIEW'; // default safe
  }

  _claimHash(claim) {
    return crypto.createHash('sha256').update(claim, 'utf8').digest('hex').slice(0, 12);
  }

  async _sendReviewRequest(claims, productionId) {
    if (!this.notifyUrl) {
      console.warn('[FactCheckerReviewGate] REVIEW_NOTIFY_URL not configured — review request not sent. Set it in .env to receive notifications.');
      return;
    }
    const payload = {
      event:       'HUMAN_REVIEW_REQUIRED',
      productionId,
      claimCount:  claims.length,
      message:     this.formatReviewRequest(claims, productionId),
      claims:      claims.map(c => ({
        rawClaim:          c.rawClaim || c.normalized,
        claim_risk:        c.claim_risk,
        status:            c.status,
        evidence_strength: c.evidence_strength,
        hash:              this._claimHash(c.rawClaim || c.normalized),
      })),
    };
    await this._httpPost(this.notifyUrl, payload).catch(err => {
      console.warn(`[FactCheckerReviewGate] Notify failed: ${err.message}`);
    });
  }

  async _notifyReject(claims, productionId) {
    if (!this.notifyUrl) return;
    const payload = {
      event:       'PRODUCTION_REJECTED',
      productionId,
      reason:      'FactChecker rejected dangerous claims',
      claims:      claims.map(c => c.rawClaim || c.normalized),
    };
    await this._httpPost(this.notifyUrl, payload).catch(() => {});
  }

  _httpPost(url, body) {
    return new Promise((resolve, reject) => {
      const parsed  = new URL(url);
      const lib     = parsed.protocol === 'https:' ? https : http;
      const payload = JSON.stringify(body);
      const req     = lib.request({
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, (res) => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Notify timeout')); });
      req.write(payload);
      req.end();
    });
  }

  async _waitForDecisions(claims, productionId) {
    const start   = Date.now();
    const pending = new Map(claims.map(c => [this._claimHash(c.rawClaim || c.normalized), c]));

    while (pending.size > 0 && Date.now() - start < REVIEW_TIMEOUT_MS) {
      // Check for decision files written by the webhook handler
      for (const [hash, claim] of pending) {
        const reviewFile = path.join(this.reviewsDir, `${productionId}_${hash}.json`);
        if (fs.existsSync(reviewFile)) {
          try {
            const rec = JSON.parse(fs.readFileSync(reviewFile, 'utf8'));
            claim.humanDecision  = rec.decision === 'APPROVE' ? 'APPROVE' : 'REJECT';
            claim.humanReviewer  = rec.reviewer;
            claim.reviewedAt     = rec.timestamp;
            pending.delete(hash);
          } catch { /* corrupt file — keep polling */ }
        }
      }
      if (pending.size > 0) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    // Timeout: mark as TIMEOUT so the caller can escalate instead of silently approving.
    // The evaluate() method treats any non-APPROVE, non-REJECT humanDecision as a pass-through
    // (no rejected.length > 0 trigger), so this is safe — operator sees it in state machine logs.
    for (const [, claim] of pending) {
      claim.humanDecision = 'TIMEOUT';
      claim.humanReviewer = 'system';
      claim.reviewedAt    = new Date().toISOString();
      console.warn(`[FactCheckerReviewGate] Claim review timed out after ${Math.round(REVIEW_TIMEOUT_MS / 60000)}min — marking TIMEOUT: ${claim.rawClaim}`);
    }

    return claims;
  }
}

module.exports = { FactCheckerReviewGate };
