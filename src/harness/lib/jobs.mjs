/**
 * jobs.mjs — Resumable, Atomic Frame Queue & Worker Pool
 *
 * Implements atomic writes (.tmp + renameSync) and corruption checks (<1000 bytes)
 * so interrupted renders can resume without re-rendering valid frames or trusting truncated ones.
 */

import fs from 'fs';
import path from 'path';
import { openPageWithVirtualClock, captureFrame } from './capture.mjs';

/**
 * Render a frame range across a pool of parallel Playwright pages.
 *
 * @param {object} opts
 * @param {object} opts.browser         Playwright Browser instance
 * @param {string} opts.htmlPath        Path to index.html or studio.html
 * @param {string} opts.framesDir       Directory where frame files land
 * @param {number} opts.first           First frame index (0-based)
 * @param {number} opts.last            Last frame index (inclusive)
 * @param {number} opts.fps             Frames per second
 * @param {number} [opts.workers=4]     Number of parallel worker pages
 * @param {number} [opts.width=1920]    Frame width
 * @param {number} [opts.height=1080]   Frame height
 * @param {string} [opts.format='jpg']  'jpg' or 'png'
 * @param {number} [opts.quality=0.94]  JPEG quality
 * @param {function} [opts.onProgress]  (done, total, frameIndex) => void
 * @returns {Promise<{ total: number, rendered: number, skipped: number, frames: string[] }>}
 */
export async function renderFrameJobs({
  browser,
  htmlPath,
  framesDir,
  first = 0,
  last,
  fps = 30,
  workers = 4,
  width = 1920,
  height = 1080,
  format = 'jpg',
  quality = 0.94,
  onProgress = null,
}) {
  fs.mkdirSync(framesDir, { recursive: true });

  const ext = format === 'png' ? 'png' : 'jpg';
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

  const todo = [];
  let skipped = 0;

  for (let i = first; i <= last; i++) {
    const filename = `f${String(i).padStart(6, '0')}.${ext}`;
    const targetFile = path.join(framesDir, filename);

    let existsAndValid = false;
    try {
      if (fs.existsSync(targetFile)) {
        const stat = fs.statSync(targetFile);
        if (stat.size >= 1000) {
          existsAndValid = true;
        }
      }
    } catch (_) {}

    if (existsAndValid) {
      skipped++;
    } else {
      todo.push(i);
    }
  }

  const totalFrames = last - first + 1;
  if (todo.length === 0) {
    return {
      total: totalFrames,
      rendered: 0,
      skipped,
      frames: fs.readdirSync(framesDir).filter(f => f.startsWith('f') && f.endsWith(`.${ext}`)).map(f => path.join(framesDir, f)),
    };
  }

  const workerCount = Math.min(workers, todo.length);
  const pages = await Promise.all(
    Array.from({ length: workerCount }, () =>
      openPageWithVirtualClock(browser, htmlPath, { width, height })
    )
  );

  let nextIdx = 0;
  let doneCount = skipped;

  await Promise.all(
    pages.map(async (page) => {
      while (true) {
        let frameIdx;
        if (nextIdx < todo.length) {
          frameIdx = todo[nextIdx++];
        } else {
          break;
        }

        const t = frameIdx / fps;
        const filename = `f${String(frameIdx).padStart(6, '0')}.${ext}`;
        const targetFile = path.join(framesDir, filename);
        const tmpFile = `${targetFile}.tmp`;

        let buf = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            buf = await captureFrame(page, t, { type: mimeType, quality });
            if (buf && buf.length > 500) break;
          } catch (err) {
            if (attempt === 2) throw err;
            await new Promise(r => setTimeout(r, 80 * (attempt + 1)));
          }
        }
        if (!buf || buf.length <= 500) {
          throw new Error(`Frame ${frameIdx} captured corrupted or empty image (${buf ? buf.length : 0} bytes)`);
        }

        // Atomic write: write to temp file then rename
        fs.writeFileSync(tmpFile, buf);
        fs.renameSync(tmpFile, targetFile);

        doneCount++;
        if (onProgress) {
          onProgress(doneCount, totalFrames, frameIdx);
        }
      }
      await page.close();
    })
  );

  const allFrames = fs.readdirSync(framesDir)
    .filter(f => f.startsWith('f') && f.endsWith(`.${ext}`))
    .sort()
    .map(f => path.join(framesDir, f));

  return {
    total: totalFrames,
    rendered: todo.length,
    skipped,
    frames: allFrames,
  };
}

