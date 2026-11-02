/**
 * Animation System — Task #11
 *
 * Narrative-driven camera movement presets for the video renderer.
 * Every preset is a pure function: (scene metadata) → FFmpeg filter string.
 *
 * Camera hints map directly to the scene.camera_hint field in schema v1.0.0:
 *   slow_zoom_in | slow_zoom_out | pan_left | pan_right
 *   tilt_up | tilt_down | ken_burns | static | auto
 *
 * Transition types (used between scenes in the concat filter):
 *   cut | fade | dissolve | wipe_left | wipe_right
 *
 * All zoom values stay within ±1.12x to prevent quality loss (safe_zone = 1.12).
 * All coordinates use FFmpeg expression notation (evaluated per-frame by zoompan).
 *
 * Usage:
 *   const { buildCameraFilter, buildTransitionFilter, selectCameraHint } = require('./animation-system');
 *   const vf = buildCameraFilter('slow_zoom_in', { duration: 6 });
 */

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const FPS       = 24;         // target frames per second
const MAX_ZOOM  = 1.12;       // maximum safe zoom factor
const BASE_ZOOM = 1.0;        // starting zoom (no zoom)
const OUTPUT_W  = 1920;
const OUTPUT_H  = 1080;
const ZOOM_BASE = `${OUTPUT_W}x${OUTPUT_H}`;

// Per-frame zoom step for a smooth motion over ~8s at 24fps
// 1.12 - 1.00 = 0.12 over (8 * 24) = 192 frames → 0.000625/frame
// Round to 0.0007 for slightly snappier feel
const ZOOM_STEP_IN  = 0.0007;
const ZOOM_STEP_OUT = 0.0007;

// ── Camera filter builders ───────────────────────────────────────────────────

/**
 * Build an FFmpeg -vf filter string for the given camera preset.
 *
 * @param {string} hint   - camera_hint value from scene schema
 * @param {{ duration?: number, focalX?: number, focalY?: number }} opts
 *   duration  scene duration in seconds (used to calibrate speed)
 *   focalX/Y  focal point override (0-1 relative, default 0.5/0.35)
 * @returns {string}  FFmpeg filter chain (ready for -vf)
 */
function buildCameraFilter(hint, { duration = 6, focalX = 0.5, focalY = 0.35 } = {}) {
  const frames = Math.max(48, Math.round(duration * FPS));
  // Focal point in pixels
  const px = Math.round(focalX * OUTPUT_W);
  const py = Math.round(focalY * OUTPUT_H);

  switch ((hint || 'auto').toLowerCase()) {
    case 'slow_zoom_in':
      return _zoomIn(frames);
    case 'slow_zoom_out':
      return _zoomOut(frames);
    case 'zoom_in':
      return _zoomIn(frames, 0.0012);
    case 'zoom_out':
      return _zoomOut(frames, 0.0012);
    case 'pan_left':
      return _pan('left', frames);
    case 'pan_right':
      return _pan('right', frames);
    case 'tilt_up':
      return _tilt('up', frames);
    case 'tilt_down':
      return _tilt('down', frames);
    case 'ken_burns':
      return _kenBurns(frames, px, py);
    case 'static':
      return _static();
    case 'auto':
    default:
      // Deterministic selection based on focal-point quadrant
      return _autoSelect(focalX, focalY, frames);
  }
}

/**
 * Build the FFmpeg overlay filter for a cross-dissolve transition between
 * two pre-rendered scene clips.  Used in complex_filter assembly.
 *
 * Note: hard cuts require no filter (FFmpeg concat demuxer default).
 * Fades/dissolves need xfade filter (FFmpeg ≥4.3).
 *
 * @param {'cut'|'fade'|'dissolve'|'wipe_left'|'wipe_right'} type
 * @param {number} offset  time offset (seconds) at which the transition starts
 * @param {number} duration transition duration in seconds (default 0.5)
 * @returns {{ xfadeArgs: string[], isCut: boolean }}
 */
function buildTransitionFilter(type, offset, duration = 0.5) {
  if (type === 'cut' || !type) {
    return { isCut: true, xfadeArgs: [] };
  }
  const xfadeType = {
    fade:       'fade',
    dissolve:   'dissolve',
    wipe_left:  'wipeleft',
    wipe_right: 'wiperight',
  }[type] || 'fade';

  // xfade filter args (applied in filtergraph)
  return {
    isCut: false,
    xfadeArgs: [`transition=${xfadeType}`, `offset=${offset.toFixed(3)}`, `duration=${duration}`],
  };
}

/**
 * Select an appropriate camera hint for a scene when none is specified
 * by the LLM.  Alternates between zoom_in / zoom_out / pan to avoid
 * monotony.
 *
 * @param {number} sceneIndex   0-based scene index
 * @param {{ focalX?: number, focalY?: number }} focal
 * @returns {string}
 */
function selectCameraHint(sceneIndex, { focalX = 0.5, focalY = 0.35 } = {}) {
  const rotation = ['slow_zoom_in', 'pan_right', 'slow_zoom_out', 'pan_left', 'tilt_up', 'ken_burns'];
  return rotation[sceneIndex % rotation.length];
}

// ── Private filter implementations ───────────────────────────────────────────

function _zoomIn(frames, step = ZOOM_STEP_IN) {
  const maxZ = MAX_ZOOM.toFixed(4);
  const s    = step.toFixed(6);
  return (
    `zoompan=` +
    `z='min(zoom+${s},${maxZ})':` +
    `x='iw/2-(iw/zoom/2)':` +
    `y='ih/2-(ih/zoom/2)':` +
    `d=1:s=${ZOOM_BASE}:fps=${FPS}`
  );
}

function _zoomOut(frames, step = ZOOM_STEP_OUT) {
  const maxZ = MAX_ZOOM.toFixed(4);
  const s    = step.toFixed(6);
  return (
    `zoompan=` +
    `z='if(lte(zoom,1.0),${maxZ},max(zoom-${s},1.0))':` +
    `x='iw/2-(iw/zoom/2)':` +
    `y='ih/2-(ih/zoom/2)':` +
    `d=1:s=${ZOOM_BASE}:fps=${FPS}`
  );
}

function _pan(direction, frames) {
  // Pan at ~5% of frame width per second (gentle, cinematic)
  // x sweeps from left edge to right edge (or reverse) over full duration
  if (direction === 'left') {
    return (
      `zoompan=` +
      `z='1.06':` +
      `x='if(gte(on,1),x-0.6,iw*0.04)':` +
      `y='ih*0.06':` +
      `d=1:s=${ZOOM_BASE}:fps=${FPS}`
    );
  }
  // pan right
  return (
    `zoompan=` +
    `z='1.06':` +
    `x='if(gte(on,1),x+0.6,iw*0.02)':` +
    `y='ih*0.06':` +
    `d=1:s=${ZOOM_BASE}:fps=${FPS}`
  );
}

function _tilt(direction, frames) {
  if (direction === 'up') {
    return (
      `zoompan=` +
      `z='1.06':` +
      `x='iw*0.06':` +
      `y='if(gte(on,1),y-0.4,ih*0.12)':` +
      `d=1:s=${ZOOM_BASE}:fps=${FPS}`
    );
  }
  // tilt down
  return (
    `zoompan=` +
    `z='1.06':` +
    `x='iw*0.06':` +
    `y='if(gte(on,1),y+0.4,ih*0.02)':` +
    `d=1:s=${ZOOM_BASE}:fps=${FPS}`
  );
}

function _kenBurns(frames, focalPx, focalPy) {
  // Start zoomed in on focal point, slowly pull back + pan toward center
  const maxZ = MAX_ZOOM.toFixed(4);
  // Start x/y: offset toward focal point; end x/y: center
  const startX = Math.max(0, focalPx - OUTPUT_W / 2);
  const startY = Math.max(0, focalPy - OUTPUT_H / 2);
  return (
    `zoompan=` +
    `z='max(${maxZ}-0.0006*on,1.0)':` +
    `x='if(eq(on,1),${startX},x+(iw/2-(iw/zoom/2)-x)*0.02)':` +
    `y='if(eq(on,1),${startY},y+(ih/2-(ih/zoom/2)-y)*0.02)':` +
    `d=1:s=${ZOOM_BASE}:fps=${FPS}`
  );
}

function _static() {
  return `scale=${OUTPUT_W}:${OUTPUT_H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${OUTPUT_W}:${OUTPUT_H}`;
}

function _autoSelect(focalX, focalY, frames) {
  // Quadrant-based automatic selection
  if (focalY < 0.4 && focalX < 0.5)  return _zoomIn(frames);         // top-left subject → zoom in
  if (focalY < 0.4 && focalX >= 0.5) return _kenBurns(frames, Math.round(focalX * OUTPUT_W), Math.round(focalY * OUTPUT_H));
  if (focalX < 0.4)                   return _pan('right', frames);
  if (focalX > 0.6)                   return _pan('left', frames);
  return _zoomOut(frames);                                              // centered subject → zoom out
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  buildCameraFilter,
  buildTransitionFilter,
  selectCameraHint,
  // constants exposed for testing
  FPS,
  MAX_ZOOM,
};
