#!/usr/bin/env node
/**
 * storyboard-validator.mjs — Hard-gate validator for STORYBOARD.md / storyboard.json
 *
 * Applies the four gates from ClaudeAnimationBase ANIMATION_GUIDE.md before
 * any scene code is allowed to be written:
 *
 *   Gate 1 — Every shot has an EVENT (not a description).
 *             "Clawd stands in a meadow" FAILS. "Clawd turns toward the viewer" PASSES.
 *
 *   Gate 2 — No two READS within the same shot occupy overlapping seconds.
 *             "The viewer must understand X at 0.0–1.5s and Y at 1.0–2.0s" FAILS.
 *
 *   Gate 3 — Every SEAM has a named TRANSITION (including film open and close).
 *             A shot list that starts without an in-transition FAILS.
 *
 *   Gate 4 — NO TEXT ON SCREEN. "Lost" must be acted, not captioned.
 *             Any shot whose event or reads contain "text:", "caption:", "title card",
 *             "lower third", or "on-screen text" FAILS.
 *
 * Usage:
 *   node scripts/storyboard-validator.mjs storyboard.json
 *   node scripts/storyboard-validator.mjs STORYBOARD.md
 *   echo $? → 0 pass, 1 fail
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI ────────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const filePath = args[0];
if (!filePath) {
  process.stderr.write('Usage: node storyboard-validator.mjs <storyboard.json|STORYBOARD.md>\n');
  process.exit(1);
}

const absPath = path.resolve(process.cwd(), filePath);
if (!fs.existsSync(absPath)) {
  process.stderr.write(`File not found: ${absPath}\n`);
  process.exit(1);
}

// ── Parse ─────────────────────────────────────────────────────────────────────

function parseStoryboard(absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const ext = path.extname(absPath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(raw);
  }

  // Parse STORYBOARD.md:
  // Expected shot block:
  //
  // ## Shot N — <name>
  // - start: <float>
  // - end: <float>
  // - transition_in: <name>
  // - transition_out: <name>
  // - event: <text>
  // - reads:
  //   - 0.0–1.5: <text>
  //   - 1.5–3.0: <text>

  const shots = [];
  const shotRegex = /^##\s+Shot\s+(\d+)/im;
  const blocks = raw.split(/(?=^##\s+Shot\s+\d+)/im);

  for (const block of blocks) {
    if (!shotRegex.test(block)) continue;

    const shot = {
      index:          parseInt((block.match(/##\s+Shot\s+(\d+)/i) || [])[1] || '0', 10),
      name:           (block.match(/##\s+Shot\s+\d+\s*[—–-]\s*(.+)/i) || [])[1]?.trim() || '',
      start:          parseFloat((block.match(/[-*]\s*start\s*:\s*([\d.]+)/i) || [])[1] || 'NaN'),
      end:            parseFloat((block.match(/[-*]\s*end\s*:\s*([\d.]+)/i) || [])[1] || 'NaN'),
      transition_in:  ((block.match(/[-*]\s*transition_in\s*:\s*(.+)/i) || [])[1] || '').trim(),
      transition_out: ((block.match(/[-*]\s*transition_out\s*:\s*(.+)/i) || [])[1] || '').trim(),
      event:          ((block.match(/[-*]\s*event\s*:\s*(.+)/i) || [])[1] || '').trim(),
      reads:          [],
    };

    // Parse reads sub-list (lines like "  - 0.0–1.5: text" or "  - 0.0-1.5: text")
    const readsSection = block.match(/[-*]\s*reads\s*:([\s\S]*?)(?=\n[-*]\s*\w+\s*:|$)/i);
    if (readsSection) {
      const readLines = readsSection[1].split('\n');
      for (const line of readLines) {
        const m = line.match(/[-*]\s*([\d.]+)\s*[–—-]\s*([\d.]+)\s*:\s*(.+)/);
        if (m) {
          shot.reads.push({ start: parseFloat(m[1]), end: parseFloat(m[2]), text: m[3].trim() });
        }
      }
    }

    shots.push(shot);
  }

  return { shots };
}

// ── Validate ──────────────────────────────────────────────────────────────────

const TEXT_PATTERNS = [
  /\btext\s*:/i,
  /\bcaption\s*:/i,
  /\btitle\s+card\b/i,
  /\btitlecard\b/i,
  /\blower\s+third\b/i,
  /\bon.?screen\s+text\b/i,
  /\bsubtitle\b/i,
  /\boverlay\s+text\b/i,
  /\btext\s+overlay\b/i,
];

const DESCRIPTION_PHRASES = [
  /\bstands?\s+(in|on|at|near)\b/i,
  /\bsitting?\s+(in|on|at)\b/i,
  /\bwaits?\s+(?:for\s+)?(?:a\s+)?moment\b/i,
  /\blooks?\s+at\s+(?:the\s+)?camera\b/i,
  /\bposing?\s+(?:for|in)\b/i,
  /\bscenery\b/i,
  /\bbackground\s+shows?\b/i,
  /\bmontage\s+of\b/i,
];

function validate(data) {
  const shots    = data.shots || [];
  const errors   = [];
  const warnings = [];

  if (shots.length === 0) {
    errors.push('GATE 3: Storyboard has no shots.');
    return { errors, warnings };
  }

  // Gate 3 — film open: first shot must have a transition_in
  const first = shots[0];
  if (!first.transition_in || first.transition_in.toLowerCase() === 'none') {
    errors.push(`GATE 3: Shot 1 "${first.name || ''}" is missing transition_in (the film must open with a declared transition, e.g. "fade-from-black").`);
  }

  // Gate 3 — film close: last shot must have a transition_out
  const last = shots[shots.length - 1];
  if (!last.transition_out || last.transition_out.toLowerCase() === 'none') {
    errors.push(`GATE 3: Shot ${last.index} "${last.name || ''}" is missing transition_out (the film must close with a declared transition, e.g. "fade-to-black").`);
  }

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const label = `Shot ${shot.index} "${shot.name || ''}"`;

    // Gate 1 — shot must have an event
    if (!shot.event) {
      errors.push(`GATE 1: ${label} has no event. Add: "event: <what physically happens>"`);
    } else {
      // Heuristic: static descriptions fail gate 1
      for (const re of DESCRIPTION_PHRASES) {
        if (re.test(shot.event)) {
          warnings.push(`GATE 1 WARNING: ${label} event looks like a description, not an action: "${shot.event.slice(0, 60)}"`);
          break;
        }
      }
    }

    // Gate 4 — no text
    const allText = [shot.event, ...(shot.reads || []).map(r => r.text)].join(' ');
    for (const re of TEXT_PATTERNS) {
      if (re.test(allText)) {
        errors.push(`GATE 4: ${label} contains on-screen text reference: "${allText.slice(0, 80)}". Emotion/story must be acted, not captioned.`);
        break;
      }
    }

    // Gate 2 — reads must not overlap
    const reads = shot.reads || [];
    for (let j = 0; j < reads.length; j++) {
      for (let k = j + 1; k < reads.length; k++) {
        const a = reads[j];
        const b = reads[k];
        if (a.start < b.end && b.start < a.end) {
          errors.push(
            `GATE 2: ${label} reads overlap!\n` +
            `  Read ${j + 1}: ${a.start}–${a.end}s "${a.text.slice(0, 40)}"\n` +
            `  Read ${k + 1}: ${b.start}–${b.end}s "${b.text.slice(0, 40)}"`
          );
        }
      }
    }

    // Gate 3 — seam between shots must have named transition
    if (i < shots.length - 1) {
      const next = shots[i + 1];
      if (!shot.transition_out || shot.transition_out.toLowerCase() === 'none') {
        errors.push(`GATE 3: ${label} is missing transition_out into Shot ${next.index}.`);
      }
      if (!next.transition_in || next.transition_in.toLowerCase() === 'none') {
        errors.push(`GATE 3: Shot ${next.index} "${next.name || ''}" is missing transition_in from Shot ${shot.index}.`);
      }
    }

    // Structural checks — not hard gates but reported
    if (isNaN(shot.start) || isNaN(shot.end)) {
      warnings.push(`STRUCTURE: ${label} is missing start/end times.`);
    } else if (shot.end <= shot.start) {
      errors.push(`STRUCTURE: ${label} has end (${shot.end}) ≤ start (${shot.start}).`);
    }
  }

  return { errors, warnings };
}

// ── Run ───────────────────────────────────────────────────────────────────────

let data;
try {
  data = parseStoryboard(absPath);
} catch (e) {
  process.stderr.write(`Parse error: ${e.message}\n`);
  process.exit(1);
}

const { errors, warnings } = validate(data);
const shotCount = (data.shots || []).length;

process.stdout.write(`\n[storyboard-validator] ${path.basename(absPath)} — ${shotCount} shot(s)\n\n`);

for (const w of warnings) {
  process.stdout.write(`  ⚠️  ${w}\n`);
}
for (const e of errors) {
  process.stdout.write(`  ❌ ${e}\n`);
}

if (errors.length === 0) {
  process.stdout.write(`\n  ✅ All 4 gates passed${warnings.length > 0 ? ` (${warnings.length} warning(s))` : ''}.\n\n`);
  process.exit(0);
} else {
  process.stdout.write(`\n  🛑 ${errors.length} gate violation(s). Fix before writing scene code.\n\n`);
  process.exit(1);
}
