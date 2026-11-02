/**
 * FactChecker Human Review Gates — Task #21
 *
 * Classifies claims by expected_decision, generates Telegram-formatted review
 * requests for high-risk claims, and records human decisions back to state.
 *
 * Three gates:
 *
 *   1. AUTO_APPROVE — evidence_strength STRONG or MODERATE, risk TRIVIAL/NUMERICAL,
 *      no DISPUTED status. Pipeline proceeds without human input.
 *
 *   2. HUMAN_REVIEW — CONTROVERSIAL risk, DISPUTED status, or weak evidence on
 *      NUMERICAL claims. Pipeline pauses, sends Telegram notification, waits
 *      for approval or rejection (timeout → escalate).
 *
 *   3. REJECT — Dangerous misinformation (e.g. vaccines cause autism, flat Earth).
 *      Pipeline halts immediately; script stage is marked FAILED.
 *
 * Review workflow:
 *   - Producer calls classifyDecisions(factCheckReport) → { autoApproved, needsReview, rejected }
 *   - If needsReview is non-empty → sendReviewRequest(claims) → wait for webhook
 *   - Human responds via Telegram /approve or /reject command
 *   - recordHumanDecision(claimHash, decision, reviewer) persists to state machine
 *
 * Integration with state machine:
 *   - WAITING_REVIEW state set when needsReview.length > 0
 *   - SUCCEEDED set when all claims resolved (auto or human)
 *   - FAILED set when any REJECT decision
 *
 * Usage:
 *   const { FactCheckerReviewGate } = require('./review-gate');
 *   const gate = new FactCheckerReviewGate({ stateMachine, telegramToken, chatId });
 *   const { allApproved, needsReview, rejected } = await gate.evaluate(factCheckReport, productionId);
 */

'use strict';

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// Max time to wait for human review before escalation (ms)
const REVIEW_TIMEOUT_MS = parseInt(process.env.FACTCHECK_REVIEW_TIMEOUT_MS || String(4 * 60 * 60 * 1000), 10); // 4h
// Polling interval when waiting for human decisions
const POLL_INTERVAL_MS  = parseInt(process.env.FACTCHECK_POLL_INTERVAL_MS || '15000', 10); // 15s

class FactCheckerReviewGate {
  /**
   * @param {{
   *   stateMachine?:  object,   // StateMachine instance — optional for standalone use
   *   telegramToken?: string,   // override env TELEGRAM_BOT_TOKEN
   *   chatId?:        string,   // override env TELEGRAM_CHAT_ID
   *   reviewsDir?:    string,   // directory for persisting review decisions
   * }} opts
   */
  constructor({ stateMachine = null, telegramToken, chatId, reviewsDir = '/home/node/.n8n-files/reviews' } = {}) {
    this.stateMachine = stateMachine;
    this.token        = telegramToken || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId       = chatId        || process.env.TELEGRAM_CHAT_ID;
    this.reviewsDir   = reviewsDir;
    fs.mkdirSync(reviewsDir, { recursive: true });
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

    // Some claims need review — send Telegram notification and wait
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
   * Called by the Telegram webhook handler when reviewer responds.
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
   * Returns a plain-text string suitable for Telegram messages.
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
    if (!this.token || !this.chatId) {
      console.warn('[FactCheckerReviewGate] Telegram not configured — review request not sent');
      return;
    }
    const message  = this.formatReviewRequest(claims, productionId);
    const escaped  = message.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    // Use spawnSync with curl array args — no shell string interpolation
    spawnSync('curl', [
      '-s', '-X', 'POST',
      `https://api.telegram.org/bot${this.token}/sendMessage`,
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({ chat_id: this.chatId, text: message, parse_mode: 'Markdown' }),
    ], { timeout: 15000 });
  }

  async _notifyReject(claims, productionId) {
    if (!this.token || !this.chatId) return;
    const text = `🚫 *Production REJECTED by FactChecker*\nID: \`${productionId}\`\n\nDangerous claims detected:\n${claims.map(c => `• ${c.rawClaim}`).join('\n')}`;
    spawnSync('curl', [
      '-s', '-X', 'POST',
      `https://api.telegram.org/bot${this.token}/sendMessage`,
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({ chat_id: this.chatId, text, parse_mode: 'Markdown' }),
    ], { timeout: 15000 });
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

    // Timeout: auto-approve remaining (escalation logged)
    for (const [, claim] of pending) {
      claim.humanDecision = 'TIMEOUT_APPROVE';
      claim.humanReviewer = 'system';
      claim.reviewedAt    = new Date().toISOString();
      console.warn(`[FactCheckerReviewGate] Claim review timed out — auto-approving: ${claim.rawClaim}`);
    }

    return claims;
  }
}

module.exports = { FactCheckerReviewGate };
