/**
 * Fact Checker
 *
 * Risk-based claim verification with deterministic gates.
 *
 * Flow:
 *   extract claims → normalize → classify risk → retrieve evidence
 *   → assess independence → deterministic gate → cache result
 *
 * Risk levels:
 *   TRIVIAL     — basic dates/facts              → 1 source required
 *   NUMERICAL   — statistics/measurements        → 2+ sources required
 *   CONTROVERSIAL — disputed/sensitive topics    → 3+ authoritative sources
 *
 * Evidence strength:
 *   STRONG        — ≥2 high-quality independent sources
 *   MODERATE      — ≥required sources with ≥1 independent group
 *   WEAK          — insufficient quality or independence
 *   INSUFFICIENT  — timeout or too few sources
 *
 * Status:
 *   VERIFIED    → evidence_strength = STRONG
 *   SUPPORTED   → evidence_strength = MODERATE
 *   DISPUTED    → ≥2 independent contradictions
 *   INSUFFICIENT_EVIDENCE → timeout / too few
 *   REJECTED    → human review determined false
 *
 * Approval gates:
 *   HIGH risk: evidence_strength IN [STRONG, MODERATE] AND status != DISPUTED
 *   MEDIUM:    status != DISPUTED
 *   LOW:       any status except REJECTED
 *
 * Requirements: Req 3 (all 11 acceptance criteria)
 */

'use strict';

const crypto = require('crypto');
const { LLMProvider } = require('../pipeline/providers');

class FactChecker {
  constructor({ llm = null } = {}) {
    this.llm   = llm || new LLMProvider();
    this.cache = new Map(); // normalized_claim → ValidationResult
  }

  /**
   * Validate a single claim. Returns standardized decision object.
   * @param {string|object} claim
   * @param {object} [options]
   * @returns {Promise<{ decision: string, riskLevel: string, requiresHumanReview: boolean, evidence: Array }>}
   */
  async checkClaim(claim, options = {}) {
    const rawText = typeof claim === 'object' && claim !== null ? (claim.claim || claim.text || JSON.stringify(claim)) : String(claim);
    const report = await this.checkClaims([rawText]);
    const res = (report.results && report.results[0]) || {};
    const pass = this._gatePass(res);
    return {
      decision: pass ? 'APPROVED' : 'REQUIRES_REVIEW',
      riskLevel: res.claim_risk || 'TRIVIAL',
      requiresHumanReview: !pass,
      evidence: res.sources || [],
      ...res,
    };
  }

  /**
   * Validate all claims in a script. Returns { approved, flaggedClaims, report }.
   * @param {string[]} claims — plain text claim strings
   * @returns {Promise<FactCheckReport>}
   */
  async checkClaims(claims) {
    const results = [];
    for (const rawClaim of (claims || [])) {
      const normalized = this._normalizeClaim(rawClaim);
      const cacheKey   = this._hash(normalized);

      if (this.cache.has(cacheKey)) {
        results.push({ ...this.cache.get(cacheKey), rawClaim, fromCache: true });
        continue;
      }

      const result = await this._validateClaim(rawClaim, normalized);
      this.cache.set(cacheKey, result);
      results.push({ ...result, rawClaim });
    }

    const approved = this._applyGates(results);
    const flagged  = results.filter(r => !this._gatePass(r));

    return {
      approved,
      totalClaims:  results.length,
      flaggedClaims: flagged,
      results,
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  // ── Claim normalization ───────────────────────────────────────────────────

  _normalizeClaim(raw) {
    const str = typeof raw === 'object' && raw !== null ? (raw.claim || raw.text || JSON.stringify(raw)) : String(raw || '');
    return str
      .toLowerCase()
      .replace(/\b(approximately|about|around|roughly|nearly|over|under|at least|more than|less than)\b/g, '')
      .replace(/\b\d{1,3}(,\d{3})+\b/g, n => n.replace(/,/g, ''))  // 1,000 → 1000
      .replace(/\s+/g, ' ')
      .trim();
  }

  _hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
  }

  // ── Risk classification ───────────────────────────────────────────────────

  _classifyRisk(claim) {
    const lower = claim.toLowerCase();
    // CONTROVERSIAL patterns
    if (/\b(controversial|disputed|debate|theory|myth|fake|false|misinformation|claim)\b/.test(lower)) return 'CONTROVERSIAL';
    // NUMERICAL patterns
    if (/\b\d+\s*(percent|%|million|billion|years?|km|miles?|calories?|degrees?)\b/.test(lower)) return 'NUMERICAL';
    if (/\b(study|research|survey|data|statistics?|report)\b/.test(lower)) return 'NUMERICAL';
    // TRIVIAL
    return 'TRIVIAL';
  }

  _requiredSources(risk) {
    return { TRIVIAL: 1, NUMERICAL: 2, CONTROVERSIAL: 3 }[risk] || 2;
  }

  // ── Validation via LLM ────────────────────────────────────────────────────

  async _validateClaim(rawClaim, normalized) {
    const risk     = this._classifyRisk(normalized);
    const required = this._requiredSources(risk);

    let sources = [];
    try {
      sources = await Promise.race([
        this._querySources(rawClaim, required),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
      ]);
    } catch {
      return { normalized, claim_risk: risk, evidence_strength: 'INSUFFICIENT', status: 'INSUFFICIENT_EVIDENCE', sources: [], source_independence: 0 };
    }

    if (!sources || sources.length < required) {
      return { normalized, claim_risk: risk, evidence_strength: 'INSUFFICIENT', status: 'INSUFFICIENT_EVIDENCE', sources, source_independence: 0 };
    }

    const confirming    = sources.filter(s => s.confirms);
    const contradicting = sources.filter(s => !s.confirms);
    const independence  = new Set(sources.map(s => s.independent_group)).size;

    // DISPUTED gate
    if (contradicting.length >= 2 && independence >= 2) {
      return { normalized, claim_risk: risk, evidence_strength: 'WEAK', status: 'DISPUTED', sources, source_independence: independence };
    }

    // Evidence strength
    const highQualitySources = confirming.filter(s => (s.reliability_rank || 0.7) >= 0.9).length;
    let evidenceStrength;
    if (highQualitySources >= 2 && independence >= 2) {
      evidenceStrength = 'STRONG';
    } else if (confirming.length >= required && independence >= 1) {
      evidenceStrength = 'MODERATE';
    } else {
      evidenceStrength = 'WEAK';
    }

    const status = evidenceStrength === 'STRONG' ? 'VERIFIED' : evidenceStrength === 'MODERATE' ? 'SUPPORTED' : 'INSUFFICIENT_EVIDENCE';
    return { normalized, claim_risk: risk, evidence_strength: evidenceStrength, status, sources, source_independence: independence };
  }

  async _querySources(claim, count) {
    // Use LLM to generate source evidence (real sources would use a search API)
    const system = 'You are a historical fact verifier. Output ONLY raw JSON array. No markdown.';
    const user   = `Verify this claim: "${claim}"\n\nReturn ${count} sources as JSON array:\n[{"name":"Source Name","url":"https://...","reliability_rank":0.9,"publication_year":2020,"confirms":true,"independent_group":"academic","quote":"relevant quote"}]`;

    const raw  = await this.llm.chat({ system, user, temperature: 0.1, maxTokens: 2000 });
    const text = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const fi   = text.indexOf('[');
    const la   = text.lastIndexOf(']');
    if (fi < 0 || la <= fi) return [];
    return JSON.parse(text.slice(fi, la + 1));
  }

  // ── Approval gates ────────────────────────────────────────────────────────

  _gatePass(result) {
    const { claim_risk, evidence_strength, status } = result;
    if (status === 'REJECTED') return false;
    if (claim_risk === 'CONTROVERSIAL' || claim_risk === 'HIGH') {
      return ['STRONG', 'MODERATE'].includes(evidence_strength) && status !== 'DISPUTED';
    }
    if (claim_risk === 'NUMERICAL' || claim_risk === 'MEDIUM') {
      return status !== 'DISPUTED';
    }
    return true; // TRIVIAL/LOW: any status except REJECTED
  }

  _applyGates(results) {
    return results.every(r => this._gatePass(r));
  }

  /**
   * Generate a human-readable citation for a claim.
   */
  static formatCitation(source) {
    return `[${source.name}, ${source.publication_year}]`;
  }
}

module.exports = { FactChecker };
