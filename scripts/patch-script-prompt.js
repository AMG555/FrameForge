'use strict';
const fs = require('fs');

const raw = fs.readFileSync('./workflow.json', 'utf8').replace(/^\uFEFF/, '');
const wf  = JSON.parse(raw);

const node = wf.nodes.find(n => n.id === 'e9d032d0-53c0-4858-ab34-89ceb0750038');
if (!node) { console.error('Node not found!'); process.exit(1); }
console.log('Found node:', node.name);

// Enhanced scene schema prompt — Task #10
const newCode = [
  "const d = $json;",
  "const claims = d.researchClaims || d.research?.claims || [];",
  "const facts = claims.slice(0, 6).map(c => c.safe_wording || c.claim).join('; ');",
  "",
  "const system = [",
  "  'You are a YouTube scriptwriter for Ancient Thoughts and Mack Explains channels.',",
  "  'Style: rapid-fire educational comedy. Short punchy sentences 15-35 words each.',",
  "  'Structure: alternate between ancient-human facts and modern-human comparisons.',",
  "  'Hook every 4-5 scenes with a surprising did-you-know reveal.',",
  "  'Output ONLY raw JSON. No markdown. No code fences. Start with { end with }.',",
  "  'Every scene MUST include: scene_id, schema_version, narration, caption, visual_description, character, focal_point, overlay, sound_effects, music_mood, camera_hint, metadata.'",
  "].join(' ');",
  "",
  "const schemaGuide = [",
  "  'ENHANCED SCENE SCHEMA v1.0.0 — required fields per scene:',",
  "  '- scene_id: integer 1-55',",
  "  '- schema_version: \"1.0.0\" (always)',",
  "  '- narration: 15-35 words, punchy conversational',",
  "  '- caption: 3-6 word UPPERCASE summary',",
  "  '- visual_description: vivid cartoon image + ONE tag: [CAMP] [MODERN] [COMPARE] [REACTION] [TIMELINE]',",
  "  '- character: { character_id: \"ancient_man\"|\"modern_man\"|\"none\", pose: \"standing\"|\"running\"|\"sitting\"|\"jumping\"|\"none\", emotion: \"neutral\"|\"happy\"|\"angry\"|\"sad\"|\"surprised\"|\"determined\"|\"relaxed\"|\"none\", position: {x:0.0-1.0, y:0.0-1.0, scale:0.5-2.0} }',",
  "  '- focal_point: { x:0.0-1.0, y:0.0-1.0, weight:0.0-1.0 } — main area of interest',",
  "  '- overlay: { type: \"prop\"|\"effect\"|\"text\"|\"none\" }',",
  "  '- sound_effects: [ { effect_id: \"whoosh\"|\"fire_crackle\"|\"crowd_murmur\"|\"thunder\"|\"coins\"|\"heartbeat\"|\"camera_click\"|\"none\", timing: \"start\"|\"middle\"|\"end\"|\"continuous\", volume: 0.0-1.0 } ]',",
  "  '- music_mood: \"tense\"|\"calm\"|\"energetic\"|\"mysterious\"|\"neutral\"|\"dramatic\"|\"humorous\"',",
  "  '- camera_hint: \"zoom_in\"|\"zoom_out\"|\"pan_left\"|\"pan_right\"|\"static\"|\"auto\"',",
  "  '- metadata: { importance: \"low\"|\"medium\"|\"high\"|\"critical\", hook_potential: 0.0-1.0, standalone: true|false }'",
  "].join('\\n');",
  "",
  "const user = [",
  "  'TOPIC: ' + d.topic,",
  "  'FACTS: ' + facts,",
  "  '',",
  "  schemaGuide,",
  "  '',",
  "  'Write exactly 55 scenes following the schema above.',",
  "  'Scene 1: open with vivid sensory hook 50000 years ago.',",
  "  'Scenes 2-4: establish ancient situation.',",
  "  'Every 5th scene: modern comparison gag.',",
  "  'Final 3 scenes: punchy takeaway.',",
  "  '',",
  "  'RESPOND WITH EXACTLY:',",
  "  '{\"topic\":\"...\",\"youtube_title\":\"...\",\"title_candidates\":[\"...\",\"...\",\"...\",\"...\",\"...\"],',",
  "  '\"youtube_description\":\"...\",\"youtube_tags\":[\"...\",\"...\",\"...\",\"...\",\"...\",\"...\",\"...\",\"...\",\"...\",\"...\"],',",
  "  '\"thumbnail_prompt\":\"...\",\"hook\":\"...\",',",
  "  '\"scenes\":[{\"scene_id\":1,\"schema_version\":\"1.0.0\",\"narration\":\"...\",\"caption\":\"CAPTION HERE\",',",
  "  '\"visual_description\":\"description [CAMP]\",',",
  "  '\"character\":{\"character_id\":\"ancient_man\",\"pose\":\"standing\",\"emotion\":\"surprised\",\"position\":{\"x\":0.5,\"y\":0.8,\"scale\":1.0}},',",
  "  '\"focal_point\":{\"x\":0.5,\"y\":0.3,\"weight\":0.9},',",
  "  '\"overlay\":{\"type\":\"none\"},',",
  "  '\"sound_effects\":[{\"effect_id\":\"fire_crackle\",\"timing\":\"continuous\",\"volume\":0.2}],',",
  "  '\"music_mood\":\"mysterious\",\"camera_hint\":\"zoom_in\",',",
  "  '\"metadata\":{\"importance\":\"critical\",\"hook_potential\":0.9,\"standalone\":true}}],',",
  "  '\"shorts\":[{\"short_id\":1,\"title\":\"...\",\"description\":\"...\",\"scene_range\":[1,5],\"hook_scene\":1}]}'",
  "].join('\\n');",
  "",
  "const scriptBody = {",
  "  model: d.groqModel || 'llama-3.3-70b-versatile',",
  "  messages: [{ role: 'system', content: system }, { role: 'user', content: user }],",
  "  temperature: 1,",
  "  max_tokens: 32000",
  "};",
  "return [{ json: { ...d, scriptBody } }];"
].join('\n');

node.parameters.jsCode = newCode;

fs.writeFileSync('./workflow.json', JSON.stringify(wf, null, 2), 'utf8');
console.log('Written workflow.json');

// Verify
const verify = JSON.parse(fs.readFileSync('./workflow.json', 'utf8'));
const vnode  = verify.nodes.find(n => n.id === 'e9d032d0-53c0-4858-ab34-89ceb0750038');
const code   = vnode.parameters.jsCode;
console.log('schema_version :', code.includes('schema_version'));
console.log('focal_point    :', code.includes('focal_point'));
console.log('character_id   :', code.includes('character_id'));
console.log('music_mood     :', code.includes('music_mood'));
console.log('sound_effects  :', code.includes('sound_effects'));
console.log('camera_hint    :', code.includes('camera_hint'));
console.log('Total nodes    :', verify.nodes.length);
