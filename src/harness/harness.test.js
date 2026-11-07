import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { doctorBrowser, launchHarnessBrowser } from './lib/browser.mjs';
import { renderFrameJobs } from './lib/jobs.mjs';
import { verifyScenePurity } from './lib/verify-purity.mjs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, 'test/fixtures');
const TMP_OUT = path.resolve(__dirname, '../../output/harness_test_' + Date.now());

describe('Code-Driven Video Harness Integration', () => {
  it('doctor resolves Chrome/Chromium and probes WebGL context', async () => {
    const doc = await doctorBrowser();
    assert.equal(doc.status, 'ok');
    assert.ok(doc.chromePath, 'Must report chrome executable path');
    assert.equal(doc.webgl, true, 'WebGL must be available');
  });

  it('renders reference scene with identical frames_sha256 across separate runs', async () => {
    const { browser } = await launchHarnessBrowser();
    const refHtml = path.join(FIXTURES_DIR, 'reference-scene.html');

    const run1 = await verifyScenePurity({ browser, htmlPath: refHtml, duration: 1.0 });
    const run2 = await verifyScenePurity({ browser, htmlPath: refHtml, duration: 1.0 });
    await browser.close();

    assert.equal(run1.passed, true);
    assert.equal(run2.passed, true);
    assert.equal(run1.framesSha256, run2.framesSha256, 'Two runs must produce identical frames_sha256');
  });

  it('resumes interrupted frame queue and repairs truncated (<1000 byte) frames', async () => {
    fs.mkdirSync(TMP_OUT, { recursive: true });
    const framesDir = path.join(TMP_OUT, 'frames');
    fs.mkdirSync(framesDir, { recursive: true });

    // Pre-create frame 0 as truncated (300 bytes)
    const truncatedFrame = path.join(framesDir, 'f000000.jpg');
    fs.writeFileSync(truncatedFrame, Buffer.alloc(300, 42));

    const { browser } = await launchHarnessBrowser();
    const refHtml = path.join(FIXTURES_DIR, 'reference-scene.html');

    // Render 3 frames (0, 1, 2)
    const res = await renderFrameJobs({
      browser,
      htmlPath: refHtml,
      framesDir,
      first: 0,
      last: 2,
      fps: 30,
      workers: 2,
      width: 320,
      height: 320,
      format: 'jpg',
    });
    await browser.close();

    assert.equal(res.total, 3);
    assert.equal(res.rendered, 3, 'Truncated frame 0 must be re-rendered along with 1 and 2');

    const stat0 = fs.statSync(truncatedFrame);
    assert.ok(stat0.size >= 1000, 'Frame 0 must now be a valid JPEG >= 1000 bytes');

    // Run again with resume: all 3 should be skipped
    const { browser: browser2 } = await launchHarnessBrowser();
    const resResume = await renderFrameJobs({
      browser: browser2,
      htmlPath: refHtml,
      framesDir,
      first: 0,
      last: 2,
      fps: 30,
      workers: 2,
      width: 320,
      height: 320,
      format: 'jpg',
    });
    await browser2.close();

    assert.equal(resResume.rendered, 0, 'No frames rendered on complete resume');
    assert.equal(resResume.skipped, 3, 'All 3 valid frames skipped');

    // Cleanup
    try { fs.rmSync(TMP_OUT, { recursive: true, force: true }); } catch (_) {}
  });

  it('storyboard validator rejects shot without an EVENT', () => {
    const validatorScript = path.resolve(__dirname, '../../plugins/video-pipeline/skills/video-pipeline/assets/project/scripts/storyboard-validator.mjs');
    const badStoryboard = [
      '# STORYBOARD.md',
      '## Shot 1 — Intro',
      '- start: 0.0',
      '- end: 5.0',
      '- transition_in: cut',
      '- transition_out: cut',
      // Missing event line!
      '- reads:',
      '  - 0.0–5.0: Viewer enjoys the view.',
    ].join('\n');

    const tmpSb = path.join(FIXTURES_DIR, 'bad_storyboard.md');
    fs.writeFileSync(tmpSb, badStoryboard, 'utf8');

    const res = spawnSync('node', [validatorScript, tmpSb], { encoding: 'utf8' });
    try { fs.unlinkSync(tmpSb); } catch (_) {}

    assert.equal(res.status, 1, 'Validator must exit with code 1 for missing event');
  });
});
