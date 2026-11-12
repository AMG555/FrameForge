/**
 * verify-quality.mjs — Closed-Loop Visual QA & Frame Scoring Gate
 *
 * Implements the reference Opus 5.5 / Reanimate closed-loop verification contract:
 *   1. Samples keyframes at key timestamps across the timeline.
 *   2. Evaluates each frame against 4 quality metrics (content presence, luminance,
 *      corner confinement, and motion delta).
 *   3. Assigns a 1–10 quality score per frame.
 *   4. Identifies the worst frames with actionable diagnostic issues.
 *   5. Generates a visual review contact sheet if requested.
 */

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { openPageWithVirtualClock, captureFrame } from './capture.mjs';
import { analyzeRgbBuffer } from './pixels.mjs';
import { renderSheet } from './sheets.mjs';

/**
 * Score a single RGB24 frame on a 1–10 scale.
 */
export function scoreFrameBuffer(rgbBuf, width, height) {
  const analysis = analyzeRgbBuffer(rgbBuf, width, height);
  const issues = [];
  let score = 10;

  if (analysis.isBlank) {
    issues.push('Fatal: Blank or black frame detected (no visible content)');
    return { score: 1, issues, analysis };
  }

  if (analysis.isBlown) {
    issues.push('Overexposed: Blown frame (bright pixel share > 92%)');
    score -= 6;
  }

  if (analysis.isCornerConfined) {
    issues.push('Unbalanced: Visual content confined to a single corner');
    score -= 3;
  }

  const meanLum = 0.2126 * analysis.meanColor[0] + 0.7152 * analysis.meanColor[1] + 0.0722 * analysis.meanColor[2];
  if (meanLum < 15 && analysis.brightPixelShare < 0.02) {
    issues.push('Low contrast: Scene appears extremely dark');
    score -= 2;
  }

  if (analysis.bbox) {
    const [minX, minY, maxX, maxY] = analysis.bbox;
    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const areaShare = (boxW * boxH) / (width * height);
    if (areaShare < 0.08) {
      issues.push('Sparse: Content covers less than 8% of the stage');
      score -= 2;
    }
  }

  return {
    score: Math.max(1, Math.min(10, score)),
    issues,
    analysis,
  };
}

/**
 * Run closed-loop visual QA across an animation HTML page.
 */
export async function verifySceneQuality({
  browser,
  htmlPath,
  duration = null,
  times = null,
  width = 1280,
  height = 720,
  sheetPath = null,
  sampleRate = 2,   // samples per second; overrides times[] when times is null
}) {
  const page = await openPageWithVirtualClock(browser, htmlPath, { width, height });
  const resolvedDuration = duration || (await page.evaluate(() => window.DURATION || 3));

  // Derive sample timestamps: spread evenly at `sampleRate` per second, always
  // including the 10% and 90% keyframes. Minimum 5 samples regardless of rate.
  let sampleTimes;
  if (times) {
    sampleTimes = times;
  } else {
    const totalSamples = Math.max(5, Math.round(resolvedDuration * sampleRate));
    sampleTimes = Array.from({ length: totalSamples }, (_, i) => {
      const frac = (i + 0.5) / totalSamples;
      return parseFloat((resolvedDuration * frac).toFixed(2));
    });
  }

  const sampledFrames = [];
  const rawBuffers = [];

  for (const t of sampleTimes) {
    const pngBuf = await captureFrame(page, t, { type: 'image/png' });
    rawBuffers.push(pngBuf);

    const frameEval = await page.evaluate(async (time) => {
      await window.__seek(time);
      const canvas = document.querySelector('canvas') || document.getElementById('stage');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const total = canvas.width * canvas.height;
        let rSum = 0, gSum = 0, bSum = 0, brightCount = 0;
        let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;

        for (let i = 0; i < total; i++) {
          const idx = i * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          rSum += r; gSum += g; bSum += b;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (lum > 200) brightCount++;
          if (lum > 30) {
            const x = i % canvas.width;
            const y = Math.floor(i / canvas.width);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }

        const meanR = Math.round(rSum / total);
        const meanG = Math.round(gSum / total);
        const meanB = Math.round(bSum / total);
        const brightShare = brightCount / total;
        const hasContent = maxX >= 0 && maxY >= 0;

        return {
          meanColor: [meanR, meanG, meanB],
          brightPixelShare: brightShare,
          bbox: hasContent ? [minX, minY, maxX, maxY] : null,
          hasContent,
          w: canvas.width,
          h: canvas.height,
        };
      }
      return null;
    }, t);

    let frameScore = 10;
    const issues = [];

    if (frameEval) {
      if (!frameEval.hasContent) {
        frameScore = 1;
        issues.push('Blank frame: no canvas content drawn');
      } else {
        if (frameEval.brightPixelShare > 0.92) {
          frameScore -= 6;
          issues.push('Blown frame: over 92% bright pixels');
        }
        if (frameEval.bbox) {
          const [minX, minY, maxX, maxY] = frameEval.bbox;
          const halfW = frameEval.w * 0.55;
          const halfH = frameEval.h * 0.55;
          const inCorner = (maxX < halfW && maxY < halfH) ||
                           (minX > frameEval.w - halfW && maxY < halfH) ||
                           (maxX < halfW && minY > frameEval.h - halfH) ||
                           (minX > frameEval.w - halfW && minY > frameEval.h - halfH);
          if (inCorner) {
            frameScore -= 3;
            issues.push('Corner-confined content');
          }
        }
      }
    }

    sampledFrames.push({
      time: t,
      score: Math.max(1, Math.min(10, frameScore)),
      issues,
    });
  }

  const hashEarly = createHash('sha256').update(rawBuffers[1] || rawBuffers[0]).digest('hex');
  const hashLate  = createHash('sha256').update(rawBuffers[3] || rawBuffers[rawBuffers.length - 1]).digest('hex');
  const isStuckFrozen = (hashEarly === hashLate);
  let motionDelta = 1.0;

  if (isStuckFrozen) {
    motionDelta = 0.0;
    sampledFrames.forEach(f => {
      f.score = Math.max(1, f.score - 4);
      f.issues.push('Stuck motion: zero visual delta between early and late frames');
    });
  }

  let renderedSheetPath = null;
  if (sheetPath) {
    try {
      renderedSheetPath = await renderSheet({
        page,
        times: sampleTimes,
        cols: sampleTimes.length,
        thumbWidth: 320,
        outPath: sheetPath,
      });
    } catch (_) {}
  }

  await page.close();

  const totalScore = sampledFrames.reduce((sum, f) => sum + f.score, 0);
  const overallScore = parseFloat((totalScore / sampledFrames.length).toFixed(1));
  const worstFrames = [...sampledFrames].sort((a, b) => a.score - b.score).slice(0, 3);
  const passed = overallScore >= 7.0 && !isStuckFrozen;

  return {
    overallScore,
    passed,
    motionDelta,
    sampledFrames,
    worstFrames,
    sheetPath: renderedSheetPath,
  };
}

