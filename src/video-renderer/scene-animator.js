'use strict';
/**
 * Scene Animator — Code-Driven HTML/Canvas Scene Generator
 *
 * Generates self-contained HTML/Canvas animation scenes conforming to the
 * FrameForge frame-purity contract:
 * - window.DURATION = seconds
 * - window.seek = async (t) => draws frame at time t
 * - Every frame is a pure function of t (no Date.now, no Math.random without seed)
 * - Multilingual typography support: Malayalam, Indic, CJK, Arabic, Latin
 *
 * Supported component themes:
 * - 'code': IDE/terminal window with typing code and cursor
 * - 'chart': Animated bar chart, progress ring, and metric counter
 * - 'nodes': Pulsing network nodes with traveling energy packets
 * - 'diagram': Flowchart steps with directional energy arrows
 * - 'image': Floating Ken-Burns card embedding user-provided image
 * - 'kinetic': Audio spectrum visualizer + isometric geometry
 */

const fs   = require('fs');
const path = require('path');

// Multilingual font family stack prioritizing Indic/Malayalam system fonts
const FONT_STACK = `'Nirmala UI', 'Noto Sans Malayalam', 'Malayalam Sangam MN', 'Kartika', 'Meera', 'Manjari', -apple-system, 'Segoe UI', system-ui, sans-serif`;

/**
 * Detect the best visual theme from visual description, caption, and media.
 */
function detectTheme({ visualDescription = '', caption = '', imagePath = null } = {}) {
  if (imagePath) return 'image';
  const text = `${visualDescription} ${caption}`.toLowerCase();
  if (/\b(code|function|syntax|api|javascript|python|typescript|json|sql|query|endpoint|algorithm|struct|cli|terminal|bash|shell|npm|git)\b/.test(text)) {
    return 'code';
  }
  if (/\b(chart|data|metric|analytics|growth|graph|statistic|stats|revenue|percent|count|number)\b/.test(text)) {
    return 'chart';
  }
  if (/\b(network|node|ai|model|neural|pipeline|architecture|cloud|server|system|mesh|connect)\b/.test(text)) {
    return 'nodes';
  }
  if (/\b(diagram|flow|step|process|workflow|sequence|lifecycle|cycle)\b/.test(text)) {
    return 'diagram';
  }
  return 'kinetic';
}

/**
 * Generate a complete self-contained HTML scene string.
 *
 * @param {object} opts
 * @param {string} opts.caption
 * @param {string} [opts.narration]
 * @param {string} [opts.visualDescription]
 * @param {string} [opts.imagePath]
 * @param {number} opts.duration
 * @param {number} [opts.width]
 * @param {number} [opts.height]
 * @param {number} [opts.sceneIndex]
 * @param {string} [opts.musicMood]
 * @returns {string} HTML document
 */
function generateSceneHtml({
  caption = '',
  narration = '',
  visualDescription = '',
  imagePath = null,
  duration = 3,
  width = 1920,
  height = 1080,
  sceneIndex = 0,
  musicMood = 'neutral',
} = {}) {
  const theme = detectTheme({ visualDescription, caption, imagePath });
  const clampedDur = Math.max(1, Number(duration) || 3);

  // Convert imagePath to data URL if local file exists
  let imageDataUri = '';
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      const ext = path.extname(imagePath).toLowerCase().slice(1) || 'jpeg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const b64 = fs.readFileSync(imagePath).toString('base64');
      imageDataUri = `data:${mime};base64,${b64}`;
    } catch (_) {}
  }

  // Color palettes based on scene index and music mood
  const PALETTES = [
    { bg0: '#142036', bg1: '#0b111c', bg2: '#05080f', accent: '#38bdf8', accent2: '#818cf8', tag: 'CYBER TECH' },
    { bg0: '#231436', bg1: '#110a1c', bg2: '#07040d', accent: '#c084fc', accent2: '#f43f5e', tag: 'DEEP DYNAMICS' },
    { bg0: '#0e261f', bg1: '#071511', bg2: '#030a08', accent: '#34d399', accent2: '#38bdf8', tag: 'SYSTEM ACTIVE' },
    { bg0: '#291d0e', bg1: '#150f07', bg2: '#0a0703', accent: '#fbbf24', accent2: '#f97316', tag: 'HIGH IMPACT' },
    { bg0: '#161d2b', bg1: '#0d131d', bg2: '#06090e', accent: '#60a5fa', accent2: '#a78bfa', tag: 'INTELLIGENCE' },
  ];
  const pal = PALETTES[sceneIndex % PALETTES.length];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${pal.bg2};
      font-family: ${FONT_STACK};
      -webkit-font-smoothing: antialiased;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
<canvas id="stage" width="${width}" height="${height}"></canvas>
<script>
window.DURATION = ${clampedDur};
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = ${width};
const H = ${height};

// Seeded PRNG for frame purity (same t -> exact same frame)
function sfc32(a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

const rng = sfc32(${42 + sceneIndex * 17}, ${1337 + sceneIndex * 31}, ${7 + sceneIndex * 11}, 99);
const PARTICLES = Array.from({ length: 54 }, () => ({
  x: rng() * W,
  y: rng() * H,
  vx: (rng() - 0.5) * 50,
  vy: (rng() - 0.5) * 35 - 15,
  r: 1.5 + rng() * 3.5,
  alpha: 0.3 + rng() * 0.5
}));

// Spring dynamics function
function spring(t, delay = 0, tension = 160, friction = 14) {
  const dt = t - delay;
  if (dt <= 0) return 0;
  const omega = Math.sqrt(tension);
  const zeta = friction / (2 * omega);
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * dt) * (Math.cos(omegaD * dt) + (zeta * omega / omegaD) * Math.sin(omegaD * dt));
  }
  return 1 - Math.exp(-omega * dt);
}

const THEME = ${JSON.stringify(theme)};
const CAPTION = ${JSON.stringify(caption)};
const NARRATION = ${JSON.stringify(narration)};
const TAG = ${JSON.stringify(pal.tag)};
const ACCENT = ${JSON.stringify(pal.accent)};
const ACCENT2 = ${JSON.stringify(pal.accent2)};
const BG0 = ${JSON.stringify(pal.bg0)};
const BG1 = ${JSON.stringify(pal.bg1)};
const BG2 = ${JSON.stringify(pal.bg2)};
const IMAGE_SRC = ${JSON.stringify(imageDataUri)};

let cachedImage = null;
if (IMAGE_SRC) {
  cachedImage = new Image();
  cachedImage.src = IMAGE_SRC;
}

window.seek = async (t) => {
  // ── 1. Dynamic Moving Gradient Background ────────────────────────────────
  const cx = W / 2 + Math.sin(t * 0.7) * 160;
  const cy = H / 2 + Math.cos(t * 0.5) * 90;
  const bgGrad = ctx.createRadialGradient(cx, cy, 60, W / 2, H / 2, W * 0.85);
  bgGrad.addColorStop(0, BG0);
  bgGrad.addColorStop(0.55, BG1);
  bgGrad.addColorStop(1, BG2);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Subtle Moving Perspective Grid ───────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridShift = (t * 30) % 60;
  for (let x = 0; x <= W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = gridShift; y <= H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  // ── 3. Floating Dust & Energy Particles ──────────────────────────────────
  ctx.save();
  for (let i = 0; i < PARTICLES.length; i++) {
    const p = PARTICLES[i];
    const px = (p.x + p.vx * t + W * 10) % W;
    const py = (p.y + p.vy * t + H * 10) % H;
    const pulse = 0.4 + 0.6 * Math.sin(t * 3.2 + i * 0.5);
    ctx.fillStyle = ACCENT;
    ctx.globalAlpha = p.alpha * pulse * 0.7;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 4. Central Graphic Card matching Theme ──────────────────────────────
  ctx.save();
  const cardSpring = spring(t, 0.08, 140, 13);
  const cardScale = Math.min(1.04, Math.max(0, cardSpring));
  const cardY = H * 0.40 + (1 - cardSpring) * 50;
  ctx.translate(W / 2, cardY);
  ctx.scale(cardScale, cardScale);

  const cardW = Math.round(W * 0.55);
  const cardH = Math.round(H * 0.38);

  // Card backdrop with glassmorphic border
  ctx.fillStyle = 'rgba(11, 17, 28, 0.82)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
  ctx.fill();
  ctx.stroke();

  // Accent edge highlight
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-cardW / 2 + 30, -cardH / 2);
  ctx.lineTo(cardW / 2 - 30, -cardH / 2);
  ctx.stroke();

  if (THEME === 'code') {
    // IDE Titlebar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(-cardW / 2, -cardH / 2, cardW, 40, [20, 20, 0, 0]);
    ctx.fill();
    // Window dots
    ctx.fillStyle = '#ff5f56'; ctx.beginPath(); ctx.arc(-cardW / 2 + 25, -cardH / 2 + 20, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffbd2e'; ctx.beginPath(); ctx.arc(-cardW / 2 + 45, -cardH / 2 + 20, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27c93f'; ctx.beginPath(); ctx.arc(-cardW / 2 + 65, -cardH / 2 + 20, 6, 0, Math.PI * 2); ctx.fill();
    // Tab title
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('scene-pipeline.js', -cardW / 2 + 90, -cardH / 2 + 25);

    // Code lines with typing effect
    const codeLines = [
      'import { FrameForge } from "@amg555/frameforge";',
      'const engine = new FrameForge.AnimationEngine({ t });',
      'await engine.renderScene({',
      '  status: "ACTIVE_24FPS",',
      '  fidelity: "BROADCAST_BT709"',
      '});'
    ];
    ctx.font = '18px "Fira Code", monospace';
    const typeProg = Math.min(1, t / (window.DURATION * 0.75));
    const totalChars = codeLines.join('\\n').length;
    let charsToShow = Math.floor(totalChars * typeProg);

    let lineY = -cardH / 2 + 80;
    for (let l = 0; l < codeLines.length; l++) {
      const line = codeLines[l];
      const sliceLen = Math.min(line.length, charsToShow);
      const textToDraw = line.slice(0, sliceLen);
      charsToShow = Math.max(0, charsToShow - line.length - 1);

      // Line number
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillText(String(l + 1).padStart(2, '0'), -cardW / 2 + 30, lineY);
      // Syntax text
      ctx.fillStyle = l === 0 ? ACCENT : l === 1 ? ACCENT2 : '#e2e8f0';
      ctx.fillText(textToDraw, -cardW / 2 + 75, lineY);
      lineY += 32;
    }
  } else if (THEME === 'chart') {
    // Animated bar chart + metrics
    const bars = 8;
    const barW = (cardW - 140) / bars;
    const startX = -cardW / 2 + 70;
    const baseLine = cardH / 2 - 50;

    for (let b = 0; b < bars; b++) {
      const barSpring = spring(t, 0.15 + b * 0.05, 120, 12);
      const targetH = 50 + ((b * 37) % 140);
      const curH = targetH * Math.min(1.05, Math.max(0, barSpring));
      const bx = startX + b * barW;
      const by = baseLine - curH;

      const barGrad = ctx.createLinearGradient(0, by, 0, baseLine);
      barGrad.addColorStop(0, ACCENT);
      barGrad.addColorStop(1, ACCENT2);
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW - 12, curH, 6);
      ctx.fill();
    }
    // Animated Counter
    const counterVal = Math.round(spring(t, 0.2, 100, 10) * 98.4);
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(counterVal + '% METRIC GAIN', cardW / 2 - 40, -cardH / 2 + 50);
  } else if (THEME === 'nodes') {
    // Interconnected pulsing network nodes
    const nodeCoords = [
      [-cardW * 0.35, -30], [-cardW * 0.15, 40], [0, -50],
      [cardW * 0.15, 30], [cardW * 0.35, -20]
    ];
    // Connections
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < nodeCoords.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(nodeCoords[i][0], nodeCoords[i][1]);
      ctx.lineTo(nodeCoords[i + 1][0], nodeCoords[i + 1][1]);
      ctx.stroke();

      // Energy packet along connection
      const packetPos = (t * 0.8 + i * 0.25) % 1;
      const ex = nodeCoords[i][0] + (nodeCoords[i + 1][0] - nodeCoords[i][0]) * packetPos;
      const ey = nodeCoords[i][1] + (nodeCoords[i + 1][1] - nodeCoords[i][1]) * packetPos;
      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nodes
    for (let i = 0; i < nodeCoords.length; i++) {
      const [nx, ny] = nodeCoords[i];
      const pulse = 1 + 0.25 * Math.sin(t * 4 + i);
      ctx.fillStyle = ACCENT2;
      ctx.beginPath();
      ctx.arc(nx, ny, 14 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(nx, ny, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (THEME === 'image' && cachedImage && cachedImage.complete && cachedImage.naturalWidth > 0) {
    // Ken-Burns floating image
    const zoom = 1.0 + (t / window.DURATION) * 0.07;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-cardW / 2 + 12, -cardH / 2 + 12, cardW - 24, cardH - 24, 14);
    ctx.clip();
    ctx.scale(zoom, zoom);
    ctx.drawImage(cachedImage, -cardW / 2 + 12, -cardH / 2 + 12, cardW - 24, cardH - 24);
    ctx.restore();
  } else {
    // Kinetic Audio Spectrum Bars
    const bars = 28;
    const barW = (cardW - 80) / bars;
    const startX = -cardW / 2 + 40;
    for (let b = 0; b < bars; b++) {
      const phase = t * 4.5 + b * 0.3;
      const hVal = 25 + 95 * Math.abs(Math.sin(phase) * Math.cos(phase * 0.8));
      const bx = startX + b * barW;
      const by = 20 - hVal / 2;

      const barGrad = ctx.createLinearGradient(0, by, 0, by + hVal);
      barGrad.addColorStop(0, ACCENT);
      barGrad.addColorStop(1, ACCENT2);
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW - 6, hVal, 4);
      ctx.fill();
    }
  }

  // Tag Badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(-cardW / 2 + 25, -cardH / 2 + 20, 140, 30, 15);
  ctx.fill();
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = ACCENT;
  ctx.textAlign = 'center';
  ctx.fillText(TAG, -cardW / 2 + 95, -cardH / 2 + 40);

  ctx.restore();

  // ── 5. Kinetic Typography with Multilingual / Malayalam Support ─────────
  ctx.save();
  const textSpring = spring(t, 0.22, 150, 13);
  const textY = H * 0.77 + (1 - textSpring) * 45;
  const textAlpha = Math.min(1, Math.max(0, textSpring));

  ctx.globalAlpha = textAlpha;
  ctx.textAlign = 'center';

  // Primary Caption / Headline
  ctx.font = 'bold 54px ' + ${JSON.stringify(FONT_STACK)};
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(CAPTION, W / 2, textY);

  // Subtitle / Narration preview
  if (NARRATION) {
    ctx.font = '400 28px ' + ${JSON.stringify(FONT_STACK)};
    ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
    ctx.shadowBlur = 12;
    const cleanNarr = NARRATION.length > 95 ? NARRATION.slice(0, 95) + '...' : NARRATION;
    ctx.fillText(cleanNarr, W / 2, textY + 62);
  }
  ctx.restore();

  // ── 6. Progress Scrubber ────────────────────────────────────────────────
  ctx.save();
  const progress = Math.min(1, Math.max(0, t / window.DURATION));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, H - 8, W, 8);

  const progGrad = ctx.createLinearGradient(0, 0, W, 0);
  progGrad.addColorStop(0, ACCENT);
  progGrad.addColorStop(1, ACCENT2);
  ctx.fillStyle = progGrad;
  ctx.fillRect(0, H - 8, W * progress, 8);
  ctx.restore();
};
window.ready = true;
</script>
</body>
</html>`;
}

module.exports = {
  generateSceneHtml,
  detectTheme,
  FONT_STACK,
};
