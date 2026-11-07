/**
 * encode.mjs — FFmpeg Argv Builders & Final Master Video Encoder
 *
 * Enforces broadcast-standard BT.709 color metadata, explicit -t duration (avoiding
 * the -shortest 0% CPU hang trap), and accurate multi-track audio muxing.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync, spawn } from 'child_process';

/**
 * Build FFmpeg argv for encoding a directory of image frames into an MP4.
 */
export function buildFramesEncodeArgs({
  framesPattern,
  duration,
  fps = 30,
  crf = 17,
  preset = 'slow',
  audioPath = null,
  outPath,
}) {
  const args = [
    '-y',
    '-framerate', String(fps),
    '-pattern_type', 'sequence',
    '-i', framesPattern,
  ];

  if (audioPath && fs.existsSync(audioPath)) {
    args.push(
      '-i', audioPath,
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '48000',
      '-ac', '2',
      '-map', '0:v:0',
      '-map', '1:a:0'
    );
  } else {
    args.push('-an');
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-profile:v', 'high',
    '-level', '4.1',
    '-pix_fmt', 'yuv420p',
    // BT.709 Color Space Tags (Prevents player color shift)
    '-color_range', 'tv',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-movflags', '+faststart',
    // Explicit duration prevents -shortest hang trap
    '-t', String(duration),
    outPath
  );

  return args;
}

/**
 * Execute FFmpeg encode from frame sequence to MP4 master.
 */
export async function encodeFramesToMp4(opts) {
  const args = buildFramesEncodeArgs(opts);
  const res = spawnSync('ffmpeg', args, {
    maxBuffer: 1024 * 1024 * 64,
    encoding: 'utf8',
  });

  if (res.status !== 0) {
    throw new Error(`FFmpeg master encode failed:\n${res.stderr || res.stdout}`);
  }

  const stat = fs.statSync(opts.outPath);
  return {
    outPath: opts.outPath,
    sizeBytes: stat.size,
    duration: opts.duration,
    fps: opts.fps,
  };
}
