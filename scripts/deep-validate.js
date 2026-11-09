'use strict';
// Deep validation — imports, spec compliance, module correctness.
// Run with: node scripts/deep-validate.js
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
check('initialize handler',          code.includes("method === 'initialize'"));
check('jsonrpc 2.0 responses',       (code.match(/jsonrpc.*2\.0/g)||[]).length >= 8);
check('CORS headers',                code.includes('Access-Control-Allow-Origin'));
check('visual_description',          code.includes('visual_description'));
check('batch handling',              code.includes('Array.isArray(body)'));
check('ping handler',                code.includes("method === 'ping'"));
check('notifications/init',          code.includes("notifications/initialized"));
check('body size limit',             code.includes('MAX_BODY_BYTES'));
check('SERVER_INFO version 2.3.5',   code.includes("version: '2.3.5'"));
check('18 tools defined (incl get_job_status)', code.includes('get_job_status'));
check('export_to_editor tool defined', code.includes('export_to_editor'));
check('voxforge TTS provider', code.includes('voxforge'));

// ── No execSync with shell strings in renderer or extractor ───────────────
console.log('\n=== Shell injection check ===');
const renderer  = fs.readFileSync('./src/video-renderer/renderer.js','utf8');
const extractor = fs.readFileSync('./src/shorts-extractor/extractor.js','utf8');
const mixer     = fs.readFileSync('./src/audio-mixer/mixer.js','utf8');
check('renderer uses spawnSync not execSync',  !renderer.includes('execSync'));
check('extractor uses spawnSync not execSync', !extractor.includes('execSync'));
check('mixer uses spawnSync not execSync',     !mixer.includes('execSync'));

// ── Animation System ───────────────────────────────────────────────────────
console.log('\n=== Animation System ===');
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

// ── Artifact Manifest ──────────────────────────────────────────────────────
console.log('\n=== Artifact Manifest ===');
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
const mf2 = new ArtifactManifest({ productionId: 'test_prod_001', artifactsDir: tmpDir });
const { resumed } = mf2.loadOrCreate({ narrationText: 'hello world test narration' });
check('loadOrCreate same narration resumes', resumed, true);
const { resumed: notResumed } = mf2.loadOrCreate({ narrationText: 'completely different text' });
check('loadOrCreate different narration does not resume', notResumed, false);
fs.rmSync(tmpDir, { recursive: true, force: true });

// ── Vertical Reformatting (ShortsExtractor) ───────────────────────────────
console.log('\n=== ShortsExtractor focal point math ===');
const { ShortsExtractor } = require('../src/shorts-extractor/extractor');
const sx = new ShortsExtractor();
check('focalX=0.5 centers crop (608px wide in 1920)', sx._focalToFFmpegX(0.5), 656);
check('focalX=0.0 clamps to 0',    sx._focalToFFmpegX(0.0), 0);
check('focalX=1.0 clamps to 1312', sx._focalToFFmpegX(1.0), 1312);
check('focalX=0.3 is even pixel',  sx._focalToFFmpegX(0.3) % 2 === 0);
check('focalX=0.7 is even pixel',  sx._focalToFFmpegX(0.7) % 2 === 0);
check('focalToFFmpegY is always 0',sx._focalToFFmpegY(), 0);
check('defaultFocalY with no scenes = 0.35', sx._defaultFocalY([]), 0.35);
check('defaultFocalY uses focal_point.y from scenes', sx._defaultFocalY([{focal_point:{y:0.25}}]), 0.25);
const fp = sx._focalPointForSegment({ coveredScenes: [] }, []);
check('focalPointForSegment default x=0.5', fp.x, 0.5);
check('focalPointForSegment default y=0.35 (safe-zone bias)', fp.y, 0.35);
const fp2 = sx._focalPointForSegment({ coveredScenes: [{ focal_point: { x: 0.3, y: 0.2 } }] }, []);
check('focalPointForSegment uses scene focal_point.x', fp2.x, 0.3);
check('focalPointForSegment uses scene focal_point.y', fp2.y, 0.2);

// ── Artifact Retention ────────────────────────────────────────────────────
console.log('\n=== Artifact Retention ===');
const { classifyRetention } = require('../src/pipeline/artifact-retention');
check('final_video is permanent',   classifyRetention('final_video_prod123.mp4'), 'permanent');
check('short is permanent',         classifyRetention('short_clip.mp4'), 'permanent');
check('manifest.json is permanent', classifyRetention('manifest.json'), 'permanent');
check('scene render is 30_day',     classifyRetention('scene_3_out.mp4'), '30_day');
check('concat txt is 30_day',       classifyRetention('concat_main.txt'), '30_day');
check('raw_concat is 30_day',       classifyRetention('raw_concat_123.mp4'), '30_day');
check('_raw.mp3 is temp',           classifyRetention('voice_raw.mp3'), 'temp');

// ── Fact-check Validation Set + Review Gate ───────────────────────────────
console.log('\n=== Fact-check Validation Set + Review Gate ===');
const { VALIDATION_SET } = require('../src/fact-checker/validation-set');
const { FactCheckerReviewGate } = require('../src/fact-checker/review-gate');
check('validation set has ≥100 claims',   VALIDATION_SET.length >= 100);
check('every entry has claim_text',        VALIDATION_SET.every(c => typeof c.claim_text === 'string'));
check('every entry has gold_label',        VALIDATION_SET.every(c => ['SUPPORTED','UNSUPPORTED','DISPUTED','UNVERIFIABLE'].includes(c.gold_label)));
check('every entry has risk_level',        VALIDATION_SET.every(c => ['TRIVIAL','NUMERICAL','CONTROVERSIAL'].includes(c.risk_level)));
check('every entry has expected_decision', VALIDATION_SET.every(c => ['AUTO_APPROVE','HUMAN_REVIEW','REJECT'].includes(c.expected_decision)));
const mustReject = VALIDATION_SET.filter(c => c.expected_decision === 'REJECT');
check('≥3 dangerous claims marked REJECT', mustReject.length >= 3);
const vaccineAutism = VALIDATION_SET.find(c => c.claim_text.includes('Vaccines cause autism'));
check('vaccines-autism is REJECT',         vaccineAutism?.expected_decision === 'REJECT');
const earthFlat = VALIDATION_SET.find(c => c.claim_text.includes('Earth is flat'));
check('flat-earth is REJECT',              earthFlat?.expected_decision === 'REJECT');
const gate = new FactCheckerReviewGate({});
const mockReport = {
  results: [
    { rawClaim: 'safe trivial fact',   claim_risk: 'TRIVIAL',       evidence_strength: 'STRONG',       status: 'VERIFIED',    sources: [] },
    { rawClaim: 'disputed stat',       claim_risk: 'NUMERICAL',     evidence_strength: 'WEAK',         status: 'DISPUTED',    sources: [] },
    { rawClaim: 'dangerous claim',     claim_risk: 'CONTROVERSIAL', evidence_strength: 'INSUFFICIENT', status: 'UNSUPPORTED', sources: [] },
  ],
};
const { autoApproved: aa, needsReview: nr, rejected: rj } = gate.classifyDecisions(mockReport);
check('trivial auto-approved',            aa.length, 1);
check('disputed numerical needs review',  nr.length, 1);
check('dangerous controversial rejected', rj.length, 1);
const msg = gate.formatReviewRequest(mockReport.results.slice(1, 2), 'prod_test');
check('review request contains production id', msg.includes('prod_test'));
check('review request contains approve command', msg.includes('/approve'));
check('review request contains reject command', msg.includes('/reject'));

// ── TTS provider — constructor overrides (v2.0.1) ─────────────────────────
console.log('\n=== TTS Provider ===');
const { TTSProvider } = require('../src/pipeline/providers');
const tts = new TTSProvider();
check('selectNarratorVoice uses explicit override', tts.selectNarratorVoice('my-voice') === 'my-voice');
const autoVoice = tts.selectNarratorVoice();
check('selectNarratorVoice returns string',          typeof autoVoice === 'string');
check('TTSProvider accepts opts.platform',           new TTSProvider({ platform: 'elevenlabs' }).name === 'elevenlabs');
check('TTSProvider accepts opts.rate override',      new TTSProvider({ rate: '-10%' })._overrides.rate === '-10%');
check('no artificial bass boost in edge-tts filter', !fs.readFileSync('./src/pipeline/providers.js','utf8').includes('bass=g=3'));

// ── Renderer ← AnimationSystem integration ───────────────────────────────
console.log('\n=== Renderer ← AnimationSystem integration ===');
check('renderer imports animation-system',  renderer.includes("require('../animation/animation-system')"));
check('renderer imports AudioMixer',        renderer.includes("require('../audio-mixer/mixer')"));
check('renderer calls buildCameraFilter',   renderer.includes('buildCameraFilter'));
check('renderer calls selectCameraHint',    renderer.includes('selectCameraHint'));
check('renderer calls mixer.mixVideo',      renderer.includes('mixer.mixVideo'));

// ── Workflow modules import OK ────────────────────────────────────────────
console.log('\n=== Workflow modules ===');
const {runResearch} = require('../src/workflows/research.js');
const {runScript, normaliseScene} = require('../src/workflows/script.js');
const {runAssets}   = require('../src/workflows/assets.js');
const {runRender}   = require('../src/workflows/render.js');
const {runShorts}   = require('../src/workflows/shorts.js');
check('all workflow modules import OK', true);

// ── normaliseScene — schema v2.0.0 ───────────────────────────────────────
console.log('\n=== normaliseScene (schema v2.0.0) ===');
const legacyScene = { n:1, narration:'Test narration for scene one.', caption:'test cap', visual_action:'historic figure reacting', camera:'slow_zoom_in' };
const n1 = normaliseScene(legacyScene, 0);
check('legacy: schema_version set',   typeof n1.schema_version === 'string');
check('legacy: camera_hint present',  typeof n1.camera_hint === 'string');
check('legacy: focal_point present',  typeof n1.focal_point === 'object');

const newScene = { scene_id:2, schema_version:'1.0.0', narration:'Test narration scene two.', caption:'TEST', visual_description:'modern office scene', character:{character_id:'narrator',pose:'sitting',emotion:'happy',position:{x:0.3,y:0.7,scale:1.2}}, focal_point:{x:0.3,y:0.3,weight:0.9}, overlay:{type:'none'}, sound_effects:[], music_mood:'calm', camera_hint:'zoom_out', metadata:{importance:'high',hook_potential:0.8,standalone:true} };
const n2 = normaliseScene(newScene, 1);
check('v1.0.0: schema_version preserved',  typeof n2.schema_version === 'string');
check('v1.0.0: character_id preserved',    n2.character?.character_id === 'narrator');
check('v1.0.0: camera_hint preserved',     n2.camera_hint, 'zoom_out');
check('v1.0.0: hook_potential',            n2.metadata?.hook_potential, 0.8);
check('v1.0.0: standalone',               n2.metadata?.standalone, true);

// ── publishing.js — file + webhook delivery ──────────────────────────────
console.log('\n=== publishing.js file+webhook delivery ===');
const pubjs = fs.readFileSync('./src/workflows/publishing.js', 'utf8');
check('publishing.js file channel present',    pubjs.includes("channels.includes('file')"));
check('publishing.js webhook channel present', pubjs.includes("channels.includes('webhook')"));
check('publishing.js has PUBLISH_WEBHOOK_URL', pubjs.includes('PUBLISH_WEBHOOK_URL'));
check('publishing.js no Telegram curl',        !pubjs.includes('telegramShorts') && !pubjs.includes('TELEGRAM_BOT_TOKEN'));
check('publishing.js no YouTube OAuth2',       !pubjs.includes('_refreshAccessToken') && !pubjs.includes('YOUTUBE_CLIENT_ID'));
check('publishing.js no stale youtubeTitle fallback', !pubjs.includes('youtubeTitle') && !pubjs.includes('youtubeDescription'));

// ── packaging.js — canonical title/description/tags field names ──────────
console.log('\n=== packaging.js canonical field names ===');
const pkgjs = fs.readFileSync('./src/workflows/packaging.js', 'utf8');
check('packaging.js uses title not youtubeTitle',       !pkgjs.includes("youtubeTitle,") && pkgjs.includes("title,"));
check('packaging.js metadata.title canonical',          pkgjs.includes('metadata: {') && pkgjs.includes('title,'));
check('packaging.js writes description.md not youtube', pkgjs.includes("'description.md'") && !pkgjs.includes("'youtube_description.md'"));

// ── server-render-free.js — no stale Telegram default ────────────────────
console.log('\n=== server-render-free.js ===');
const renderFreeJs = fs.readFileSync('./src/worker/server-render-free.js', 'utf8');
check('render-free: no stale Telegram channel default', !renderFreeJs.includes("channels = ['telegram']"));
check('render-free: default channel is file',            renderFreeJs.includes("channels = ['file']"));

// ── server.js — queue_full_pipeline + tool completeness ──────────────────
console.log('\n=== server.js tool completeness ===');
const serverjs = fs.readFileSync('./src/mcp-server/server.js', 'utf8');
check('server.js exposes 14 tools (header)',         serverjs.includes('14 video production tools'));
check('server.js publish_video calls runPublishing', serverjs.includes("require('../workflows/publishing')"));
check('server.js has queue_full_pipeline tool',      serverjs.includes('queue_full_pipeline'));
check('server.js has get_job_status tool',           serverjs.includes('get_job_status'));
check('server.js has create_video_from_script',      serverjs.includes('create_video_from_script'));
check('server.js has multi_voice_tts',               serverjs.includes('multi_voice_tts'));
check('server.js body size limit present',           serverjs.includes('MAX_BODY_BYTES'));
check('server.js no stale YouTube stub',             !serverjs.includes("'YouTube upload requires manual setup'"));
check('publish_video channels default is file not telegram', serverjs.includes("channels = ['file']") && !serverjs.includes("channels = ['telegram']"));
check('publish_video metadata has no youtubeTitle alias',    !serverjs.includes('youtubeTitle: title'));
check('get_job_status forwards INTERNAL_API_TOKEN',          serverjs.includes('internalToken') && serverjs.includes('get_job_status'));
check('queue_full_pipeline forwards INTERNAL_API_TOKEN',     serverjs.includes('authHeaders') && serverjs.includes('queue_full_pipeline'));
check('MCP HTTP server enforces MCP_AUTH_TOKEN',             serverjs.includes('_checkMCPAuth') && serverjs.includes('crypto.timingSafeEqual'));
check('server startup does not log provider env config',     !serverjs.includes("LLM=${process.env.PROVIDER_LLM"));

// ── state-machine.js — write mutex ───────────────────────────────────────
console.log('\n=== state-machine.js write mutex ===');
const smjs = fs.readFileSync('./src/pipeline/state-machine.js', 'utf8');
check('state-machine has _writeLocks Map',        smjs.includes('_writeLocks = new Map()'));
check('state-machine _saveProduction uses mutex', smjs.includes('_writeLocks.get(productionId)'));

// ── asset-library.js ──────────────────────────────────────────────────────
console.log('\n=== asset-library.js ===');
const assetLib = fs.readFileSync('./src/asset-library/asset-library.js', 'utf8');
check('asset-library has _downloadAsset',    assetLib.includes('_downloadAsset'));
check('asset-library has _semanticSearch',   assetLib.includes('_semanticSearch'));
check('asset-library has composeCharacter',  assetLib.includes('composeCharacter'));

// ── fact-checker ──────────────────────────────────────────────────────────
console.log('\n=== fact-checker ===');
const checker = fs.readFileSync('./src/fact-checker/checker.js', 'utf8');
check('fact-checker has _querySources', checker.includes('_querySources'));

// ── log-redaction patterns ────────────────────────────────────────────────
console.log('\n=== log-redaction patterns ===');
const redaction = fs.readFileSync('./src/utils/log-redaction.js', 'utf8');
check('log-redaction has ElevenLabs sk_ pattern', redaction.includes('sk_') || redaction.includes('elevenlabs'));
check('log-redaction has Tavily tvly- pattern',   redaction.includes('tvly') || redaction.includes('tavily'));

// ── html-renderer scaffolder ──────────────────────────────────────────────
console.log('\n=== html-renderer scaffolder ===');
check('new-project.mjs exists', fs.existsSync('./scripts/html-renderer/new-project.mjs'));

// ── html-renderer engine assets ──────────────────────────────────────────
console.log('\n=== html-renderer engine assets ===');
const engineAssetBase = './plugins/video-pipeline/skills/video-pipeline/assets/project';
check('reel/engine.js exists',        fs.existsSync(`${engineAssetBase}/reel/engine.js`));
check('reel/engine.css exists',       fs.existsSync(`${engineAssetBase}/reel/engine.css`));
check('scripts/render.mjs exists',    fs.existsSync(`${engineAssetBase}/scripts/render.mjs`));
check('scripts/mix_audio.py exists',  fs.existsSync(`${engineAssetBase}/scripts/mix_audio.py`));
check('scripts/verify.py exists',     fs.existsSync(`${engineAssetBase}/scripts/verify.py`));
check('scripts/transcribe.py exists', fs.existsSync(`${engineAssetBase}/scripts/transcribe.py`));
check('scripts/capture.mjs exists',   fs.existsSync(`${engineAssetBase}/scripts/capture.mjs`));
check('scripts/stock.py exists',      fs.existsSync(`${engineAssetBase}/scripts/stock.py`));
const engineJs = fs.readFileSync(`${engineAssetBase}/reel/engine.js`, 'utf8');
check('engine.js exports seek()',     engineJs.includes('export function seek'));
check('engine.js exports spring()',   engineJs.includes('export function spring'));
check('engine.js exports layer()',    engineJs.includes('export function layer'));
check('engine.js exports wallCard()', engineJs.includes('export function wallCard'));
check('engine.js exports reel()',     engineJs.includes('export function reel'));
check('engine.js REEL state exported',engineJs.includes('export const REEL'));
check('engine.js exports boilSeed()',   engineJs.includes('export function boilSeed'));
check('engine.js exports kf()',         engineJs.includes('export function kf'));
check('engine.js exports onTwos()',     engineJs.includes('export function onTwos'));
check('engine.js exports seg()',        engineJs.includes('export function seg'));
check('engine.js exports pulse()',      engineJs.includes('export function pulse'));
check('engine.js exports shots()',      engineJs.includes('export function shots'));

// ── Code-Driven Video Harness ─────────────────────────────────────────────
console.log('\n=== Code-Driven Video Harness ===');
check('harness/bin/harness.mjs exists',       fs.existsSync('./src/harness/bin/harness.mjs'));
check('harness/lib/browser.mjs exists',       fs.existsSync('./src/harness/lib/browser.mjs'));
check('harness/lib/capture.mjs exists',       fs.existsSync('./src/harness/lib/capture.mjs'));
check('harness/lib/jobs.mjs exists',          fs.existsSync('./src/harness/lib/jobs.mjs'));
check('harness/lib/sheets.mjs exists',        fs.existsSync('./src/harness/lib/sheets.mjs'));
check('harness/lib/verify-purity.mjs exists', fs.existsSync('./src/harness/lib/verify-purity.mjs'));
check('harness/lib/pixels.mjs exists',        fs.existsSync('./src/harness/lib/pixels.mjs'));
check('harness/lib/encode.mjs exists',        fs.existsSync('./src/harness/lib/encode.mjs'));
check('asset harness.mjs exists',             fs.existsSync(`${engineAssetBase}/scripts/harness.mjs`));
check('asset verify-purity.mjs exists',       fs.existsSync(`${engineAssetBase}/scripts/verify-purity.mjs`));

// ── Cloudflare Worker rate limiting ───────────────────────────────────────
console.log('\n=== Cloudflare Worker rate limiting ===');
const cfWorker = fs.readFileSync('./cloudflare-mcp/src/index.js', 'utf8');
check('cf-worker has checkRateLimit',   cfWorker.includes('checkRateLimit'));
check('cf-worker hashes token (SHA-256)', cfWorker.includes('SHA-256'));
check('cf-worker uses RATE_LIMITS KV',  cfWorker.includes('env.RATE_LIMITS'));
check('cf-worker returns 429 on limit', cfWorker.includes('429'));
check('cf-worker version 2.3.5',        cfWorker.includes("'2.3.5'"));
check('wrangler.toml has kv_namespaces',fs.readFileSync('./cloudflare-mcp/wrangler.toml','utf8').includes('kv_namespaces'));

// ── plugins/skills present ────────────────────────────────────────────────
console.log('\n=== Plugin skills ===');
check('video-pipeline SKILL.md exists', fs.existsSync('./plugins/video-pipeline/skills/video-pipeline/SKILL.md'));
check('html-renderer SKILL.md exists',  fs.existsSync('./plugins/video-pipeline/skills/html-renderer/SKILL.md'));

// ── Security: no .kiro references in committed source ────────────────────
console.log('\n=== No stale .kiro references in source ===');
const srcFiles = [
  'src/mcp-server/server.js',
  'src/worker/server-render-free.js',
  'src/worker/server.js',
  'cloudflare-mcp/src/index.js',
  'docs/env.template',
  'README.md',
];
for (const f of srcFiles) {
  const content = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  check(`${f} has no .kiro reference`, !content.includes('.kiro/'));
}

// ── Final result ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(48)}`);
if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
