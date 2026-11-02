/**
 * Retry / Timeout / Error Policy
 *
 * Classifies errors as RETRYABLE, NON_RETRYABLE, or FATAL.
 * Applies exponential backoff with jitter for RETRYABLE errors.
 * Dead-letters jobs that exceed max attempts.
 * Stage timeouts enforced via Promise.race.
 *
 * Usage:
 *   const policy = new RetryPolicy();
 *   const result = await policy.executeStage('Research', async () => {
 *     return await doResearch();
 *   });
 */

'use strict';

// Stage timeouts in milliseconds
const STAGE_TIMEOUTS_MS = {
  Research:         5  * 60 * 1000,
  // Script with 32k max-token LLM calls can exceed 3 min on slower providers —
  // raised to 5 min to match Research.
  Script:           5  * 60 * 1000,
  Asset_Generation: 10 * 60 * 1000,
  Video_Rendering:  30 * 60 * 1000,
  Shorts_Extraction:10 * 60 * 1000,
  Quality_Check:    2  * 60 * 1000,
  Packaging:        1  * 60 * 1000,
  Publishing:       5  * 60 * 1000,
  // per-request timeouts
  HTTP_REQUEST:     30 * 1000,
  TTS:              2  * 60 * 1000,
  IMAGE_GENERATION: 3  * 60 * 1000,
  FFMPEG:           30 * 60 * 1000,
};

// Error classification patterns
const RETRYABLE_PATTERNS    = [/ECONNREFUSED/, /ETIMEDOUT/, /ECONNRESET/, /socket hang up/, /429/, /503/, /worker unavailable/, /rate limit/i, /timeout/i];
const NON_RETRYABLE_PATTERNS = [/JSON parse/i, /schema validation/i, /quality gate/i, /parse failed/i, /Too few scenes/i, /Too few claims/i];
const FATAL_PATTERNS         = [/401/, /403/, /Invalid credential/i, /Missing credential/i];

class RetryPolicy {
  constructor({ maxAttempts = 3, baseDelayMs = 10000 } = {}) {
    this.maxAttempts  = maxAttempts;
    this.baseDelayMs  = baseDelayMs;
  }

  classifyError(error) {
    const msg = String(error?.message || error);
    const code = String(error?.code || '');
    const combined = msg + ' ' + code;
    if (FATAL_PATTERNS.some(p => p.test(combined)))         return 'FATAL';
    if (NON_RETRYABLE_PATTERNS.some(p => p.test(combined))) return 'NON_RETRYABLE';
    if (RETRYABLE_PATTERNS.some(p => p.test(combined)))     return 'RETRYABLE';
    const status = error?.status || error?.statusCode;
    if (status === 401 || status === 403) return 'FATAL';
    if (status === 429 || status >= 500)  return 'RETRYABLE';
    if (status >= 400)                    return 'NON_RETRYABLE';
    return 'NON_RETRYABLE'; // conservative default
  }

  /**
   * Execute a stage function with timeout and retry.
   * @param {string} stageName
   * @param {() => Promise<any>} fn
   * @returns {Promise<any>}
   */
  async executeStage(stageName, fn) {
    const timeoutMs = STAGE_TIMEOUTS_MS[stageName] || (30 * 60 * 1000);
    let lastError;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this._withTimeout(fn(), timeoutMs, stageName);
      } catch (err) {
        lastError = err;
        const errorClass = this.classifyError(err);

        if (errorClass === 'FATAL') {
          throw Object.assign(err, { errorClass: 'FATAL', stageName, attempt });
        }

        if (errorClass === 'NON_RETRYABLE') {
          throw Object.assign(err, { errorClass: 'NON_RETRYABLE', stageName, attempt });
        }

        // RETRYABLE
        if (attempt < this.maxAttempts) {
          const delay = this._backoffDelay(attempt);
          console.warn(`[RetryPolicy] ${stageName} attempt ${attempt}/${this.maxAttempts} failed (RETRYABLE): ${err.message} — retry in ${delay}ms`);
          await this._sleep(delay);
        }
      }
    }

    const deadLetterErr = Object.assign(lastError, {
      errorClass: 'DEAD_LETTER',
      stageName,
      attempt: this.maxAttempts,
    });
    console.error(`[RetryPolicy] ${stageName} dead-lettered after ${this.maxAttempts} attempts: ${lastError.message}`);
    throw deadLetterErr;
  }

  /**
   * Execute a single operation (not a stage) with timeout only.
   * No retry — callers handle that via executeStage.
   */
  async withTimeout(fn, timeoutMs, label = 'operation') {
    return this._withTimeout(fn, timeoutMs, label);
  }

  _withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(Object.assign(new Error(`${label} timed out after ${ms}ms`), { code: 'ETIMEDOUT' }));
      }, ms);
      Promise.resolve(promise).then(
        v  => { clearTimeout(timer); resolve(v); },
        e  => { clearTimeout(timer); reject(e); }
      );
    });
  }

  _backoffDelay(attempt) {
    // Exponential with full jitter: random(0, baseDelay * 2^attempt)
    const cap = this.baseDelayMs * Math.pow(2, attempt);
    return Math.floor(Math.random() * cap);
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { RetryPolicy, STAGE_TIMEOUTS_MS };
