/**
 * transcribe.js — Speech Transcription & Silence Alignment via Whisper
 *
 * Provides word-level timestamps and speech pause detection for:
 *   1. Precise speech-aligned video cuts (never slice words in half)
 *   2. Karaoke/kinetic word caption generation
 *   3. Intelligent speech-to-visual b-roll timing
 *   4. Exporting SRT, NDJSON (engine.js), and JSON transcripts
 */

'use strict';

const { spawnSync } = require('child_process');
const path          = require('path');
const fs            = require('fs');
const os            = require('os');

const DEFAULT_FILES_DIR = process.env.N8N_FILES_DIR || path.join(os.homedir(), '.frameforge-files');
const TRANSCRIPTS_DIR   = path.join(DEFAULT_FILES_DIR, 'transcripts');

/**
 * Format seconds into SRT timestamp format: HH:MM:SS,mmm
 * @param {number} sec
 * @returns {string}
 */
function formatTimestampSrt(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const hrs  = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms   = Math.floor((s - Math.floor(s)) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Format transcript segments into SRT subtitle text
 * @param {Array<{ start: number, end: number, text?: string, word?: string }>} segments
 * @returns {string}
 */
function formatAsSrt(segments = []) {
  if (!Array.isArray(segments)) return '';
  return segments.map((seg, idx) => {
    const start = formatTimestampSrt(seg.start);
    const end   = formatTimestampSrt(seg.end);
    const text  = (seg.text || seg.word || '').trim();
    return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
  }).join('\n');
}

/**
 * Format transcript segments into NDJSON (one JSON object per line)
 * Directly consumed by engine.js captions() and cuePhrase()
 * @param {Array<{ start: number, end: number, text?: string, word?: string }>} segments
 * @returns {string}
 */
function formatAsNdjson(segments = []) {
  if (!Array.isArray(segments)) return '';
  return segments.map(s => JSON.stringify({
    start: Number(s.start || 0),
    end:   Number(s.end || 0),
    text:  (s.text || s.word || '').trim(),
  })).join('\n');
}

/**
 * Detect available Whisper engines
 */
function detectWhisper() {
  const isWin = process.platform === 'win32';

  // 1. Check faster-whisper (CTranslate2 — fastest local inference)
  try {
    const fwCheck = spawnSync('python', ['-c', 'import importlib.util, sys; sys.exit(0 if importlib.util.find_spec("faster_whisper") else 1)'], {
      encoding: 'utf8',
      timeout: 5000,
      shell: false,
    });
    if (fwCheck.status === 0) {
      return { available: true, engine: 'faster-whisper' };
    }
  } catch (_) {}

  // 2. Python openai-whisper module check
  try {
    const pyCheck = spawnSync('python', ['-c', 'import importlib.util, sys; sys.exit(0 if importlib.util.find_spec("whisper") else 1)'], {
      encoding: 'utf8',
      timeout: 5000,
      shell: false,
    });
    if (pyCheck.status === 0) {
      return { available: true, engine: 'python-whisper' };
    }
  } catch (_) {}

  // 3. Check CLI binary 'whisper'
  try {
    const cliRes = spawnSync('whisper', ['--version'], { encoding: 'utf8', timeout: 5000, shell: isWin });
    if (cliRes.status === 0) return { available: true, engine: 'whisper-cli' };
  } catch (_) {}

  // 4. Cloud fallback if OPENAI_API_KEY
  if (process.env.OPENAI_API_KEY) {
    return { available: true, engine: 'openai-api' };
  }

  return { available: false, engine: 'none' };
}

/**
 * Detect silence/pause segments using FFmpeg silencedetect filter
 * (Deterministic, fast, works without any ML models)
 *
 * @param {string} audioPath
 * @param {object} [opts]
 * @param {number} [opts.noiseDb=-35]
 * @param {number} [opts.minDuration=0.25]
 * @returns {Array<{ start: number, end: number, duration: number }>}
 */
function detectPausesWithFFmpeg(audioPath, opts = {}) {
  const noiseDb = opts.noiseDb != null ? opts.noiseDb : -35;
  const minDur = opts.minDuration != null ? opts.minDuration : 0.25;

  const res = spawnSync('ffmpeg', [
    '-nostdin',
    '-i', audioPath,
    '-af', `silencedetect=n=${noiseDb}dB:d=${minDur}`,
    '-f', 'null',
    '-',
  ], { encoding: 'utf8', timeout: 30000, shell: false });

  const output = (res.stderr || '') + (res.stdout || '');
  const pauses = [];

  const startRegex = /silence_start:\s*([0-9.]+)/g;
  const endRegex = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g;

  let sMatch;
  const starts = [];
  while ((sMatch = startRegex.exec(output)) !== null) {
    starts.push(parseFloat(sMatch[1]));
  }

  let eMatch;
  let idx = 0;
  while ((eMatch = endRegex.exec(output)) !== null) {
    const end = parseFloat(eMatch[1]);
    const duration = parseFloat(eMatch[2]);
    const start = starts[idx] != null ? starts[idx] : Math.max(0, end - duration);
    pauses.push({ start, end, duration });
    idx++;
  }

  return pauses;
}

/**
 * Snap a desired cut timestamp to the nearest speech pause/silence boundary
 *
 * @param {number} targetTime - Desired cut time in seconds
 * @param {Array<{ start: number, end: number }>} pauses - Detected silence intervals
 * @param {number} [tolerance=0.8] - Max seconds to shift the cut
 * @returns {number} Adjusted cut timestamp
 */
function snapCutToPause(targetTime, pauses = [], tolerance = 0.8) {
  if (!Array.isArray(pauses) || pauses.length === 0) return targetTime;

  let bestTime = targetTime;
  let minDiff = Infinity;

  for (const p of pauses) {
    // Middle of pause is the safest cut point
    const mid = (p.start + p.end) / 2;
    const diff = Math.abs(mid - targetTime);

    if (diff <= tolerance && diff < minDiff) {
      minDiff = diff;
      bestTime = mid;
    }
  }

  return Math.round(bestTime * 100) / 100;
}

/**
 * Transcribe speech in audio/video to words and segments
 *
 * @param {string} mediaPath - Local audio or video file
 * @param {object} [opts]
 * @param {string} [opts.model='base'] - tiny|base|small|medium|large
 * @param {string} [opts.language] - BCP-47 language hint
 * @param {'ndjson'|'srt'|'json'|'all'} [opts.format] - Output format to generate
 * @param {string} [opts.outputPath] - Optional output file path
 * @returns {Promise<{
 *   text: string,
 *   duration: number,
 *   words: Array<{ word: string, start: number, end: number }>,
 *   segments: Array<{ id: number, start: number, end: number, text: string }>,
 *   pauses: Array<{ start: number, end: number, duration: number }>,
 *   files?: { srt?: string, ndjson?: string, json?: string }
 * }>}
 */
async function transcribeAudio(mediaPath, opts = {}) {
  if (!fs.existsSync(mediaPath)) {
    throw new Error(`Media file not found for transcription: ${mediaPath}`);
  }

  let engine = detectWhisper();
  if (!engine.available) {
    try {
      const { ensureWhisper } = require('./tool-installer');
      if (ensureWhisper()) {
        engine = detectWhisper();
      }
    } catch (_) {}
  }
  const pauses = detectPausesWithFFmpeg(mediaPath);
  let parsed = { text: '', duration: 0, words: [], segments: [] };
  const isWin = process.platform === 'win32';
  const cleanPath = mediaPath.replace(/\\/g, '/');
  const modelName = opts.model || 'base';

  // 1. faster-whisper execution
  if (engine.engine === 'faster-whisper') {
    const pyScript = `
import json, sys
from faster_whisper import WhisperModel
model = WhisperModel("${modelName}", device="auto", compute_type="auto")
segments, info = model.transcribe("${cleanPath}", word_timestamps=True${opts.language ? `, language="${opts.language}"` : ''})
words = []
seg_list = []
idx = 0
for s in segments:
    seg_list.append({"id": idx, "start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip()})
    idx += 1
    if s.words:
        for w in s.words:
            words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
out = {
    "text": " ".join([s["text"] for s in seg_list]),
    "segments": seg_list,
    "words": words,
    "duration": round(info.duration, 3) if hasattr(info, "duration") else 0
}
print(json.dumps(out))
`;
    const res = spawnSync('python', ['-c', pyScript], { encoding: 'utf8', timeout: 180000, shell: false });
    if (res.status === 0) {
      try { parsed = JSON.parse(res.stdout); } catch (_) {}
    }
  }

  // 2. Python openai-whisper execution
  if (!parsed.text && engine.engine === 'python-whisper') {
    const pyScript = `
import whisper, json, sys
model = whisper.load_model("${modelName}")
result = model.transcribe("${cleanPath}", word_timestamps=True${opts.language ? `, language="${opts.language}"` : ''})
words = []
seg_list = []
for idx, s in enumerate(result.get("segments", [])):
    seg_list.append({"id": idx, "start": round(s.get("start", 0), 3), "end": round(s.get("end", 0), 3), "text": s.get("text", "").strip()})
    for w in s.get("words", []):
        words.append({"word": w.get("word", "").strip(), "start": round(w.get("start", 0), 3), "end": round(w.get("end", 0), 3)})
out = {
    "text": result.get("text", "").strip(),
    "segments": seg_list,
    "words": words
}
print(json.dumps(out))
`;
    const res = spawnSync('python', ['-c', pyScript], { encoding: 'utf8', timeout: 180000, shell: isWin });
    if (res.status === 0) {
      try { parsed = JSON.parse(res.stdout); } catch (_) {}
    }
  }

  // 3. Fallback: measure duration via ffprobe if whisper did not provide it
  if (!parsed.duration || parsed.duration <= 0) {
    try {
      const probe = spawnSync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        mediaPath,
      ], { encoding: 'utf8', timeout: 5000, shell: isWin });
      parsed.duration = parseFloat((probe.stdout || '0').trim()) || 0;
    } catch (_) {}
  }

  const result = {
    text: parsed.text || '',
    duration: parsed.duration || (parsed.segments?.length ? parsed.segments[parsed.segments.length - 1].end : 0),
    words: parsed.words || [],
    segments: parsed.segments || [],
    pauses,
  };

  // 4. Output files generation if requested
  if (opts.format || opts.outputPath) {
    const targetFormat = opts.format || 'ndjson';
    const outDir = opts.outputPath ? path.dirname(opts.outputPath) : TRANSCRIPTS_DIR;
    fs.mkdirSync(outDir, { recursive: true });
    const basename = path.basename(mediaPath, path.extname(mediaPath));
    const files = {};

    const segs = result.segments.length > 0
      ? result.segments
      : result.words.map(w => ({ start: w.start, end: w.end, text: w.word }));

    if (targetFormat === 'ndjson' || targetFormat === 'all') {
      const ndjsonPath = (opts.outputPath && targetFormat === 'ndjson')
        ? opts.outputPath
        : path.join(outDir, `${basename}.captions.ndjson`);
      fs.writeFileSync(ndjsonPath, formatAsNdjson(segs), 'utf8');
      files.ndjson = ndjsonPath;
    }

    if (targetFormat === 'srt' || targetFormat === 'all') {
      const srtPath = (opts.outputPath && targetFormat === 'srt')
        ? opts.outputPath
        : path.join(outDir, `${basename}.subtitles.srt`);
      fs.writeFileSync(srtPath, formatAsSrt(segs), 'utf8');
      files.srt = srtPath;
    }

    if (targetFormat === 'json' || targetFormat === 'all') {
      const jsonPath = (opts.outputPath && targetFormat === 'json')
        ? opts.outputPath
        : path.join(outDir, `${basename}.transcript.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
      files.json = jsonPath;
    }

    result.files = files;
  }

  return result;
}

module.exports = {
  detectWhisper,
  detectPausesWithFFmpeg,
  snapCutToPause,
  formatTimestampSrt,
  formatAsSrt,
  formatAsNdjson,
  transcribeAudio,
};

