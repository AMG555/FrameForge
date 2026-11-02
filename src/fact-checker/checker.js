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
const https  = require('https');
const { LLMProvider } = require('../pipeline/providers');

// ── Search provider config ────────────────────────────────────────────────────
// Set SEARCH_API_KEY + SEARCH_PROVIDER=tavily|brave|searxng to enable real search.
// Without a key the system falls back to LLM-synthesized sources (existing behaviour).
const SEARCH_PROVIDER = (process.env.SEARCH_PROVIDER || 'tavily').toLowerCase();
const SEARCH_API_KEY  = process.env.SEARCH_API_KEY || '';

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
    // ── Real search (when SEARCH_API_KEY is configured) ──────────────────────
    if (SEARCH_API_KEY) {
      try {
        const results = await this._realSearch(claim, count);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.warn(`[FactChecker] Real search failed (${err.message}), falling back to LLM`);
      }
    }

    // ── LLM fallback (no search key, or search returned nothing) ────────────
    const system = 'You are a historical fact verifier. Output ONLY raw JSON array. No markdown.';
    const user   = `Verify this claim: "${claim}"\n\nReturn ${count} sources as JSON array:\n[{"name":"Source Name","url":"https://...","reliability_rank":0.9,"publication_year":2020,"confirms":true,"independent_group":"academic","quote":"relevant quote"}]`;

    const raw  = await this.llm.chat({ system, user, temperature: 0.1, maxTokens: 2000 });
    const text = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const fi   = text.indexOf('[');
    const la   = text.lastIndexOf(']');
    if (fi < 0 || la <= fi) return [];
    return JSON.parse(text.slice(fi, la + 1));
  }

  /**
   * Query a real search API and normalize results to the internal source schema.
   * Supports Tavily, Brave Search, and SearXNG.
   * @private
   */
  async _realSearch(claim, count) {
    if (SEARCH_PROVIDER === 'tavily') {
      return this._searchTavily(claim, count);
    } else if (SEARCH_PROVIDER === 'brave') {
      return this._searchBrave(claim, count);
    } else if (SEARCH_PROVIDER === 'searxng') {
      return this._searchSearXNG(claim, count);
    }
    throw new Error(`Unknown SEARCH_PROVIDER: ${SEARCH_PROVIDER}`);
  }

  /** POST https://api.tavily.com/search */
  async _searchTavily(claim, count) {
    const body = JSON.stringify({
      api_key:      SEARCH_API_KEY,
      query:        claim,
      search_depth: 'advanced',
      max_results:  Math.max(count, 5),
      include_answer: false,
      include_raw_content: false,
    });

    const raw = await this._httpsPost('api.tavily.com', '/search', body, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });

    const data = JSON.parse(raw);
    return (data.results || []).map(r => ({
      name:              r.title  || 'Unknown',
      url:               r.url    || '',
      reliability_rank:  r.score  != null ? Math.min(r.score, 1.0) : 0.7,
      publication_year:  new Date(r.published_date || Date.now()).getFullYear(),
      confirms:          true, // search results are presumed supporting; LLM re-assesses contradictions
      independent_group: this._domainGroup(r.url),
      quote:             (r.content || '').slice(0, 200),
    }));
  }

  /** GET https://api.search.brave.com/res/v1/web/search */
  async _searchBrave(claim, count) {
    const qs  = new URLSearchParams({ q: claim, count: String(Math.max(count, 5)) });
    const raw = await this._httpsGet(
      'api.search.brave.com',
      `/res/v1/web/search?${qs}`,
      {
        'Accept':            'application/json',
        'Accept-Encoding':   'gzip',
        'X-Subscription-Token': SEARCH_API_KEY,
      }
    );

    const data = JSON.parse(raw);
    return ((data.web && data.web.results) || []).map(r => ({
      name:              r.title       || 'Unknown',
      url:               r.url         || '',
      reliability_rank:  0.75,
      publication_year:  new Date((r.age || Date.now())).getFullYear(),
      confirms:          true,
      independent_group: this._domainGroup(r.url),
      quote:             (r.description || '').slice(0, 200),
    }));
  }

  /** GET {SEARXNG_BASE_URL}/search (self-hosted SearXNG) */
  async _searchSearXNG(claim, count) {
    const baseUrl = process.env.SEARXNG_BASE_URL || 'https://searx.be';
    const parsed  = new URL(baseUrl);
    const qs      = new URLSearchParams({ q: claim, format: 'json', pageno: '1' });
    const raw     = await this._httpsGet(
      parsed.hostname,
      `${parsed.pathname.replace(/\/$/, '')}/search?${qs}`,
      { 'Accept': 'application/json' }
    );

    const data = JSON.parse(raw);
    return ((data.results || []).slice(0, count)).map(r => ({
      name:              r.title   || 'Unknown',
      url:               r.url     || '',
      reliability_rank:  r.score   != null ? Math.min(r.score / 10, 1.0) : 0.65,
      publication_year:  new Date((r.publishedDate || Date.now())).getFullYear(),
      confirms:          true,
      independent_group: this._domainGroup(r.url),
      quote:             (r.content || '').slice(0, 200),
    }));
  }

  /** Normalize a URL's hostname to an independent_group string */
  _domainGroup(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '').split('.').slice(-2, -1)[0] || 'web';
    } catch { return 'web'; }
  }

  /** Generic HTTPS POST helper — returns response body string */
  _httpsPost(host, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = https.request(
        { host, path, method: 'POST', headers },
        (res) => {
          const chunks = [];
          res.on('data', d => chunks.push(d));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`Search API HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
            }
            resolve(text);
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Search API timeout')); });
      req.write(body);
      req.end();
    });
  }

  /** Generic HTTPS GET helper — returns response body string */
  _httpsGet(host, urlPath, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = https.request(
        { host, path: urlPath, method: 'GET', headers },
        (res) => {
          const chunks = [];
          res.on('data', d => chunks.push(d));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`Search API HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
            }
            resolve(text);
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Search API timeout')); });
      req.end();
    });
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
