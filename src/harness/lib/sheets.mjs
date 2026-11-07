/**
 * sheets.mjs — Visual Review Artifact Compositor
 *
 * Generates contact sheets, motion strips, full-res crops, and 4-keyframe storyboards
 * for human/agent review before full encode.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { captureFrame } from './capture.mjs';

function pad6(n) {
  return String(n).padStart(6, '0');
}

/**
 * Render contact sheet of given timestamps.
 */
export async function renderSheet({
  page,
  times,
  cols = 6,
  thumbWidth = 320,
  aspectRatio = 16 / 9,
  outPath,
}) {
  const thumbHeight = Math.round(thumbWidth / aspectRatio);
  const rows = Math.ceil(times.length / cols);

  const tmpDir = path.join(path.dirname(outPath), `_sheet_tmp_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  for (let i = 0; i < times.length; i++) {
    const buf = await captureFrame(page, times[i]);
    fs.writeFileSync(path.join(tmpDir, `f_${pad6(i)}.png`), buf);
  }

  const res = spawnSync('ffmpeg', [
    '-y',
    '-i', path.join(tmpDir, 'f_%06d.png'),
    '-vf', `scale=${thumbWidth}:${thumbHeight},tile=${cols}x${rows}`,
    '-q:v', '3',
    outPath,
  ]);

  fs.rmSync(tmpDir, { recursive: true, force: true });

  if (res.status !== 0) {
    throw new Error(`Sheet generation failed: ${res.stderr?.toString()}`);
  }

  return outPath;
}

/**
 * Render motion strip: every frame across a time range [start, end].
 */
export async function renderStrip({
  page,
  start,
  end,
  fps = 30,
  thumbWidth = 320,
  aspectRatio = 16 / 9,
  outPath,
}) {
  const thumbHeight = Math.round(thumbWidth / aspectRatio);
  const startF = Math.round(start * fps);
  const endF = Math.round(end * fps);
  const count = Math.max(1, endF - startF + 1);

  const tmpDir = path.join(path.dirname(outPath), `_strip_tmp_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  for (let i = 0; i < count; i++) {
    const t = (startF + i) / fps;
    const buf = await captureFrame(page, t);
    fs.writeFileSync(path.join(tmpDir, `f_${pad6(i)}.png`), buf);
  }

  const res = spawnSync('ffmpeg', [
    '-y',
    '-i', path.join(tmpDir, 'f_%06d.png'),
    '-vf', `scale=${thumbWidth}:${thumbHeight},tile=${count}x1`,
    '-q:v', '3',
    outPath,
  ]);

  fs.rmSync(tmpDir, { recursive: true, force: true });

  if (res.status !== 0) {
    throw new Error(`Strip generation failed: ${res.stderr?.toString()}`);
  }

  return outPath;
}

/**
 * Render full-res crop region or ratio framing at time t.
 */
export async function renderCrop({
  page,
  time,
  crop = null, // [x, y, w, h] or ratio string '9:16'
  outPath,
}) {
  const buf = await captureFrame(page, time);
  const rawPath = `${outPath}.raw.png`;
  fs.writeFileSync(rawPath, buf);

  let vfFilter;
  if (Array.isArray(crop) && crop.length === 4) {
    const [x, y, w, h] = crop;
    vfFilter = `crop=${w}:${h}:${x}:${y}`;
  } else if (crop === '9:16') {
    vfFilter = 'crop=ih*9/16:ih:(iw-ow)/2:0';
  } else {
    vfFilter = 'null';
  }

  const res = spawnSync('ffmpeg', [
    '-y',
    '-i', rawPath,
    '-vf', vfFilter,
    outPath,
  ]);

  try { fs.unlinkSync(rawPath); } catch (_) {}

  if (res.status !== 0) {
    throw new Error(`Crop generation failed: ${res.stderr?.toString()}`);
  }

  return outPath;
}

/**
 * Render standard 4-keyframe storyboard (0%, 33%, 66%, 100%) in 2x2 grid.
 */
export async function renderStoryboard({
  page,
  duration,
  thumbWidth = 480,
  aspectRatio = 16 / 9,
  outPath,
}) {
  const times = [
    0,
    parseFloat((duration * 0.33).toFixed(2)),
    parseFloat((duration * 0.66).toFixed(2)),
    Math.max(0, parseFloat((duration - 0.05).toFixed(2))),
  ];

  return renderSheet({
    page,
    times,
    cols: 2,
    thumbWidth,
    aspectRatio,
    outPath,
  });
}

