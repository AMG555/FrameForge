'use strict';
// Patch the ✅ Validate Script node to accept both old (visual_action) and new (visual_description) schema
const fs = require('fs');

const raw = fs.readFileSync('./workflow.json', 'utf8').replace(/^\uFEFF/, '');
const wf  = JSON.parse(raw);

const node = wf.nodes.find(n => n.id === '5cd88990-be2d-4199-9813-c4c3a8a903e9');
if (!node) { console.error('Validate Script node not found'); process.exit(1); }
console.log('Found:', node.name);

const oldCode = node.parameters.jsCode;

// Replace the scene mapping section: accept visual_description OR visual_action (backwards compat)
const oldMapping = "const va=String(s.visual_action||'ancient human reacting [REACTION]').trim();";
const newMapping = [
  "// Accept both v1.0.0 enhanced schema (visual_description) and legacy (visual_action)",
  "const va=String(s.visual_description||s.visual_action||'ancient human reacting [REACTION]').trim();"
].join('\n  ');

if (!oldCode.includes(oldMapping)) {
  console.error('Target string not found in Validate Script jsCode');
  process.exit(1);
}

// Also update the output scene object to include new fields when present
const oldSceneEnd = "return {n:s.n||s.scene_id||(i+1),narration:s.narration||'',caption,visual_action,camera};";
const newSceneEnd = [
  "const sceneId = s.scene_id || s.n || (i+1);",
  "  const out = { n: sceneId, scene_id: sceneId, schema_version: s.schema_version||'1.0.0', narration: s.narration||'', caption, visual_action, visual_description: va, camera };",
  "  // Pass through new enhanced schema fields when present",
  "  if (s.character)     out.character     = s.character;",
  "  if (s.focal_point)   out.focal_point   = s.focal_point;",
  "  if (s.overlay)       out.overlay       = s.overlay;",
  "  if (s.sound_effects) out.sound_effects = s.sound_effects;",
  "  if (s.music_mood)    out.music_mood    = s.music_mood;",
  "  if (s.camera_hint)   out.camera_hint   = s.camera_hint;",
  "  if (s.metadata)      out.metadata      = s.metadata;",
  "  return out;"
].join('\n  ');

let newCode = oldCode.replace(oldMapping, newMapping);

// Find and replace the return statement in the scene map
if (newCode.includes(oldSceneEnd)) {
  newCode = newCode.replace(oldSceneEnd, newSceneEnd);
  console.log('Updated scene output object');
} else {
  // Try alternate pattern
  const altEnd = "return{n:s.n||s.scene_id||(i+1),narration:s.narration||'',caption,visual_action,camera};";
  if (newCode.includes(altEnd)) {
    newCode = newCode.replace(altEnd, newSceneEnd);
    console.log('Updated scene output object (alt)');
  } else {
    // Insert before the closing }) of the map - find "return{" or "return {" inside the map
    const retMatch = newCode.match(/return\s*\{[^}]*narration[^}]*\}/);
    if (retMatch) {
      newCode = newCode.replace(retMatch[0], newSceneEnd);
      console.log('Updated scene output object (regex match)');
    } else {
      console.warn('Could not find scene return statement — only applying visual_description fix');
    }
  }
}

node.parameters.jsCode = newCode;

fs.writeFileSync('./workflow.json', JSON.stringify(wf, null, 2), 'utf8');
console.log('Written. Verifying...');

const v = JSON.parse(fs.readFileSync('./workflow.json','utf8'));
const vn = v.nodes.find(n => n.id === '5cd88990-be2d-4199-9813-c4c3a8a903e9');
const vc = vn.parameters.jsCode;
console.log('visual_description in code:', vc.includes('visual_description'));
console.log('character pass-through    :', vc.includes('out.character'));
console.log('focal_point pass-through  :', vc.includes('out.focal_point'));
console.log('Total nodes               :', v.nodes.length);
