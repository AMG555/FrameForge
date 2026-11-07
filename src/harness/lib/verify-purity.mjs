/**
 * verify-purity.mjs — 3-Point History Leak & Purity Verification Gate
 *
 * Enforces the core invariant: Every frame must be a pure function of t.
 * Tests 3 points per timestamp:
 *   1. Hash at t (a)
 *   2. Immediate repeat at t (b)
 *   3. Wander off to (t + duration/2) % duration
 *   4. Cold jump back to t (c)
 * Condition: a === b && a === c.
 *
 * If a !== b, frame varies on repeated calls (unseeded randomness / unconstrained timers).
 * If a !== c, history leaked into the draw path (retained state, incremental physics).
 */

import { createHash } from 'crypto';
import { openPageWithVirtualClock, captureFrame } from './capture.mjs';

/**
 * Verify frame purity across a set of sampled timestamps.
 *
 * @param {object} opts
 * @param {object} opts.browser    Playwright browser instance
 * @param {string} opts.htmlPath   Path to HTML file
 * @param {number} [opts.duration] Scene duration (seconds, default reads window.DURATION)
 * @param {number[]} [opts.times]  Specific times to test (defaults to 9 sampled points)
 * @param {number} [opts.width=640]  Test render width (lower resolution is faster for hash comparison)
 * @param {number} [opts.height=360] Test render height
 * @returns {Promise<{
 *   passed: boolean,
 *   timesTested: number,
 *   results: Array<{ time: number, a: string, b: string, c: string, ok: boolean, failure?: string }>,
 *   framesSha256?: string
 * }>}
 */
export async function verifyScenePurity({
  browser,
  htmlPath,
  duration = null,
  times = null,
  width = null,
  height = null,
}) {
  // Initial page probe for dimensions
  const probe = await openPageWithVirtualClock(browser, htmlPath, { width: 1080, height: 1080 });
  const dims = await probe.evaluate(() => {
    const c = document.querySelector('canvas');
    return {
      w: c?.width || window.REEL?.width || 1080,
      h: c?.height || window.REEL?.height || 1080,
      dur: window.DURATION || window.REEL?.duration || 2.0,
    };
  });
  await probe.close();

  const resolvedWidth = width || dims.w;
  const resolvedHeight = height || dims.h;
  const resolvedDuration = duration || dims.dur;

  const page = await openPageWithVirtualClock(browser, htmlPath, {
    width: resolvedWidth,
    height: resolvedHeight,
  });

  const sampleTimes = times || [
    0.05 * resolvedDuration,
    0.15 * resolvedDuration,
    0.28 * resolvedDuration,
    0.40 * resolvedDuration,
    0.50 * resolvedDuration,
    0.62 * resolvedDuration,
    0.75 * resolvedDuration,
    0.88 * resolvedDuration,
    0.95 * resolvedDuration,
  ].map(t => parseFloat(t.toFixed(3)));

  async function getFrameHash(t) {
    const buf = await captureFrame(page, t, { type: 'image/png' });
    return createHash('sha256').update(buf).digest('hex').slice(0, 16);
  }

  const results = [];
  let allPassed = true;
  const hashDigest = createHash('sha256');

  for (const t of sampleTimes) {
    // 1. Initial render at t
    const a = await getFrameHash(t);

    // 2. Immediate repeat at t
    const b = await getFrameHash(t);

    // 3. Wander off to opposite half of timeline
    const wanderTime = parseFloat(((t + resolvedDuration / 2) % resolvedDuration).toFixed(3));
    await getFrameHash(wanderTime);

    // 4. Cold jump back to t
    const c = await getFrameHash(t);

    const ok = (a === b && a === c);
    if (!ok) allPassed = false;

    let failure = null;
    if (a !== b) failure = 'Non-deterministic: repeat call at same t gave different frame';
    else if (a !== c) failure = 'History leak: frame changed after rendering other timestamps';

    results.push({ time: t, a, b, c, ok, failure });
    hashDigest.update(a);
  }

  await page.close();

  return {
    passed: allPassed,
    timesTested: sampleTimes.length,
    results,
    framesSha256: hashDigest.digest('hex').slice(0, 16),
  };
}
