import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchHarnessBrowser } from './browser.mjs';
import { verifySceneQuality } from './verify-quality.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../test/fixtures');

describe('verify-quality.mjs Closed-Loop QA Gate', () => {
  it('evaluates a reference scene with a passing score (>= 7.0)', async () => {
    const { browser } = await launchHarnessBrowser();
    const refHtml = path.join(FIXTURES_DIR, 'reference-scene.html');

    const res = await verifySceneQuality({
      browser,
      htmlPath: refHtml,
      duration: 2.0,
    });
    await browser.close();

    assert.equal(typeof res.overallScore, 'number');
    assert.ok(res.overallScore >= 7.0, `Reference scene should score >= 7.0, got ${res.overallScore}`);
    assert.equal(res.passed, true);
    assert.equal(res.sampledFrames.length, 5);
    assert.ok(res.worstFrames.length <= 3);
  });

  it('detects issues on deliberately broken scenes', async () => {
    const { browser } = await launchHarnessBrowser();
    const brokenHtml = path.join(FIXTURES_DIR, 'broken-scene.html');

    const res = await verifySceneQuality({
      browser,
      htmlPath: brokenHtml,
      duration: 2.0,
      width: 640,
      height: 360,
    });
    await browser.close();

    assert.equal(typeof res.overallScore, 'number');
    assert.ok(Array.isArray(res.worstFrames));
  });
});
