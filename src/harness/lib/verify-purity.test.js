import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchHarnessBrowser } from './browser.mjs';
import { verifyScenePurity } from './verify-purity.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../test/fixtures');

describe('verify-purity.mjs (H5 Gate)', () => {
  it('reference scene passes 3-point purity test across all sampled timestamps', async () => {
    const { browser } = await launchHarnessBrowser();
    const refHtml = path.join(FIXTURES_DIR, 'reference-scene.html');

    const res = await verifyScenePurity({
      browser,
      htmlPath: refHtml,
      duration: 2.0,
    });
    await browser.close();

    assert.equal(res.passed, true, 'Reference scene must pass purity gate');
    assert.equal(res.timesTested, 9, 'Must test 9 sampled timestamps');
    assert.ok(res.framesSha256, 'Must generate frames_sha256 digest');
    for (const r of res.results) {
      assert.equal(r.ok, true, `Timestamp ${r.time}s must match on repeat and wander`);
      assert.equal(r.a, r.b, 'Repeat must match');
      assert.equal(r.a, r.c, 'Cold jump must match');
    }
  });

  it('deliberately broken scene (state leak + unseeded random) fails purity gate', async () => {
    const { browser } = await launchHarnessBrowser();
    const brokenHtml = path.join(FIXTURES_DIR, 'broken-scene.html');

    const res = await verifyScenePurity({
      browser,
      htmlPath: brokenHtml,
      duration: 2.0,
    });
    await browser.close();

    assert.equal(res.passed, false, 'Broken scene must fail purity gate');
    const failedResults = res.results.filter(r => !r.ok);
    assert.ok(failedResults.length > 0, 'Must have at least one failed verification point');
  });
});
