'use strict';
// Deep validation: imports, spec compliance, normaliseScene correctness, new modules
const fs = require('fs');
let failures = 0;
function check(label, value, expected = true) {
  const ok = value === expected;
  if (!ok) { console.error(`  FAIL: ${label} — got ${JSON.stringify(value)}, expected ${JSON.stringify(expected)}`); failures++; }
  else console.log(`  OK  : ${label}`);
}

// ── MCP server spec compliance ─────────────────────────────────────────────
const code = fs.readFileSync('./src/mcp-server/server.js','utf8');
console.log('\n=== MCP server spec compliance ===');
check('initialize handler',     code.includes("method === 'initialize'"));
check('jsonrpc 2.0 responses',  (code.match(/jsonrpc.*2\.0/g)||[]).length >= 8);
check('CORS headers',           code.includes('Access-Control-Allow-Origin'));
check('spawnSync Telegram',     code.includes("spawnSync('curl'"));
check('visual_description',     code.includes('visual_description'));
check('schema_version prompt',  code.includes('schema_version'));
check('batch handling',         code.includes('Array.isArray(body)'));
check('ping handler',           code.includes("method === 'ping'"));
check('notifications/init',     code.includes("notifications/initialized"));

// ── No execSync with shell strings in renderer or extractor ───────────────
console.log('\n=== Shell injection check ===');
const renderer  = fs.readFileSync('./src/video-renderer/renderer.js','utf8');
const extractor = fs.readFileSync('./src/shorts-extractor/extractor.js','utf8');
const mixer     = fs.readFileSync('./src/audio-mixer/mixer.js','utf8');
check('renderer uses spawnSync not execSync', !renderer.includes('execSync'));
check('extractor uses spawnSync not execSync', !extractor.includes('execSync'));
check('mixer uses spawnSync not execSync',    !mixer.includes('execSync'));

// ── Animation System ───────────────────────────────────────────────────────
console.log('\n=== Animation System (Task #11) ===');
const { buildCameraFilter, selectCameraHint, MAX_ZOOM, FPS } = require('../src/animation/animation-system');
check('buildCameraFilter slow_zoom_in contains zoompan', buildCameraFilter('slow_zoom_in').includes('zoompan'));
check('buildCameraFilter slow_zoom_out contains zoompan', buildCameraFilter('slow_zoom_out').includes('zoompan'));
check('buildCameraFilter pan_left returns zoompan',       buildCameraFilter('pan_left').includes('zoompan'));
check('buildCameraFilter pan_right returns zoompan',      buildCameraFilter('pan_right').includes('zoompan'));
check('buildCameraFilter tilt_up returns zoompan',        buildCameraFilter('tilt_up').includes('zoompan'));
check('buildCameraFilter static returns scale',           buildCameraFilter('static').includes('scale'));
check('buildCameraFilter ken_burns returns zoompan',      buildCameraFilter('ken_burns').includes('zoompan'));
check('buildCameraFilter auto does not throw',            typeof buildCameraFilter('auto') === 'string');
check('MAX_ZOOM is 1.12',                                 MAX_ZOOM, 1.12);
check('FPS is 24',                                        FPS, 24);
const hint = selectCameraHint(0);
check('selectCameraHint returns string',                  typeof hint === 'string');
check('camera filter does not exceed MAX_ZOOM',           !buildCameraFilter('slow_zoom_in').includes('1.13'));

// ── Artifact Manifest (Task #24) ───────────────────────────────────────────
console.log('\n=== Artifact Manifest (Task #24) ===');
const { ArtifactManifest } = require('../src/pipeline/artifact-manifest');
const os   = require('os');
const path = require('path');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
const mf = new ArtifactManifest({ productionId: 'test_prod_001', artifactsDir: tmpDir });
const data = mf.create({ narrationText: 'hello world test narration', scenes: [{narration:'s1',caption:'c1'},{narration:'s2',caption:'c2'}] });
check('manifest created',                data.production_id === 'test_prod_001');
check('schema_version 1.0.0',            data.schema_version === '1.0.0');
check('two scenes',                      data.scenes.length, 2);
check('narration_hash is sha256',        data.narration_hash.length, 64);
check('manifest.json written to disk',   fs.existsSync(path.join(tmpDir, 'test_prod_001', 'manifest.json')));
check('isSceneComplete false initially', !mf.isSceneComplete(0));
check('isMasterComplete false initially',!mf.isMasterComplete());
// loadOrCreate resume test
const mf2 = new ArtifactManifest({ productionId: 'test_prod_001', artifactsDir: tmpDir });
const { resumed } = mf2.loadOrCreate({ narrationText: 'hello world test narration' });
check('loadOrCreate same narration resumes', resumed, true);
const { resumed: notResumed } = mf2.loadOrCreate({ narrationText: 'completely different text' });
check('loadOrCreate different narration does not resume', notResumed, false);
// cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

// ── Artifact Retention (Task #27) ─────────────────────────────────────────
console.log('\n=== Artifact Retention (Task #27) ===');
const { classifyRetention } = require('../src/pipeline/artifact-retention');
check('final_video is permanent',      classifyRetention('final_video_prod123.mp4'), 'permanent');
check('short is permanent',            classifyRetention('short_clip.mp4'), 'permanent');
check('manifest.json is permanent',    classifyRetention('manifest.json'), 'permanent');
check('scene render is 30_day',        classifyRetention('scene_3_out.mp4'), '30_day');
check('concat txt is 30_day',          classifyRetention('concat_main.txt'), '30_day');
check('raw_concat is 30_day',          classifyRetention('raw_concat_123.mp4'), '30_day');
check('_raw.mp3 is temp',              classifyRetention('voice_raw.mp3'), 'temp');

// ── TTS voice selection (Task #17) ────────────────────────────────────────
console.log('\n=== TTS Voice Selection (Task #17) ===');
const { TTSProvider } = require('../src/pipeline/providers');
const tts = new TTSProvider();
check('selectNarratorVoice uses explicit override', tts.selectNarratorVoice('my-voice') === 'my-voice');
const autoVoice = tts.selectNarratorVoice();
check('selectNarratorVoice returns string',          typeof autoVoice === 'string');
check('no artificial bass boost in edge-tts filter', !fs.readFileSync('./src/pipeline/providers.js','utf8').includes('bass=g=3'));

// ── Renderer imports AnimationSystem (Task #11 integration) ──────────────
console.log('\n=== Renderer ← AnimationSystem integration ===');
check('renderer imports animation-system',   renderer.includes("require('../animation/animation-system')"));
check('renderer imports AudioMixer',         renderer.includes("require('../audio-mixer/mixer')"));
check('renderer calls buildCameraFilter',    renderer.includes('buildCameraFilter'));
check('renderer calls selectCameraHint',     renderer.includes('selectCameraHint'));
check('renderer calls mixer.mixVideo',       renderer.includes('mixer.mixVideo'));

// ── Workflow imports ───────────────────────────────────────────────────────
console.log('\n=== Workflow imports ===');
const {runResearch} = require('../src/workflows/research.js');
const {runScript, normaliseScene} = require('../src/workflows/script.js');
const {runAssets}   = require('../src/workflows/assets.js');
const {runRender}   = require('../src/workflows/render.js');
const {runShorts}   = require('../src/workflows/shorts.js');
check('all workflow modules import OK', true);

// ── normaliseScene ────────────────────────────────────────────────────────
console.log('\n=== normaliseScene ===');
const legacyScene = {n:1, narration:'Test narration for scene one.', caption:'test cap', visual_action:'ancient man [CAMP]', camera:'slow_zoom_in'};
const n1 = normaliseScene(legacyScene, 0);
check('legacy: schema_version 1.0.0',   n1.schema_version, '1.0.0');
check('legacy: character_id resolved',  n1.character.character_id === 'ancient_man');
check('legacy: camera_hint auto',       n1.camera_hint === 'auto');
check('legacy: focal_point present',    typeof n1.focal_point === 'object');

const newScene = {scene_id:2, schema_version:'1.0.0', narration:'Test narration scene two.', caption:'TEST', visual_description:'modern office [MODERN]', character:{character_id:'modern_man',pose:'sitting',emotion:'happy',position:{x:0.3,y:0.7,scale:1.2}}, focal_point:{x:0.3,y:0.3,weight:0.9}, overlay:{type:'none'}, sound_effects:[], music_mood:'calm', camera_hint:'zoom_out', metadata:{importance:'high',hook_potential:0.8,standalone:true}};
const n2 = normaliseScene(newScene, 1);
check('v1.0.0: schema_version 1.0.0',  n2.schema_version, '1.0.0');
check('v1.0.0: character_id preserved', n2.character.character_id, 'modern_man');
check('v1.0.0: camera_hint preserved',  n2.camera_hint, 'zoom_out');
check('v1.0.0: hook_potential',         n2.metadata.hook_potential, 0.8);
check('v1.0.0: standalone',             n2.metadata.standalone, true);

// ── Workflow JSON ─────────────────────────────────────────────────────────
console.log('\n=== Workflow JSON ===');
const wf  = JSON.parse(fs.readFileSync('./workflow.json','utf8').replace(/^\uFEFF/,''));
const wf2 = JSON.parse(fs.readFileSync('./daily-video-workflow.json','utf8').replace(/^\uFEFF/,''));
check('workflow.json has 49 nodes',              wf.nodes.length, 49);
check('daily-video-workflow.json has 35 nodes',  wf2.nodes.length, 35);
const sp = wf.nodes.find(n => n.id === 'e9d032d0-53c0-4858-ab34-89ceb0750038');
const vs = wf.nodes.find(n => n.id === '5cd88990-be2d-4199-9813-c4c3a8a903e9');
check('Build Script Prompt has schema_version',  sp.parameters.jsCode.includes('schema_version'));
check('Validate Script has visual_description',  vs.parameters.jsCode.includes('visual_description'));
const combined = JSON.stringify(wf) + JSON.stringify(wf2);
const leaked = ['0000000000','AAAAAAAAAAAAAAAA','000000000','192.168.1.15'].filter(s => combined.includes(s));
check('No leaked credentials in workflows',      leaked.length, 0);

// ── Final result ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(48)}`);
if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
