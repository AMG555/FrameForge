/**
 * pixels.mjs — Frame Content & Color Inspector
 *
 * For inspecting visual content when the model cannot view image media directly.
 * Catches blank frames, blown flashes, and quadrant-confined content.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';

/**
 * Analyze an RGB24 buffer.
 * @param {Buffer|Uint8Array} buf   RGB raw bytes (length = width * height * 3)
 * @param {number} width
 * @param {number} height
 * @returns {{
 *   meanColor: [number, number, number],
 *   brightPixelShare: number,
 *   bbox: [number, number, number, number]|null,
 *   isBlank: boolean,
 *   isBlown: boolean,
 *   isCornerConfined: boolean,
 *   flags: string[]
 * }}
 */
export function analyzeRgbBuffer(buf, width, height) {
  const totalPixels = width * height;
  if (!buf || buf.length < totalPixels * 3) {
    throw new Error(`Buffer size ${buf?.length} too small for ${width}x${height} RGB24`);
  }

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let brightCount = 0;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 3;
    const r = buf[idx];
    const g = buf[idx + 1];
    const b = buf[idx + 2];

    rSum += r;
    gSum += g;
    bSum += b;

    // Perceived luminance (ITU-R BT.709)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (lum > 200) {
      brightCount++;
    }

    if (lum > 30) {
      const x = i % width;
      const y = Math.floor(i / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const meanR = Math.round(rSum / totalPixels);
  const meanG = Math.round(gSum / totalPixels);
  const meanB = Math.round(bSum / totalPixels);
  const brightPixelShare = brightCount / totalPixels;

  const hasContent = maxX >= 0 && maxY >= 0;
  const bbox = hasContent ? [minX, minY, maxX, maxY] : null;

  const meanLum = 0.2126 * meanR + 0.7152 * meanG + 0.0722 * meanB;
  const isBlank = !hasContent || (meanLum < 5 && brightPixelShare < 0.001);
  const isBlown = brightPixelShare > 0.92;

  let isCornerConfined = false;
  if (hasContent && !isBlank && !isBlown) {
    const halfW = width * 0.55;
    const halfH = height * 0.55;
    const inTopLeft     = maxX < halfW && maxY < halfH;
    const inTopRight    = minX > width - halfW && maxY < halfH;
    const inBottomLeft  = maxX < halfW && minY > height - halfH;
    const inBottomRight = minX > width - halfW && minY > height - halfH;
    isCornerConfined = inTopLeft || inTopRight || inBottomLeft || inBottomRight;
  }

  const flags = [];
  if (isBlank) flags.push('blank_frame');
  if (isBlown) flags.push('blown_frame');
  if (isCornerConfined) flags.push('corner_confined');

  return {
    meanColor: [meanR, meanG, meanB],
    brightPixelShare: parseFloat(brightPixelShare.toFixed(4)),
    bbox,
    isBlank,
    isBlown,
    isCornerConfined,
    flags,
  };
}

/**
 * Analyze an image file on disk using FFmpeg rawvideo pipe.
 * @param {string} filePath
 * @param {number} [width=1920]
 * @param {number} [height=1080]
 */
export function analyzeImageFile(filePath, width = 1920, height = 1080) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const res = spawnSync('ffmpeg', [
    '-v', 'error',
    '-i', filePath,
    '-s', `${width}x${height}`,
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    '-'
  ], {
    maxBuffer: width * height * 3 + 1024,
    encoding: 'buffer'
  });

  if (res.status !== 0 || !res.stdout) {
    throw new Error(`FFmpeg pixel extraction failed: ${res.stderr?.toString() || 'Unknown error'}`);
  }

  return analyzeRgbBuffer(res.stdout, width, height);
}

