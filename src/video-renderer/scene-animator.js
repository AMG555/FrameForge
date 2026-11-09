'use strict';
/**
 * Scene Animator — Dynamic, Context-Driven Animation Engine
 *
 * Generates self-contained HTML/Canvas animation scenes tailored to the video's
 * topic, style, language, and script narrative. Every scene is a pure function of t
 * under the FrameForge harness contract.
 *
 * Supported Aesthetics:
 * - cyber_tech:             Neon cyan/magenta, perspective grids, circuit lines, neural mesh
 * - cinematic_documentary:  Warm sepia/gold, dust motes, archival maps, monuments, royal seals
 * - finance_executive:      Deep sapphire, emerald bull green, candlestick charts, tickers
 * - retro_synthwave:        Indigo sunset, hot pink, horizon sun, 80s scanlines, laser grids
 * - nature_organic:         Forest emerald, sage, 3D DNA double-helix, floating pollen spores
 * - hype_sports:            Asphalt black, crimson/neon lime, angled speed streaks, acoustic shockwaves
 * - minimal_luxury:         Matte black, champagne/rose gold, 3D wireframe polyhedra, architectural dots
 * - breaking_news:          Newsroom slate, alert red, rotating 3D wireframe globe, radar sweeps
 * - cosmic_space:           Deep nebula, 3D Earth, orbiting satellites, microwave wavefronts
 * - warm_creative:          Terracotta, sunshine amber, organic morphing geometry, playful springs
 */

const fs   = require('fs');
const path = require('path');

// ── Multilingual Font Resolution by Script ─────────────────────────────────────
const REGIONAL_FONTS = {
  malayalam: `'Nirmala UI', 'Noto Sans Malayalam', 'Malayalam Sangam MN', 'Kartika', 'Meera', 'Manjari'`,
  devanagari: `'Nirmala UI', 'Noto Sans Devanagari', 'Mangal', 'Aparajita'`,
  tamil: `'Nirmala UI', 'Noto Sans Tamil', 'Latha', 'Vijaya'`,
  telugu: `'Nirmala UI', 'Noto Sans Telugu', 'Gautami', 'Vani'`,
  arabic: `'Segoe UI', 'Amiri', 'Noto Sans Arabic', 'Traditional Arabic'`,
  cjk: `'Yu Gothic', 'Meiryo', 'Hiragino Sans', 'Microsoft YaHei', 'Malgun Gothic', 'Noto Sans CJK'`,
};

function getScriptFontStack(text = '', language = '') {
  const lang = (language || '').toLowerCase().slice(0, 2);
  if (lang === 'ml' || /[\u0D00-\u0D7F]/.test(text)) return REGIONAL_FONTS.malayalam;
  if (lang === 'hi' || lang === 'mr' || lang === 'ne' || /[\u0900-\u097F]/.test(text)) return REGIONAL_FONTS.devanagari;
  if (lang === 'ta' || /[\u0B80-\u0BFF]/.test(text)) return REGIONAL_FONTS.tamil;
  if (lang === 'te' || /[\u0C00-\u0C7F]/.test(text)) return REGIONAL_FONTS.telugu;
  if (lang === 'ar' || lang === 'ur' || /[\u0600-\u06FF]/.test(text)) return REGIONAL_FONTS.arabic;
  if (lang === 'ja' || lang === 'zh' || lang === 'ko' || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) return REGIONAL_FONTS.cjk;
  return null;
}

// ── Aesthetic Definitions ──────────────────────────────────────────────────────
const AESTHETICS = {
  hand_drawn_doodle: {
    name: 'Hand-Drawn Doodle',
    palettes: [
      { bg0: '#ffffff', bg1: '#faf7f2', bg2: '#f6f1e8', stroke: '#1c1917', strokeAlt: '#44403c', accent: '#c2410c', accent2: '#d97706', cardBg: 'rgba(255, 255, 255, 0.95)', cardBorder: 'rgba(28, 25, 23, 0.25)', tag: 'DOODLE', isLight: true },
      { bg0: '#fdfbf7', bg1: '#f8f4eb', bg2: '#f3ece0', stroke: '#18181b', strokeAlt: '#3f3f46', accent: '#15803d', accent2: '#b45309', cardBg: 'rgba(255, 255, 255, 0.95)', cardBorder: 'rgba(24, 24, 27, 0.25)', tag: 'SKETCH', isLight: true },
      { bg0: '#fcfaf5', bg1: '#f7f2e7', bg2: '#f0e8d8', stroke: '#0f172a', strokeAlt: '#334155', accent: '#0369a1', accent2: '#c2410c', cardBg: 'rgba(255, 255, 255, 0.95)', cardBorder: 'rgba(15, 23, 42, 0.25)', tag: 'INK', isLight: true },
    ],
    fontFamily: (script) => script ? `${script}, 'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive, sans-serif` : `'Caveat', 'Patrick Hand', 'Segoe UI', cursive, sans-serif`,
    fontDisplayWeight: '700',
    backgroundType: 'paper_texture',
    springTension: 160,
    springFriction: 14,
  },
  cyber_tech: {
    name: 'Cyber Tech',
    palettes: [
      { bg0: '#142036', bg1: '#0b111c', bg2: '#05080f', accent: '#00f0ff', accent2: '#d946ef', cardBg: 'rgba(9, 16, 29, 0.85)', cardBorder: 'rgba(0, 240, 255, 0.3)', tag: 'CYBER TECH' },
      { bg0: '#1a1033', bg1: '#0e081c', bg2: '#05030b', accent: '#818cf8', accent2: '#38bdf8', cardBg: 'rgba(16, 11, 31, 0.85)', cardBorder: 'rgba(129, 140, 248, 0.3)', tag: 'SYSTEM MATRIX' },
      { bg0: '#082522', bg1: '#041614', bg2: '#020908', accent: '#10b981', accent2: '#06b6d4', cardBg: 'rgba(6, 26, 23, 0.85)', cardBorder: 'rgba(16, 185, 129, 0.3)', tag: 'NEURAL LINK' },
    ],
    fontFamily: (script) => script ? `${script}, 'Rajdhani', -apple-system, sans-serif` : `'Rajdhani', 'Segoe UI', -apple-system, sans-serif`,
    fontDisplayWeight: '800',
    backgroundType: 'grid_perspective',
    springTension: 200,
    springFriction: 13,
  },
  cinematic_documentary: {
    name: 'Cinematic Documentary',
    palettes: [
      { bg0: '#261b11', bg1: '#150e09', bg2: '#0a0604', accent: '#d4af37', accent2: '#f59e0b', cardBg: 'rgba(28, 19, 13, 0.88)', cardBorder: 'rgba(212, 175, 55, 0.35)', tag: 'HISTORICAL ARCHIVE' },
      { bg0: '#1e1c18', bg1: '#11100e', bg2: '#080807', accent: '#e2d9c8', accent2: '#d4af37', cardBg: 'rgba(22, 20, 17, 0.88)', cardBorder: 'rgba(226, 217, 200, 0.3)', tag: 'CHRONICLE' },
      { bg0: '#1a1f1d', bg1: '#0e1211', bg2: '#060807', accent: '#5eead4', accent2: '#e2d9c8', cardBg: 'rgba(18, 23, 21, 0.88)', cardBorder: 'rgba(94, 234, 212, 0.3)', tag: 'HERITAGE' },
    ],
    fontFamily: (script) => script ? `${script}, 'Cinzel', 'Georgia', serif` : `'Cinzel', 'Georgia', 'Times New Roman', serif`,
    fontDisplayWeight: '700',
    backgroundType: 'particles_dust',
    springTension: 120,
    springFriction: 18,
  },
  finance_executive: {
    name: 'Finance Executive',
    palettes: [
      { bg0: '#091e2b', bg1: '#041017', bg2: '#02070a', accent: '#10b981', accent2: '#38bdf8', cardBg: 'rgba(7, 22, 33, 0.9)', cardBorder: 'rgba(16, 185, 129, 0.35)', tag: 'MARKET INTELLIGENCE' },
      { bg0: '#161426', bg1: '#0b0a14', bg2: '#040308', accent: '#6366f1', accent2: '#10b981', cardBg: 'rgba(15, 13, 28, 0.9)', cardBorder: 'rgba(99, 102, 241, 0.35)', tag: 'QUANT ANALYSIS' },
      { bg0: '#211516', bg1: '#120a0b', bg2: '#060303', accent: '#ef4444', accent2: '#f59e0b', cardBg: 'rgba(24, 13, 14, 0.9)', cardBorder: 'rgba(239, 68, 68, 0.35)', tag: 'VOLATILITY DESK' },
    ],
    fontFamily: (script) => script ? `${script}, 'Inter', 'Helvetica Neue', sans-serif` : `'Inter', 'Helvetica Neue', Arial, sans-serif`,
    fontDisplayWeight: '800',
    backgroundType: 'candlestick_charts',
    springTension: 170,
    springFriction: 14,
  },
  retro_synthwave: {
    name: 'Retro Synthwave',
    palettes: [
      { bg0: '#2d0938', bg1: '#16041c', bg2: '#08010a', accent: '#ff2a85', accent2: '#00f0ff', cardBg: 'rgba(35, 7, 45, 0.85)', cardBorder: 'rgba(255, 42, 133, 0.45)', tag: 'SYNTH RUNNER' },
      { bg0: '#140c38', bg1: '#08041c', bg2: '#02010a', accent: '#a855f7', accent2: '#f43f5e', cardBg: 'rgba(18, 10, 48, 0.85)', cardBorder: 'rgba(168, 85, 247, 0.45)', tag: 'NEON HORIZON' },
    ],
    fontFamily: (script) => script ? `${script}, 'Orbitron', 'Courier New', monospace` : `'Orbitron', 'Courier New', monospace`,
    fontDisplayWeight: '800',
    backgroundType: 'retro_horizon',
    springTension: 190,
    springFriction: 11,
  },
  nature_organic: {
    name: 'Nature Organic',
    palettes: [
      { bg0: '#0c2617', bg1: '#05140b', bg2: '#020804', accent: '#22c55e', accent2: '#86efac', cardBg: 'rgba(9, 28, 17, 0.85)', cardBorder: 'rgba(34, 197, 94, 0.35)', tag: 'BIOSPHERE' },
      { bg0: '#0c2326', bg1: '#051314', bg2: '#020708', accent: '#14b8a6', accent2: '#a7f3d0', cardBg: 'rgba(9, 26, 28, 0.85)', cardBorder: 'rgba(20, 184, 166, 0.35)', tag: 'HYDRO WAVE' },
    ],
    fontFamily: (script) => script ? `${script}, 'DM Sans', -apple-system, sans-serif` : `'DM Sans', -apple-system, sans-serif`,
    fontDisplayWeight: '700',
    backgroundType: 'organic_ripples',
    springTension: 140,
    springFriction: 15,
  },
  hype_sports: {
    name: 'Hype Sports',
    palettes: [
      { bg0: '#2b0c10', bg1: '#170507', bg2: '#0a0102', accent: '#ef4444', accent2: '#f59e0b', cardBg: 'rgba(32, 8, 12, 0.9)', cardBorder: 'rgba(239, 68, 68, 0.45)', tag: 'HIGH VOLTAGE' },
      { bg0: '#262208', bg1: '#141203', bg2: '#080701', accent: '#84cc16', accent2: '#ef4444', cardBg: 'rgba(28, 25, 6, 0.9)', cardBorder: 'rgba(132, 204, 22, 0.45)', tag: 'MAX INTENSITY' },
      { bg0: '#141416', bg1: '#0c0c0d', bg2: '#040405', accent: '#ffffff', accent2: '#ef4444', cardBg: 'rgba(18, 18, 20, 0.9)', cardBorder: 'rgba(255, 255, 255, 0.35)', tag: 'OVERDRIVE' },
    ],
    fontFamily: (script) => script ? `${script}, 'Anton', 'Teko', 'Arial Black', sans-serif` : `'Anton', 'Teko', 'Arial Black', sans-serif`,
    fontDisplayWeight: '900',
    backgroundType: 'speed_streaks',
    springTension: 240,
    springFriction: 12,
  },
  minimal_luxury: {
    name: 'Minimal Luxury',
    palettes: [
      { bg0: '#1a1a1c', bg1: '#101012', bg2: '#080809', accent: '#ffffff', accent2: '#a87954', cardBg: 'rgba(18, 18, 20, 0.8)', cardBorder: 'rgba(255, 255, 255, 0.15)', tag: 'ATELIER' },
      { bg0: '#1c1618', bg1: '#110d0f', bg2: '#080506', accent: '#f43f5e', accent2: '#e2e8f0', cardBg: 'rgba(20, 15, 17, 0.8)', cardBorder: 'rgba(244, 63, 94, 0.25)', tag: 'COUTURE' },
      { bg0: '#13181a', bg1: '#0b0f10', bg2: '#050708', accent: '#38bdf8', accent2: '#cbd5e1', cardBg: 'rgba(14, 19, 21, 0.8)', cardBorder: 'rgba(56, 189, 248, 0.25)', tag: 'ARCHITECT' },
    ],
    fontFamily: (script) => script ? `${script}, 'Plus Jakarta Sans', 'Poppins', -apple-system, sans-serif` : `'Plus Jakarta Sans', 'Poppins', -apple-system, sans-serif`,
    fontDisplayWeight: '600',
    backgroundType: 'geometric_silhouettes',
    springTension: 130,
    springFriction: 17,
  },
  breaking_news: {
    name: 'Breaking News',
    palettes: [
      { bg0: '#240f13', bg1: '#14070a', bg2: '#080203', accent: '#dc2626', accent2: '#ffffff', cardBg: 'rgba(26, 10, 14, 0.92)', cardBorder: 'rgba(220, 38, 38, 0.45)', tag: 'BREAKING NEWS' },
      { bg0: '#101c2e', bg1: '#08101c', bg2: '#03060d', accent: '#38bdf8', accent2: '#dc2626', cardBg: 'rgba(11, 22, 38, 0.92)', cardBorder: 'rgba(56, 189, 248, 0.4)', tag: 'SPECIAL REPORT' },
    ],
    fontFamily: (script) => script ? `${script}, 'Oswald', 'Franklin Gothic Medium', sans-serif` : `'Oswald', 'Franklin Gothic Medium', sans-serif`,
    fontDisplayWeight: '700',
    backgroundType: 'radar_globe',
    springTension: 220,
    springFriction: 14,
  },
  cosmic_space: {
    name: 'Cosmic Space',
    palettes: [
      { bg0: '#131138', bg1: '#09081f', bg2: '#03020a', accent: '#38bdf8', accent2: '#c084fc', cardBg: 'rgba(12, 10, 38, 0.88)', cardBorder: 'rgba(56, 189, 248, 0.4)', tag: 'ORBITAL MECHANICS' },
      { bg0: '#0d1f36', bg1: '#06101c', bg2: '#02050a', accent: '#00f0ff', accent2: '#38bdf8', cardBg: 'rgba(8, 20, 38, 0.88)', cardBorder: 'rgba(0, 240, 255, 0.4)', tag: 'DEEP SPACE' },
      { bg0: '#1f0d2b', bg1: '#100617', bg2: '#060209', accent: '#f43f5e', accent2: '#e879f9', cardBg: 'rgba(20, 8, 28, 0.88)', cardBorder: 'rgba(244, 63, 94, 0.4)', tag: 'SUPERNOVA' },
    ],
    fontFamily: (script) => script ? `${script}, 'Space Grotesk', -apple-system, sans-serif` : `'Space Grotesk', 'Segoe UI', -apple-system, sans-serif`,
    fontDisplayWeight: '700',
    backgroundType: 'cosmic_stars',
    springTension: 150,
    springFriction: 14,
  },
  warm_creative: {
    name: 'Warm Creative',
    palettes: [
      { bg0: '#2b1910', bg1: '#190d07', bg2: '#0a0502', accent: '#f97316', accent2: '#fbbf24', cardBg: 'rgba(32, 18, 11, 0.85)', cardBorder: 'rgba(249, 115, 22, 0.35)', tag: 'CREATIVE LAB' },
      { bg0: '#2b1020', bg1: '#180711', bg2: '#090206', accent: '#f43f5e', accent2: '#fbbf24', cardBg: 'rgba(31, 10, 22, 0.85)', cardBorder: 'rgba(244, 63, 94, 0.35)', tag: 'VIBRANT LIFE' },
    ],
    fontFamily: (script) => script ? `${script}, 'Outfit', 'Comfortaa', -apple-system, sans-serif` : `'Outfit', 'Comfortaa', -apple-system, sans-serif`,
    fontDisplayWeight: '700',
    backgroundType: 'particles_dust',
    springTension: 160,
    springFriction: 12,
  },
};

// ── Smart Aesthetic Inference ──────────────────────────────────────────────────
/**
 * Detect the overall aesthetic from prompt/script metadata, topic, style, and tone.
 */
function detectAesthetic({
  topic = '',
  style = '',
  theme = '',
  title = '',
  caption = '',
  narration = '',
  visualDescription = '',
  language = '',
  musicMood = '',
} = {}) {
  // Explicit override wins
  const explicit = (theme || style || '').toLowerCase().trim();
  if (AESTHETICS[explicit]) return explicit;
  if (/doodle|sketch|hand[-\s]?drawn|drawing|white background|cream background|cartoon|illustration/i.test(explicit)) return 'hand_drawn_doodle';
  if (/cyber|tech|code|ai|crypto|hacker|futur/i.test(explicit)) return 'cyber_tech';
  if (/doc|history|ancient|story|cinema|kerala|temple|culture/i.test(explicit)) return 'cinematic_documentary';
  if (/finan|market|stock|money|invest|crypto|business/i.test(explicit)) return 'finance_executive';
  if (/synth|retro|80s|vapor|arcade|game|anime/i.test(explicit)) return 'retro_synthwave';
  if (/nature|green|earth|eco|wild|health|meditat|biology/i.test(explicit)) return 'nature_organic';
  if (/sport|hype|fitness|gym|action|extreme|battle|speed/i.test(explicit)) return 'hype_sports';
  if (/luxury|minimal|design|architect|clean|fashion|apple/i.test(explicit)) return 'minimal_luxury';
  if (/news|alert|urgent|crisis|report|scandal/i.test(explicit)) return 'breaking_news';
  if (/space|cosmos|universe|planet|astro|quantum/i.test(explicit)) return 'cosmic_space';

  // Keyword scan across all textual signals (English + Multilingual)
  const combined = `${topic} ${title} ${visualDescription} ${narration} ${caption} ${musicMood}`.toLowerCase();

  // Hand-Drawn Doodle / Sketch / Cartoon
  if (/(?:^|[^\w])(doodle|sketch|hand[-\s]?drawn|drawing|white background|cream background|paper|cartoon)(?:[^\w]|$)/.test(combined)
      || /ഡൂഡിൽ|വര|വരച്ച|ചിത്രരചന|रेखाचित्र|कार्टून/.test(combined)) {
    return 'hand_drawn_doodle';
  }

  // Cosmic Space / Quantum / Orbital
  if (/(?:^|[^\w])(quantum|astronomy|galaxy|universe|space|mars|satellite|telescope|cosmos|interstellar|orbit|gps|satellites)(?:[^\w]|$)/.test(combined)
      || /പ്രപഞ്ച|ബഹിരാകാശ|നക്ഷത്ര|ഗ്രഹം|ഉപഗ്രഹ|ജ്യോതിശാസ്ത്ര|अंतरिक्ष|ब्रह्मांड|तारा|விண்வெளி|பிரபஞ்சம்/.test(combined)) {
    return 'cosmic_space';
  }
  // Cinematic Documentary / History / Heritage / Culture
  if (/(?:^|[^\w])(history|ancient|king|temple|civilization|century|heritage|monument|museum|kerala|parashurama|samuthiri|thiruvithamkoor|tradition|folklore|epic|archive|biography|documentary|empire)(?:[^\w]|$)/.test(combined)
      || /ചരിത്ര|പുരാതന|സാമ്രാജ്യ|രാജവംശ|ക്ഷേത്ര|പാരമ്പര്യ|സംസ്കാര|കേരള|നാട്ടുരാജ്യ|ഇതിഹാസ|സ്മാരക|വാസ്തുവിദ്യ|इतिहास|प्राचीन|संस्कृति|साम्राज्य|मंदिर|धरोहर|வரலாறு|பழங்கால|பேரரசு|கோவில்|பாரம்பரியம்/.test(combined)) {
    return 'cinematic_documentary';
  }
  // Finance / Markets / Wealth
  if (/(?:^|[^\w])(stock|crypto|bitcoin|market|invest|trading|inflation|economy|gdp|finance|fund|valuation|revenue|profit|banking|shares|trillion|billion|wealth)(?:[^\w]|$)/.test(combined)
      || /നിക്ഷേപ|ഓഹരി|വിപണി|പണം|സാമ്പത്തിക|ലാഭം|ബാങ്ക്|സമ്പത്ത്|वित्त|बाज़ार|शेयर|निवेश|व्यापार|धन|मुதலீடு|பங்குச்சந்தை|பொருளாதாரம்/.test(combined)) {
    return 'finance_executive';
  }
  // Cyber / Tech / Software
  if (/(?:^|[^\w])(code|algorithm|software|developer|api|python|javascript|rust|neural|llm|compiler|linux|server|cloud|github|framework|database|terminal|cyber|robot)(?:[^\w]|$)/.test(combined)
      || /സാങ്കേതിക|കോഡിംഗ്|സോഫ്റ്റ്‌വെയർ|കമ്പ്യൂട്ടർ|പ്രോഗ്രാമിംഗ്|तकनीक|सॉफ्टवेयर|कंप्यूटर|தொழில்நுட்பம்|மென்பொருள்/.test(combined)) {
    return 'cyber_tech';
  }
  // Retro Synthwave
  if (/(?:^|[^\w])(synthwave|80s|neon|retrowave|arcade|pixel|game|vaporwave|outrun|retro)(?:[^\w]|$)/.test(combined)) {
    return 'retro_synthwave';
  }
  // Nature / Organic
  if (/(?:^|[^\w])(nature|forest|ocean|plant|wildlife|animal|tree|climate|carbon|organic|meditation|ayurveda|ecology|water|river|green)(?:[^\w]|$)/.test(combined)
      || /പ്രകൃതി|വനം|കാട്|പരിസ്ഥിതി|ആയുർവേദ|ജീവൻ|പച്ചപ്പ്|നദി|പ്രകൃതിദത്ത|प्रकृति|जंगल|पर्यावरण|आयुर्वेद|இயற்கை|சுற்றுச்சூழல்/.test(combined)) {
    return 'nature_organic';
  }
  // Hype Sports
  if (/(?:^|[^\w])(sports|workout|gym|athlete|championship|extreme|speed|race|muscle|football|cricket|danger|vs|versus|hype|adrenaline)(?:[^\w]|$)/.test(combined)
      || /കായിക|മത്സര|വേഗത|വ്യായാമം|ചാമ്പ്യൻ|खेल|कसरत|प्रतियोगिता|விளையாட்டு/.test(combined)) {
    return 'hype_sports';
  }
  // Breaking News
  if (/(?:^|[^\w])(breaking|news|headline|reported|urgent|scandal|investigation|exclusive|update|alert|police|crisis)(?:[^\w]|$)/.test(combined)
      || /വാർത്ത|അടിയന്തര|ബ്രേക്കിംഗ്|അറിയിപ്പ്|समाचार|ताज़ा खबर|आपातकाल|செய்தி|முக்கிய செய்தி/.test(combined)) {
    return 'breaking_news';
  }
  // Minimal Luxury
  if (/(?:^|[^\w])(luxury|minimal|architect|premium|bespoke|couture|gallery|elegance|aesthetic|curated|pure)(?:[^\w]|$)/.test(combined)) {
    return 'minimal_luxury';
  }

  // Fallback by music mood if available
  if (musicMood === 'energetic') return 'hype_sports';
  if (musicMood === 'tense') return 'breaking_news';
  if (musicMood === 'dramatic') return 'cinematic_documentary';
  if (musicMood === 'calm') return 'nature_organic';
  if (musicMood === 'mysterious') return 'cosmic_space';

  // Default to versatile cyber_tech for general modern explainers
  return 'cyber_tech';
}

// ── Component Theme Detection ──────────────────────────────────────────────────
/**
 * Detect the graphic entity to render on the full canvas for a given scene.
 */
function detectComponentTheme({ visualDescription = '', visual_description = '', prompt = '', caption = '', narration = '', topic = '', imagePath = null, aesthetic = 'cyber_tech' } = {}) {
  if (imagePath) return 'image';
  const visDesc = visualDescription || visual_description || prompt || '';
  const text = `${visDesc} ${caption} ${narration} ${topic}`.toLowerCase();

  // ── Doodled Character Actions (Human Stories, History, Evolution, Daily Life) ──
  // 1. Microscope / Lice Theory / Parasite / Genetics (Scene 7)
  if (/(?:^|[^\w])(lice|louse|microscope|fiber|weave|parasite|lice evolution|genetic biology proof)(?:[^\w]|$)/i.test(text)
      || /പേൻ|പേൻ തിയറി|തലയിലെ പേൻ|ശരീരത്തിലെ പേൻ|ലൈസ് തിയറി|മൈക്രോസ്കോപ്പ്/.test(text)) {
    return 'doodle_microscope_lice';
  }

  // 2. Shivering / Cold / Protection Flaw / Winter / Freezing (Scene 2, 6)
  if (/(?:^|[^\w])(shiver|shivering|cold|freeze|freezing|ice|winter|teeth|chatter|protection flaw)(?:[^\w]|$)/i.test(text)
      || /സാധാരണ ധാരണകൾ|തണുപ്പും സംരക്ഷണവും|തള്ളിക്കളയുന്നു|ശരീരത്തെ സംരക്ഷിക്കാൻ|ശരീര സംരക്ഷണം|വിറയ്ക്കുക|തണുപ്പിൽ നിന്ന് രക്ഷ നേടാൻ|തണുപ്പ് എന്ന കാരണം|തണുപ്പുള്ള സ്ഥലങ്ങളിലേക്ക്/.test(text)) {
    return 'doodle_shiver_cold';
  }

  // 3. Hunter in Savannah / Wild / Blazing Sun / Spear / Mosquitoes (Scene 5)
  if (/(?:^|[^\w])(savannah|savanna|spear|hunter|hunting|africa savannah|foraging|wild jungle|mosquito|mosquitoes|thorns)(?:[^\w]|$)/i.test(text)
      || /കാട്ടിൽ നഗ്നരായി|നഗ്നരായിട്ടാണ്|കൊടുംചൂട്|കൊതുകുകടി|മുള്ളുകൾ|കുന്തം|കാട്ടിലെ ലക്ഷക്കണക്കിന്/.test(text)) {
    return 'doodle_hunter_savannah';
  }

  // 4. Meeting Tribes / Social Language / Status / Community / Strangers (Scene 10)
  if (/(?:^|[^\w])(tribe|tribal|clan|stranger|meeting strangers|social language|status in society|hierarchy|friend or enemy)(?:[^\w]|$)/i.test(text)
      || /കൂട്ടമായി|സമൂഹം|അപരിചിത|ഗോത്രം|ശത്രു|സുഹൃത്ത്|സാമൂഹിക ഭാഷ|സാമൂഹിക|സ്ഥാനം തിരിച്ചറിഞ്ഞിരുന്നത്/.test(text)) {
    return 'doodle_tribe_meeting';
  }

  // 5. Future Planning / Cognitive Revolution / Tomorrow / Foresight / Campfire thinking (Scene 8)
  if (/(?:^|[^\w])(planning for tomorrow|future planning|cognitive revolution|thinking future|contemplate|foresight|ian gilligan)(?:[^\w]|$)/i.test(text)
      || /നാളത്തേക്ക്|പ്ലാൻ|ഭാവി|ഭാവിയെ കുറിച്ച്|ബുദ്ധി ഉപയോഗിച്ച്|ചിന്തയിലെ മാറ്റം|ഇയാൻ ഗില്ലിഗൻ|ചിന്തിക്കാൻ തുടങ്ങി/.test(text)) {
    return 'doodle_thinking_future';
  }

  // 6. Bone Needle / Sewing / Stitching / Animal Pelt / Prehistoric Tools (Scene 4)
  if (/(?:^|[^\w])(needle|bone needle|needles|sew|sewing|stitch|stitching|thread|animal hide|leather hide|hide sewing|fur pelt|tailor|sewing tools)(?:[^\w]|$)/i.test(text)
      || /സൂചി|സൂചിയും|തുന്ന|തുന്നാൻ|തോൽ തുന്നാൻ|തുന്നൽ|തോൽ തുന്നാനുള്ള/.test(text)) {
    return 'doodle_sewing_needle';
  }

  // 7. Shame / Mirror / Reflection / Water / Self Awareness / Theory of Mind (Scene 3, 9)
  if (/(?:^|[^\w])(shame|blush|embarrass|mirror|reflection|water pool|theory of mind|how others see|self-aware|identity|looking at me|psychology|mind-shift)(?:[^\w]|$)/i.test(text)
      || /കണ്ണാടി|പ്രതിഫലനം|മറ്റുള്ളവർ എന്നെ|തിയറി ഓഫ് മൈൻഡ്|സ്വന്തം ശരീരം മറച്ചു|വ്യക്തിത്വം|ശ്രദ്ധിക്കുന്നുണ്ട്|യഥാർത്ഥ രഹസ്യം|നാണം മറയ്ക്കാൻ/.test(text)) {
    return 'doodle_shame_reflection';
  }

  // 8. Modern vs Prehistoric Human Comparison (Scene 2)
  if (/(?:^|[^\w])(modern vs ancient|modern human|fashionable|modern vs prehistoric|split-screen|split screen|transformation|then and now|evolution of human)(?:[^\w]|$)/i.test(text)
      || /ഫാഷൻ|ആധുനിക മനുഷ്യൻ|പുരാതന മനുഷ്യൻ|കടകളോ|ആധുനികവും പുരാതനവും/.test(text)) {
    return 'doodle_modern_vs_prehistoric';
  }

  // 9. Dressing / Wardrobe / Wearing Clothes / Outfit / Morning Routine (Scene 1, 11)
  if (/(?:^|[^\w])(dress|dressing|wearing clothes|shirt|wardrobe|closet|hanger|outfit|choose clothes|wear|garment|wedding dress|interview|daily habit|why we wear clothes)(?:[^\w]|$)/i.test(text)
      || /വസ്ത്രധാരണം|ധരിച്ചിട്ടുണ്ടാ|ധരിച്ച|വസ്ത്രം ധരിക്കാൻ|വസ്ത്രത്തിന്|വസ്ത്രം തിരഞ്ഞെടുക്കു|ഷർട്ട്|തിരഞ്ഞെടുത്തത്|തുണി എടുത്തിടുകയല്ല|കല്യാണത്തിന്|ഇന്റർവ്യൂ|ആമുഖം: വസ്ത്രധാരണം|വസ്ത്രം തിരഞ്ഞെടുക്കുമ്പോൾ|വസ്ത്രം തിരഞ്ഞെടുക്കും/.test(text)) {
    return 'doodle_dressing';
  }

  // 10. General Human Character
  if (/(?:^|[^\w])(human|person|man|woman|people|child|guy|doodle|character|actor)(?:[^\w]|$)/i.test(text)
      || /മനുഷ്യൻ|ആളുകൾ|വ്യക്തി/.test(text)) {
    return 'doodle_general_human';
  }

  // Celestial / Orbiting satellites (e.g. GPS, orbital mechanics, planetary science)
  if (/(?:^|[^\w])(orbit|satellite|satellites|gps|planet|earth|mars|moon|galaxy|universe|solar|astronomy|gravity|space|telescope|interstellar)(?:[^\w]|$)/.test(text)
      || /ബഹിരാകാശ|ഗ്രഹം|ഉപഗ്രഹ|ഭൂമി|നക്ഷത്ര|പ്രപഞ്ച|अंतरिक्ष|ग्रह|तारा|விண்வெளி/.test(text)) {
    return 'celestial_orbit';
  }

  // DNA / Organic cellular helix
  if (/(?:^|[^\w])(dna|helix|gene|cell|molecule|biology|organism|protein|virus|bacteria|medical|genetic|chromosome)(?:[^\w]|$)/.test(text)
      || /ഡിഎൻഎ|കോശം|തന്മാത്ര|ജീവശാസ്ത്ര|डीएनए|कोशिका/.test(text)) {
    return 'dna_helix';
  }

  // Radar Globe / World Map
  if (/(?:^|[^\w])(globe|map|world|geography|radar|international|continent|territory|country|border|location)(?:[^\w]|$)/.test(text)
      || /ഭൂപടം|ലോകം|ഭൂഖണ്ഡം|ഭൂപട|नक्शा|ग्लोब/.test(text)) {
    return 'radar_globe';
  }

  // Quote / Speech
  if (/(?:^|[^\w])(quote|speech|said|proverb|statement|narrator|words|motto|philosophy|wisdom)(?:[^\w]|$)/.test(text)
      || /വാചകം|ഉദ്ധരണി|വാക്കുകൾ|कथन/.test(text)) {
    return 'quote';
  }

  // High Velocity Speed Action
  if (/(?:^|[^\w])(sports|workout|gym|athlete|speed|streaks|race|championship|extreme|versus|vs|hype|adrenaline|power|velocity|fast)(?:[^\w]|$)/.test(text)
      || /കായിക|മത്സര|വേഗത|വ്യായാമം|खेल|दौड़/.test(text)) {
    return 'speed_action';
  }

  // Metric / Numerical KPI
  if (/(?:^|[^\w])(metric|counter|number|percentage|score|stat|gain|roi|accuracy|target|kpi|growth)(?:[^\w]|$)/.test(text)
      || /ശതമാനം|അളവ്|പ്രകടനം|प्रतिशत/.test(text)) {
    return 'metric';
  }

  // Timeline / Milestones / Chronology
  if (/(?:^|[^\w])(timeline|milestone|chronology|history|evolution|roadmap|phase|journey|centuries|years|era|ancient|century|dynasty|temple|monument)(?:[^\w]|$)/.test(text)
      || /ചരിത്ര|പുരാതന|സാമ്രാജ്യ|രാജവംശ|പാരമ്പര്യ|ഇതിഹാസ|इतिहास|प्राचीन|धरोहर/.test(text)) {
    return 'timeline';
  }

  // Code / Programming IDE
  if (/(?:^|[^\w])(code|function|syntax|api|javascript|python|typescript|json|sql|query|endpoint|algorithm|struct|cli|terminal|bash|shell|npm|git|compiler|linux|rust)(?:[^\w]|$)/.test(text)
      || /കോഡിംഗ്|സോഫ്റ്റ്‌വെയർ|പ്രോഗ്രാമിംഗ്|कोड|सॉफ्टवेयर/.test(text)) {
    return 'code';
  }

  // Chart / Finance / Economics
  if (/(?:^|[^\w])(chart|data|analytics|growth|graph|statistic|bars|volume|distribution|stock|crypto|bitcoin|market|invest|trading|inflation|economy|gdp|finance|gain|loss|bull|bear|candlestick|price)(?:[^\w]|$)/.test(text)
      || /നിക്ഷേപ|ഓഹരി|വിപണി|പണം|ചാർട്ട്|शेयर|बाज़ार/.test(text)) {
    return 'chart';
  }

  // Neural Network Nodes
  if (/(?:^|[^\w])(network|node|nodes|ai|model|neural|pipeline|architecture|server|system|mesh|connect|synapse|deep learning)(?:[^\w]|$)/.test(text)
      || /നെറ്റ്‌വർക്ക്|സിനാപ്സ്|ശൃംഖല|नेटवर्क/.test(text)) {
    return 'nodes';
  }

  // 3D Isometric Geometry / Polyhedron
  if (/(?:^|[^\w])(cube|geometry|3d|wireframe|isometric|matrix|crystal|structure|polyhedron|dimension|architect|blueprint|math)(?:[^\w]|$)/.test(text)
      || /ജ്യാമിതി|രൂപം|ത്രിമാന|संरचना/.test(text)) {
    return 'isometric_geometry';
  }

  // Fallbacks matched to aesthetic
  if (aesthetic === 'cosmic_space') return 'celestial_orbit';
  if (aesthetic === 'cinematic_documentary') return 'timeline';
  if (aesthetic === 'finance_executive') return 'chart';
  if (aesthetic === 'nature_organic') return 'dna_helix';
  if (aesthetic === 'breaking_news') return 'radar_globe';
  if (aesthetic === 'cyber_tech') return 'nodes';
  if (aesthetic === 'minimal_luxury') return 'isometric_geometry';
  if (aesthetic === 'hype_sports') return 'speed_action';
  return 'waveform';
}

// ── Harness HTML Wrapper for User / Agent Code ────────────────────────────────
/**
 * Wrap agent-provided Canvas drawing code into a pure-function-of-t harness page.
 */
function wrapCodeInHarnessHtml({
  code = '',
  duration = 3,
  width = 1920,
  height = 1080,
  language = '',
  style = '',
  topic = '',
} = {}) {
  const scriptFont = getScriptFontStack('', language);
  const aestheticKey = detectAesthetic({ topic, style, language });
  const aesthetic = AESTHETICS[aestheticKey] || AESTHETICS.cyber_tech;
  const fontDisplay = aesthetic.fontFamily(scriptFont);
  const fontBody = scriptFont ? `${scriptFont}, -apple-system, sans-serif` : `'Segoe UI', -apple-system, sans-serif`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: #06090e;
      font-family: ${fontBody};
      -webkit-font-smoothing: antialiased;
    }
    canvas { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
<canvas id="stage" width="${width}" height="${height}"></canvas>
<script>
window.DURATION = ${Math.max(1, Number(duration) || 3)};
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = ${width};
const H = ${height};
const FONT_DISPLAY = ${JSON.stringify(fontDisplay)};
const FONT_BODY = ${JSON.stringify(fontBody)};

// Seeded PRNG for deterministic pure-t rendering
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
const hash = (i) => sfc32(i * 19 + 42, i * 29 + 1337, i * 13 + 7, 99)();

// Animation Primitives & Easing
function clamp(val, min = 0, max = 1) { return Math.max(min, Math.min(max, val)); }
function lerp(t, a, b, t0 = 0, t1 = 1) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  return a + (b - a) * ((t - t0) / (t1 - t0));
}
function easeIn(t) { return clamp(t, 0, 1) ** 2; }
function easeOut(t) { const c = clamp(t, 0, 1); return 1 - (1 - c) ** 2; }
function easeInOut(t) { const c = clamp(t, 0, 1); return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) ** 2 / 2; }
function boilSeed(t, seed = 0) {
  const frame12 = Math.floor(t * 12);
  return hash(seed * 1000 + frame12);
}

// Spring dynamics
function spring(t, delay = 0, tension = 180, friction = 14) {
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

window.seek = async (t) => {
  ${code}
};
</script>
</body>
</html>`;
}

// ── Captions Requested Detector ───────────────────────────────────────────────
/** Returns true ONLY if caller explicitly asks for on-screen captions or subtitles in prompt. */
function detectCaptionsRequested(text = '') {
  if (!text || typeof text !== 'string') return false;
  return /(?:with|show|display|include|enable|add)\s+(?:captions?|subtitles?|sub-titles?|subs?)|(?:captions?|subtitles?)\s*[:=]\s*(?:true|yes|1|on|always)/i.test(text);
}

// ── HTML Scene Code Generator ──────────────────────────────────────────────────
/**
 * Generate a complete, self-contained HTML scene conforming to window.seek(t).
 * Paints full-canvas cinematic procedural animations — zero PPT card slideshow patterns.
 */
function generateSceneHtml({
  caption = '',
  narration = '',
  visualDescription = '',
  imagePath = null,
  topic = '',
  style = '',
  theme = '',
  title = '',
  language = '',
  musicMood = 'neutral',
  camera = 'auto',
  cameraHint = 'auto',
  duration = 3,
  width = 1920,
  height = 1080,
  sceneIndex = 0,
  showCaptions = false,
} = {}) {
  const captionsWanted = Boolean(
    showCaptions ||
    detectCaptionsRequested(`${caption} ${narration} ${topic} ${visualDescription} ${style} ${title}`) ||
    process.env.FRAMEFORGE_SHOW_CAPTIONS === '1'
  );
  const aestheticKey = detectAesthetic({
    topic,
    style,
    theme,
    title,
    narration,
    caption,
    visualDescription,
    language,
    musicMood,
  });
  const aesthetic = AESTHETICS[aestheticKey] || AESTHETICS.cyber_tech;
  const compTheme = detectComponentTheme({
    visualDescription,
    caption,
    narration,
    topic,
    imagePath,
    aesthetic: aestheticKey,
  });
  const clampedDur = Math.max(1, Number(duration) || 3);

  // Select palette variation based on sceneIndex
  const pal = aesthetic.palettes[sceneIndex % aesthetic.palettes.length];

  // Resolve script-specific fonts
  const scriptFont = getScriptFontStack(`${caption} ${narration}`, language);
  const fontDisplay = aesthetic.fontFamily(scriptFont);
  const fontBody = scriptFont ? `${scriptFont}, -apple-system, sans-serif` : `'Segoe UI', -apple-system, sans-serif`;

  // Convert imagePath to data URI if available
  let imageDataUri = '';
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      const ext = path.extname(imagePath).toLowerCase().slice(1) || 'jpeg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const b64 = fs.readFileSync(imagePath).toString('base64');
      imageDataUri = `data:${mime};base64,${b64}`;
    } catch (_) {}
  }

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
      font-family: ${fontBody};
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
window.CAMERA_HINT = ${JSON.stringify(camera || cameraHint || 'auto')};
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = ${width};
const H = ${height};

// Seeded PRNG for frame purity
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

const rng = sfc32(${42 + sceneIndex * 19}, ${1337 + sceneIndex * 29}, ${7 + sceneIndex * 13}, 99);
const PARTICLES = Array.from({ length: 75 }, () => ({
  x: rng() * W,
  y: rng() * H,
  vx: (rng() - 0.5) * 40,
  vy: (rng() - 0.5) * 30 - 10,
  r: 1.5 + rng() * 3.5,
  alpha: 0.2 + rng() * 0.6
}));

// Spring dynamics function
function spring(t, delay = 0, tension = ${aesthetic.springTension}, friction = ${aesthetic.springFriction}) {
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

const SHOW_CAPTIONS = ${JSON.stringify(captionsWanted)};
const AESTHETIC = ${JSON.stringify(aestheticKey)};
const BG_TYPE = ${JSON.stringify(aesthetic.backgroundType)};
const COMP_THEME = ${JSON.stringify(compTheme)};
const CAPTION = ${JSON.stringify(caption)};
const NARRATION = ${JSON.stringify(narration)};
const TAG = ${JSON.stringify(pal.tag)};
const ACCENT = ${JSON.stringify(pal.accent)};
const ACCENT2 = ${JSON.stringify(pal.accent2)};
const BG0 = ${JSON.stringify(pal.bg0)};
const BG1 = ${JSON.stringify(pal.bg1)};
const BG2 = ${JSON.stringify(pal.bg2)};
const CARD_BG = ${JSON.stringify(pal.cardBg)};
const CARD_BORDER = ${JSON.stringify(pal.cardBorder)};
const FONT_DISPLAY = ${JSON.stringify(fontDisplay)};
const FONT_BODY = ${JSON.stringify(fontBody)};
const FONT_WEIGHT = ${JSON.stringify(aesthetic.fontDisplayWeight)};
const IMAGE_SRC = ${JSON.stringify(imageDataUri)};
const IS_LIGHT = ${Boolean(pal.isLight)};
const STROKE_COLOR = ${JSON.stringify(pal.isLight ? (pal.stroke || '#1c1917') : '#f8fafc')};
const STROKE_ALT = ${JSON.stringify(pal.isLight ? (pal.strokeAlt || '#44403c') : 'rgba(255, 255, 255, 0.7)')};
const AMBIENT_LINE = ${JSON.stringify(pal.isLight ? 'rgba(28, 25, 23, 0.22)' : 'rgba(255, 255, 255, 0.25)')};

let cachedImage = null;
if (IMAGE_SRC) {
  cachedImage = new Image();
  cachedImage.src = IMAGE_SRC;
}

// ── Background Ambient Layers ──────────────────────────────────────────────────
function drawBackground(t) {
  const cx = W / 2 + Math.sin(t * 0.5) * 120;
  const cy = H / 2 + Math.cos(t * 0.4) * 70;
  const bgGrad = ctx.createRadialGradient(cx, cy, 60, W / 2, H / 2, W * 0.95);
  bgGrad.addColorStop(0, BG0);
  bgGrad.addColorStop(0.55, BG1);
  bgGrad.addColorStop(1, BG2);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (BG_TYPE === 'paper_texture' || IS_LIGHT) {
    // Subtle paper grain / parchment texture
    ctx.strokeStyle = 'rgba(120, 80, 40, 0.04)';
    ctx.lineWidth = 1;
    for (let y = 40; y < H; y += 40) {
      const wobble = Math.sin(y * 0.1) * 3;
      ctx.beginPath();
      ctx.moveTo(0, y + wobble);
      ctx.lineTo(W, y - wobble);
      ctx.stroke();
    }
    // Subtle organic vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(120, 90, 60, 0.08)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  } else if (BG_TYPE === 'grid_perspective') {
    // 3D Perspective Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const horizon = H * 0.52;
    const shift = (t * 40) % 50;
    for (let x = -W * 0.5; x <= W * 1.5; x += 90) {
      ctx.beginPath(); ctx.moveTo(W / 2, horizon); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = horizon + shift; y <= H; y += 40) {
      const p = (y - horizon) / (H - horizon);
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.02 + p * 0.08) + ')';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  } else if (BG_TYPE === 'candlestick_charts') {
    // Ambient market backdrop grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let y = 80; y < H; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 120; x < W; x += 120) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  } else if (BG_TYPE === 'retro_horizon') {
    // Retrowave Sun & Floor Grid
    const sunY = H * 0.44;
    const sunR = 150;
    const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    sunGrad.addColorStop(0, '#ffd000');
    sunGrad.addColorStop(0.5, '#ff7300');
    sunGrad.addColorStop(1, '#ff2a85');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(W / 2, sunY, sunR, Math.PI, 0); ctx.fill();

    ctx.strokeStyle = ACCENT;
    const fShift = (t * 50) % 40;
    for (let y = sunY + fShift; y <= H; y += 35) {
      const a = (y - sunY) / (H - sunY);
      ctx.strokeStyle = 'rgba(255, 42, 133, ' + (a * 0.3) + ')';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  } else if (BG_TYPE === 'organic_ripples') {
    ctx.lineWidth = 2;
    for (let w = 0; w < 4; w++) {
      ctx.strokeStyle = 'rgba(34, 197, 94, ' + (0.05 + w * 0.03) + ')';
      ctx.beginPath();
      for (let x = 0; x <= W; x += 30) {
        const y = H * (0.35 + w * 0.15) + Math.sin(x * 0.005 + t * 1.5 + w) * 35;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (BG_TYPE === 'speed_streaks') {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      const sx = ((i * 110 + t * 600) % (W * 1.4)) - W * 0.2;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx - 200, H); ctx.stroke();
    }
  } else if (BG_TYPE === 'particles_dust' || BG_TYPE === 'cosmic_stars') {
    // Parallax particle atmosphere
    for (let i = 0; i < PARTICLES.length; i++) {
      const p = PARTICLES[i];
      const px = (p.x + p.vx * t + W * 2) % W;
      const py = (p.y + p.vy * t + H * 2) % H;
      ctx.fillStyle = ACCENT;
      ctx.globalAlpha = p.alpha * (0.4 + 0.6 * Math.sin(t * 2 + i));
      ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ── Full-Canvas Cinematic Visual Directors ─────────────────────────────────────
function drawMainScene(t) {
  ctx.save();
  // Continuous audio-driven cinematic camera movement (no fixed interval timer cuts)
  const dur = window.DURATION || 3;
  const p = Math.min(1, Math.max(0, t / dur));
  const enterSpring = spring(t, 0.05, 170, 13);
  const camHint = (window.CAMERA_HINT || 'auto').toLowerCase();

  let targetZoom = 1.0;
  let targetPanX = 0;
  let targetPanY = 0;

  if (camHint === 'slow_zoom_in' || camHint === 'zoom_in') {
    targetZoom = 1.0 + p * 0.08;
    targetPanX = Math.sin(t * 0.4) * 6;
    targetPanY = Math.cos(t * 0.3) * 4;
  } else if (camHint === 'slow_zoom_out' || camHint === 'zoom_out') {
    targetZoom = 1.08 - p * 0.08;
    targetPanX = Math.sin(t * 0.4) * 6;
    targetPanY = Math.cos(t * 0.3) * 4;
  } else if (camHint === 'pan_left') {
    targetZoom = 1.02;
    targetPanX = 25 - p * 50;
    targetPanY = Math.cos(t * 0.3) * 3;
  } else if (camHint === 'pan_right') {
    targetZoom = 1.02;
    targetPanX = -25 + p * 50;
    targetPanY = Math.cos(t * 0.3) * 3;
  } else if (camHint === 'tilt_up') {
    targetZoom = 1.03;
    targetPanX = Math.sin(t * 0.3) * 4;
    targetPanY = 20 - p * 40;
  } else if (camHint === 'tilt_down') {
    targetZoom = 1.03;
    targetPanX = Math.sin(t * 0.3) * 4;
    targetPanY = -20 + p * 40;
  } else if (camHint === 'ken_burns') {
    targetZoom = 1.0 + p * 0.06;
    targetPanX = -18 + p * 36;
    targetPanY = 12 - p * 24;
  } else if (camHint === 'static') {
    targetZoom = 1.0;
    targetPanX = 0;
    targetPanY = 0;
  } else {
    // 'auto' or narrative default: subtle organic breathing and smooth forward progression
    targetZoom = 1.0 + Math.sin(p * Math.PI * 0.5) * 0.04;
    targetPanX = Math.sin(t * 0.35) * 8;
    targetPanY = Math.cos(t * 0.28) * 4;
  }

  const camZoom = targetZoom;
  const camPanX = targetPanX;
  const camPanY = targetPanY;

  ctx.translate(W / 2 + camPanX, H * 0.50 + camPanY);
  ctx.scale(Math.min(1.02, Math.max(0.92, enterSpring)) * camZoom, Math.min(1.02, Math.max(0.92, enterSpring)) * camZoom);
  ctx.translate(-W / 2, -H * 0.50);

  const cx = W / 2;
  const cy = H * 0.50;

  // ── Hand-Drawn Boil Wobble & Sketch Helpers (12fps Hand-Drawn Animation) ──
  function wb(seed, mag = 2.4) {
    const step = Math.floor(t * 12);
    return Math.sin(seed * 19.37 + step * 2.41) * mag;
  }

  function sLine(x1, y1, x2, y2, seed, color = STROKE_COLOR, width = 3.5) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const mx = (x1 + x2) / 2 + wb(seed, 3.5);
    const my = (y1 + y2) / 2 + wb(seed + 1, 3.5);
    ctx.beginPath();
    ctx.moveTo(x1 + wb(seed + 2, 1.5), y1 + wb(seed + 3, 1.5));
    ctx.quadraticCurveTo(mx, my, x2 + wb(seed + 4, 1.5), y2 + wb(seed + 5, 1.5));
    ctx.stroke();
    ctx.restore();
  }

  function sCircle(x, y, r, seed, color = STROKE_COLOR, width = 3, fillColor = null) {
    ctx.save();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    const segs = 10;
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const curR = r + wb(seed + s, 2.5);
      const px = x + Math.cos(a) * curR;
      const py = y + Math.sin(a) * curR;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function sRect(x, y, w, h, seed, color = STROKE_COLOR, width = 3, fillColor = null) {
    ctx.save();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, w, h);
    }
    sLine(x, y, x + w, y, seed, color, width);
    sLine(x + w, y, x + w, y + h, seed + 1, color, width);
    sLine(x + w, y + h, x, y + h, seed + 2, color, width);
    sLine(x, y + h, x, y, seed + 3, color, width);
    ctx.restore();
  }

  function drawDoodleCharacter({
    x = cx,
    y = cy,
    scale = 1.0,
    headRadius = 38,
    torsoHeight = 90,
    legLength = 95,
    hairStyle = 'wild',
    expression = 'talking',
    clothing = 'none',
    armPose = 'natural',
    showShadow = false,
    showBlush = false,
    showSpecular = false,
    seed = 100,
  } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Ground contact shadow: strictly conditional (default false)
    if (showShadow) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, legLength, 34, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const blink = (t % 3.2 < 0.14) ? 0.15 : 1.0;
    const mouthTalk = Math.abs(Math.sin(t * 14)) * 4;
    const torsoTopY = -torsoHeight;
    const torsoBottomY = 0;
    const shoulderW = 28;

    // High quality contoured torso silhouette (organic human form, never stick figure)
    if (clothing === 'pelt') {
      // Prehistoric animal pelt tunic with textured ragged hem
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-shoulderW + wb(seed, 2), torsoTopY);
      ctx.lineTo(shoulderW + wb(seed + 1, 2), torsoTopY);
      ctx.lineTo(shoulderW + 6 + wb(seed + 2, 2), torsoBottomY + 22);
      ctx.lineTo(-shoulderW - 6 + wb(seed + 3, 2), torsoBottomY + 22);
      ctx.closePath();
      ctx.fill();

      // Pelt border stitching & waist wrap
      sLine(-shoulderW - 6, torsoBottomY + 22, shoulderW + 6, torsoBottomY + 22, seed + 4, '#78350f', 4);
      sLine(-shoulderW, torsoBottomY - 8, shoulderW, torsoBottomY - 8, seed + 5, '#451a03', 3);
      // Asymmetric fur shoulder wrap
      sLine(-shoulderW, torsoTopY, shoulderW - 10, torsoTopY + 24, seed + 6, '#78350f', 3.5);
    } else if (clothing === 'shirt') {
      // Modern tailored shirt/jacket with collar and button placket
      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.moveTo(-shoulderW + wb(seed, 2), torsoTopY);
      ctx.lineTo(shoulderW + wb(seed + 1, 2), torsoTopY);
      ctx.lineTo(shoulderW + 2 + wb(seed + 2, 2), torsoBottomY + 12);
      ctx.lineTo(-shoulderW - 2 + wb(seed + 3, 2), torsoBottomY + 12);
      ctx.closePath();
      ctx.fill();

      // Collar lines & placket
      sLine(-14, torsoTopY, 0, torsoTopY + 18, seed + 4, '#ffffff', 3);
      sLine(14, torsoTopY, 0, torsoTopY + 18, seed + 5, '#ffffff', 3);
      sLine(0, torsoTopY + 18, 0, torsoBottomY + 10, seed + 6, '#ffffff', 2.5);
    } else if (clothing === 'cloak') {
      // Flowing draped mantle
      ctx.fillStyle = '#0f766e';
      ctx.beginPath();
      ctx.moveTo(-shoulderW - 8, torsoTopY - 6);
      ctx.lineTo(shoulderW + 8, torsoTopY - 6);
      ctx.lineTo(shoulderW + 18, torsoBottomY + 32);
      ctx.lineTo(-shoulderW - 18, torsoBottomY + 32);
      ctx.closePath();
      ctx.fill();
      sLine(-shoulderW - 8, torsoTopY - 6, -shoulderW - 18, torsoBottomY + 32, seed + 7, '#134e4a', 3.5);
      sLine(shoulderW + 8, torsoTopY - 6, shoulderW + 18, torsoBottomY + 32, seed + 8, '#134e4a', 3.5);
    } else {
      // Natural contoured human torso (shoulders, ribcage, waist, hips)
      ctx.fillStyle = IS_LIGHT ? 'rgba(217, 119, 6, 0.12)' : 'rgba(254, 243, 199, 0.22)';
      ctx.beginPath();
      ctx.moveTo(-shoulderW + wb(seed, 1.5), torsoTopY + 5);
      ctx.lineTo(shoulderW + wb(seed + 1, 1.5), torsoTopY + 5);
      ctx.quadraticCurveTo(shoulderW - 6 + wb(seed + 2, 1.5), torsoTopY + torsoHeight * 0.5, shoulderW - 4, torsoBottomY);
      ctx.lineTo(-shoulderW + 4, torsoBottomY);
      ctx.quadraticCurveTo(-shoulderW + 6 + wb(seed + 3, 1.5), torsoTopY + torsoHeight * 0.5, -shoulderW + wb(seed, 1.5), torsoTopY + 5);
      ctx.closePath();
      ctx.fill();

      // Contoured torso outline strokes
      sLine(-shoulderW, torsoTopY + 5, -shoulderW + 4, torsoBottomY, seed + 7, STROKE_COLOR, 3.5);
      sLine(shoulderW, torsoTopY + 5, shoulderW - 4, torsoBottomY, seed + 8, STROKE_COLOR, 3.5);
      sLine(-shoulderW + 4, torsoBottomY, shoulderW - 4, torsoBottomY, seed + 9, STROKE_COLOR, 3);
      // Subtle collarbone / rib accents
      sLine(-16, torsoTopY + 16, -2, torsoTopY + 22, seed + 10, STROKE_ALT, 2);
      sLine(16, torsoTopY + 16, 2, torsoTopY + 22, seed + 11, STROKE_ALT, 2);
    }

    // Head (expressive contoured skull)
    const headCenterY = torsoTopY - headRadius - 6 + wb(seed + 12, 1.5);
    sCircle(0, headCenterY, headRadius, seed + 13, STROKE_COLOR, 3.5, '#fef3c7');

    // Hair
    if (hairStyle === 'wild') {
      for (let h = 0; h < 7; h++) {
        const hairAng = -Math.PI * 0.88 + (h / 6) * Math.PI * 0.76;
        const hx1 = Math.cos(hairAng) * headRadius;
        const hy1 = headCenterY + Math.sin(hairAng) * headRadius;
        const hx2 = Math.cos(hairAng) * (headRadius + 24 + wb(seed + 14 + h, 4));
        const hy2 = headCenterY + Math.sin(hairAng) * (headRadius + 24 + wb(seed + 15 + h, 4));
        sLine(hx1, hy1, hx2, hy2, seed + 16 + h, '#78350f', 3.5);
      }
    } else if (hairStyle === 'modern') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, headCenterY - 12, headRadius * 0.96, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      sLine(-headRadius * 0.9, headCenterY - 12, headRadius * 0.9, headCenterY - 12, seed + 20, '#1e293b', 4);
    } else if (hairStyle === 'feather') {
      sLine(8, headCenterY - headRadius, 28, headCenterY - headRadius - 35, seed + 21, '#38bdf8', 4);
      sLine(28, headCenterY - headRadius - 35, 18, headCenterY - headRadius - 20, seed + 22, '#f43f5e', 3);
    }

    // Eyes
    const eyeY = headCenterY + 4;
    const eyeR = 4.2 * blink;
    sCircle(-12, eyeY, Math.max(1, eyeR), seed + 23, '#0f172a', 2, '#0f172a');
    sCircle(12, eyeY, Math.max(1, eyeR), seed + 24, '#0f172a', 2, '#0f172a');

    // Specular eye highlights: only when explicitly enabled
    if (showSpecular && blink > 0.4) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-14, eyeY - 1.5, 1.2, 0, Math.PI * 2);
      ctx.arc(10, eyeY - 1.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rosy cheek blush: strictly conditional (default false)
    if (showBlush || expression === 'blushing' || expression === 'shame') {
      ctx.fillStyle = 'rgba(251, 113, 133, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-14, headCenterY + 12, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(14, headCenterY + 12, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows
    if (expression === 'shivering') {
      sLine(-18, eyeY - 12 + wb(seed, 2), -6, eyeY - 7 + wb(seed, 2), seed + 25, '#0f172a', 2.5);
      sLine(6, eyeY - 7 + wb(seed, 2), 18, eyeY - 12 + wb(seed, 2), seed + 26, '#0f172a', 2.5);
    } else if (expression === 'surprised' || expression === 'curious') {
      sLine(-18, eyeY - 15, -6, eyeY - 13, seed + 27, '#0f172a', 2.5);
      sLine(6, eyeY - 13, 18, eyeY - 15, seed + 28, '#0f172a', 2.5);
    } else {
      sLine(-17, eyeY - 9, -7, eyeY - 10, seed + 29, '#0f172a', 2.5);
      sLine(7, eyeY - 10, 17, eyeY - 9, seed + 30, '#0f172a', 2.5);
    }

    // Mouth
    const mouthY = headCenterY + 22;
    if (expression === 'shivering') {
      const mChatter = Math.sin(t * 32) * 2.5;
      sLine(-10, mouthY + mChatter, -4, mouthY - 3 + mChatter, seed + 31, '#0f172a', 2.5);
      sLine(-4, mouthY - 3 + mChatter, 3, mouthY + 3 + mChatter, seed + 32, '#0f172a', 2.5);
      sLine(3, mouthY + 3 + mChatter, 10, mouthY + mChatter, seed + 33, '#0f172a', 2.5);
    } else if (expression === 'talking') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, mouthY, 7, Math.max(2, mouthTalk), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expression === 'smiling') {
      ctx.beginPath();
      ctx.arc(0, mouthY - 4, 10, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      sLine(-8, mouthY, 8, mouthY, seed + 34, '#0f172a', 2.5);
    }

    // Legs with articulated knees and planted feet
    const hipY = torsoBottomY;
    if (armPose === 'sewing' || armPose === 'thinker') {
      // Cross-legged seated pose
      sLine(-14, hipY, -48, hipY + 45, seed + 35, STROKE_COLOR, 4);
      sLine(-48, hipY + 45, 12, hipY + 50, seed + 36, STROKE_COLOR, 4);
      sLine(14, hipY, 48, hipY + 45, seed + 37, STROKE_COLOR, 4);
      sLine(48, hipY + 45, -12, hipY + 50, seed + 38, STROKE_COLOR, 4);
    } else if (armPose === 'hold_spear') {
      // Dynamic walking gait
      const legSwing = Math.sin(t * 5.5);
      const l1KneeX = -15 + legSwing * 22;
      const l1KneeY = hipY + legLength * 0.55;
      const l1FootX = -15 + legSwing * 38;
      const l1FootY = hipY + legLength;
      sLine(-14, hipY, l1KneeX, l1KneeY, seed + 39, STROKE_COLOR, 4);
      sLine(l1KneeX, l1KneeY, l1FootX, l1FootY, seed + 40, STROKE_COLOR, 4);
      sLine(l1FootX, l1FootY, l1FootX + 16, l1FootY, seed + 41, STROKE_COLOR, 3.5);

      const l2KneeX = 15 - legSwing * 22;
      const l2KneeY = hipY + legLength * 0.55;
      const l2FootX = 15 - legSwing * 38;
      const l2FootY = hipY + legLength;
      sLine(14, hipY, l2KneeX, l2KneeY, seed + 42, STROKE_COLOR, 4);
      sLine(l2KneeX, l2KneeY, l2FootX, l2FootY, seed + 43, STROKE_COLOR, 4);
      sLine(l2FootX, l2FootY, l2FootX + 16, l2FootY, seed + 44, STROKE_COLOR, 3.5);
    } else {
      // Standing legs with natural knee contour and planted feet
      const lKneeX = -15 + wb(seed + 39, 1);
      const rKneeX = 15 + wb(seed + 40, 1);
      const kneeY = hipY + legLength * 0.52;
      const footY = hipY + legLength;
      sLine(-16, hipY, lKneeX, kneeY, seed + 41, STROKE_COLOR, 4);
      sLine(lKneeX, kneeY, -16, footY, seed + 42, STROKE_COLOR, 4);
      sLine(-16, footY, -28, footY, seed + 43, STROKE_COLOR, 3.5);

      sLine(16, hipY, rKneeX, kneeY, seed + 44, STROKE_COLOR, 4);
      sLine(rKneeX, kneeY, 16, footY, seed + 45, STROKE_COLOR, 4);
      sLine(16, footY, 28, footY, seed + 46, STROKE_COLOR, 3.5);
    }

    // Arms & Hands with natural articulated elbows and gestures
    const shoulderY = torsoTopY + 12;
    if (armPose === 'shiver') {
      const shivA = Math.sin(t * 34) * 3;
      sLine(-shoulderW, shoulderY, 16 + shivA, shoulderY + 35, seed + 47, STROKE_COLOR, 4);
      sLine(shoulderW, shoulderY, -16 + shivA, shoulderY + 35, seed + 48, STROKE_COLOR, 4);
    } else if (armPose === 'hold_spear') {
      // Holding spear with grip
      const spearSway = Math.sin(t * 5.5) * 6;
      sLine(-shoulderW, shoulderY, -10, shoulderY + 28, seed + 49, STROKE_COLOR, 4);
      sLine(-10, shoulderY + 28, 12, shoulderY + 14, seed + 50, STROKE_COLOR, 4);
      // Spear pole passing through hands
      const spearX = 18 + spearSway;
      sLine(spearX - 25, cy - 140, spearX + 35, cy + 180, seed + 51, '#78350f', 5.5);
      // Flint spearhead bound with sinew
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(spearX - 25, cy - 140);
      ctx.lineTo(spearX - 32, cy - 180);
      ctx.lineTo(spearX - 18, cy - 170);
      ctx.closePath();
      ctx.fill();
      sLine(spearX - 28, cy - 140, spearX - 20, cy - 150, seed + 52, '#f59e0b', 3);
    } else if (armPose === 'sewing') {
      // Left hand holds stretched pelt, right hand drives bone needle with sinew
      const sewPull = Math.sin(t * 4) * 14;
      sLine(-shoulderW, shoulderY, -40, shoulderY + 38, seed + 53, STROKE_COLOR, 4);
      sLine(-40, shoulderY + 38, -15, shoulderY + 45, seed + 54, STROKE_COLOR, 4);
      sLine(shoulderW, shoulderY, 35 + sewPull * 0.5, shoulderY + 28, seed + 55, STROKE_COLOR, 4);
      sLine(35 + sewPull * 0.5, shoulderY + 28, 10 + sewPull, shoulderY + 42, seed + 56, STROKE_COLOR, 4);
    } else if (armPose === 'cover_body') {
      // Protective covering gesture
      sLine(-shoulderW, shoulderY, 10, shoulderY + 28, seed + 57, STROKE_COLOR, 4);
      sLine(shoulderW, shoulderY, -10, shoulderY + 48, seed + 58, STROKE_COLOR, 4);
    } else if (armPose === 'thinker') {
      // Rodin-style contemplative pose: hand under chin, elbow on knee
      sLine(shoulderW, shoulderY, 15, shoulderY + 42, seed + 59, STROKE_COLOR, 4);
      sLine(15, shoulderY + 42, 6, headCenterY + 20, seed + 60, STROKE_COLOR, 4);
      sLine(-shoulderW, shoulderY, -30, shoulderY + 45, seed + 61, STROKE_COLOR, 4);
    } else if (armPose === 'dress_shirt') {
      // Examining clothes, touching button / adjusting collar
      sLine(-shoulderW, shoulderY, -14, shoulderY + 22, seed + 62, STROKE_COLOR, 4);
      sLine(shoulderW, shoulderY, 14, shoulderY + 22, seed + 63, STROKE_COLOR, 4);
    } else if (armPose === 'peace_gesture') {
      // Open welcoming hand
      sLine(-shoulderW, shoulderY, -35, shoulderY + 30, seed + 64, STROKE_COLOR, 4);
      sLine(shoulderW, shoulderY, 35, shoulderY + 15, seed + 65, STROKE_COLOR, 4);
      sLine(35, shoulderY + 15, 52, shoulderY + 2, seed + 66, STROKE_COLOR, 3.5);
    } else {
      // Natural expressive speaking arms with subtle breathing gesture
      const gArm = Math.sin(t * 3.5) * 8;
      sLine(-shoulderW, shoulderY, -shoulderW - 8, shoulderY + 38, seed + 67, STROKE_COLOR, 4);
      sLine(-shoulderW - 8, shoulderY + 38, -shoulderW - 14, shoulderY + 68, seed + 68, STROKE_COLOR, 4);
      sLine(shoulderW, shoulderY, shoulderW + 12, shoulderY + 32 - gArm, seed + 69, STROKE_COLOR, 4);
      sLine(shoulderW + 12, shoulderY + 32 - gArm, shoulderW + 24, shoulderY + 18 - gArm, seed + 70, STROKE_COLOR, 4);
    }

    ctx.restore();
  }

  // ── Doodled Character Narrative Themes (3-Beat Progressive Choreography) ─
  if (COMP_THEME === 'doodle_dressing') {
    // Beat 1: Browsing wardrobe -> Beat 2: Trying shirt -> Beat 3: Looking in mirror reflection
    const beat2 = spring(t, window.DURATION * 0.35, 180, 16);
    const beat3 = spring(t, window.DURATION * 0.70, 190, 16);

    sLine(cx - W * 0.45, cy + 220, cx + W * 0.45, cy + 220, 10, AMBIENT_LINE, 2.5);

    // Clothes rack on left (sways in beat 1)
    sLine(cx - 360, cy + 220, cx - 360, cy - 140, 11, '#94a3b8', 5);
    sLine(cx - 410, cy + 220, cx - 310, cy + 220, 12, '#94a3b8', 5);
    sLine(cx - 420, cy - 140, cx - 180, cy - 140, 13, '#cbd5e1', 5);

    // 3 shirts on hangers
    const shirtColors = ['#38bdf8', '#f43f5e', '#fbbf24'];
    for (let c = 0; c < 3; c++) {
      const hx = cx - 380 + c * 80;
      const sway = Math.sin(t * 2.5 + c * 1.5) * 5;
      sLine(hx, cy - 140, hx + sway, cy - 110, 20 + c, '#e2e8f0', 2.5);
      ctx.fillStyle = shirtColors[c];
      ctx.beginPath();
      ctx.moveTo(hx + sway - 22, cy - 110);
      ctx.lineTo(hx + sway + 22, cy - 110);
      ctx.lineTo(hx + sway + 28, cy - 10);
      ctx.lineTo(hx + sway - 28, cy - 10);
      ctx.closePath();
      ctx.fill();
    }

    // Mirror on right - emerges and glows in Beat 2 & 3
    const mirrorX = cx + 320;
    const mirrorY = cy + 20;
    ctx.fillStyle = 'rgba(56, 189, 248, ' + (0.05 + beat2 * 0.08) + ')';
    ctx.beginPath();
    ctx.roundRect(mirrorX - 85, mirrorY - 210, 170, 390, 24);
    ctx.fill();
    ctx.strokeStyle = beat3 > 0.5 ? '#f59e0b' : '#94a3b8';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Reflected character in mirror (smiling and thumbs up in beat 3)
    if (beat2 > 0.1) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.65, beat2 * 0.65);
      drawDoodleCharacter({
        x: mirrorX,
        y: cy + 120,
        scale: 1.05,
        hairStyle: 'modern',
        expression: beat3 > 0.5 ? 'smiling' : 'curious',
        clothing: 'shirt',
        armPose: beat3 > 0.5 ? 'peace_gesture' : 'dress_shirt',
        seed: 88,
      });
      ctx.restore();
    }

    // Main character moves progressively from rack -> center -> mirror
    const charX = cx - 220 + beat2 * 170 + beat3 * 60;
    drawDoodleCharacter({
      x: charX,
      y: cy + 140,
      scale: 1.35,
      hairStyle: 'modern',
      expression: beat3 > 0.5 ? 'smiling' : 'talking',
      clothing: 'shirt',
      armPose: beat2 > 0.5 ? 'dress_shirt' : 'natural',
      seed: 101,
    });

  } else if (COMP_THEME === 'doodle_modern_vs_prehistoric') {
    // Split-screen comparison: Modern stylish human on left vs Prehistoric human on right
    const dur = window.DURATION || 3;
    const bridgeSpring = spring(t, dur * 0.35, 170, 15);

    // Natural ground line
    sLine(cx - W * 0.45, cy + 220, cx + W * 0.45, cy + 220, 10, AMBIENT_LINE, 2.5);

    // Subtle split-screen center divider
    ctx.save();
    ctx.setLineDash([10, 10]);
    sLine(cx, cy - 220, cx, cy + 200, 20, AMBIENT_LINE, 2);
    ctx.restore();

    // Modern human on left
    drawDoodleCharacter({
      x: cx - 260,
      y: cy + 140,
      scale: 1.3,
      hairStyle: 'modern',
      expression: 'talking',
      clothing: 'shirt',
      armPose: 'dress_shirt',
      seed: 120,
    });

    // Prehistoric human on right
    drawDoodleCharacter({
      x: cx + 260,
      y: cy + 140,
      scale: 1.3,
      hairStyle: 'wild',
      expression: 'curious',
      clothing: 'none',
      armPose: 'natural',
      seed: 121,
    });

    // Dynamic timeline bridge / evolution arc connecting them
    if (bridgeSpring > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, bridgeSpring * 0.85);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(cx - 200, cy - 30);
      ctx.quadraticCurveTo(cx, cy - 140, cx + 200, cy - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center compass / timeline knot
      sCircle(cx, cy - 85, 24, 820, ACCENT, 3, IS_LIGHT ? '#ffffff' : 'rgba(15, 23, 42, 0.9)');
      sCircle(cx, cy - 85, 10, 821, STROKE_COLOR, 2, STROKE_COLOR);
      ctx.restore();
    }

  } else if (COMP_THEME === 'doodle_shiver_cold') {
    // Narrative beat progression based strictly on audio duration (window.DURATION)
    const dur = window.DURATION || 3;
    const beat2 = spring(t, dur * 0.45, 160, 15);

    // Natural ground line
    sLine(cx - W * 0.45, cy + 220, cx + W * 0.45, cy + 220, 10, AMBIENT_LINE, 2);

    // Freezing wind streaks (rush during cold beat, calm as sun breaks)
    const windAlpha = Math.max(0, 1 - beat2 * 0.85);
    if (windAlpha > 0.05) {
      for (let w = 0; w < 14; w++) {
        const windX = ((t * 750 + w * 210) % (W + 600)) - 300;
        const windY = cy - 250 + (w * 42) + Math.sin(t * 3.5 + w) * 15;
        const windColor = (IS_LIGHT ? 'rgba(100,116,139,' : 'rgba(255,255,255,') + (0.35 * windAlpha) + ')';
        sLine(windX, windY, windX + 170, windY + 5, 200 + w, windColor, 2);
      }
    }

    // Drifting snow particles
    for (let sp = 0; sp < 22; sp++) {
      const px = ((sp * 85 + t * 400) % W);
      const py = (sp * 45 + t * 80) % H;
      sCircle(px, py, 2.2, 300 + sp, '#e0f2fe', 1, '#ffffff');
    }

    // Shivering breath vapor cloud (calms in Beat 2)
    if (beat2 < 0.7) {
      const breathPhase = (t * 2.2) % 1;
      const bCloudX = cx - 50 + breathPhase * 60;
      const bCloudY = cy - 90 - breathPhase * 25;
      ctx.fillStyle = 'rgba(224, 242, 254, ' + ((1 - breathPhase) * 0.45) + ')';
      ctx.beginPath();
      ctx.arc(bCloudX, bCloudY, 15 + breathPhase * 25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Warm golden sunlight breaks in (visual myth-busting revelation)
    if (beat2 > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, beat2 * 0.6);
      const sunBeamGrad = ctx.createRadialGradient(cx + 180, cy - 220, 20, cx + 180, cy - 100, 320);
      sunBeamGrad.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
      sunBeamGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = sunBeamGrad;
      ctx.beginPath();
      ctx.arc(cx + 180, cy - 180, 260, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Main character: shivers in cold beat, then pauses and looks at arms in wonder as sun illuminates
    const isShivering = beat2 < 0.6;
    const vibX = isShivering ? Math.sin(t * 38) * 4.5 : 0;
    const vibY = isShivering ? Math.cos(t * 32) * 2 : 0;
    drawDoodleCharacter({
      x: cx - 100 + beat2 * 80 + vibX,
      y: cy + 140 + vibY,
      scale: 1.35,
      hairStyle: 'wild',
      expression: isShivering ? 'shivering' : 'curious',
      clothing: 'none',
      armPose: isShivering ? 'shiver' : 'thinker',
      seed: 102,
    });

  } else if (COMP_THEME === 'doodle_hunter_savannah') {
    // Beat 1: Walking with spear -> Beat 2: Swatting mosquitoes -> Beat 3: Pausing alert
    const walkProg = Math.min(1, Math.max(0, t / window.DURATION));
    const swatting = (t % 2.4 > 1.2);

    // Blazing midday sun with undulating rays
    const sunR = 75 + Math.sin(t * 2) * 6;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx - 380, cy - 180, sunR, 0, Math.PI * 2);
    ctx.fill();
    for (let r = 0; r < 8; r++) {
      const rayA = (r / 8) * Math.PI * 2 + t * 0.4;
      const rx1 = cx - 380 + Math.cos(rayA) * (sunR + 10);
      const ry1 = cy - 180 + Math.sin(rayA) * (sunR + 10);
      const rx2 = cx - 380 + Math.cos(rayA) * (sunR + 32);
      const ry2 = cy - 180 + Math.sin(rayA) * (sunR + 32);
      sLine(rx1, ry1, rx2, ry2, 450 + r, '#fbbf24', 3);
    }

    // Ground and tall swaying savannah grass
    sLine(cx - W * 0.45, cy + 220, cx + W * 0.45, cy + 220, 10, '#78350f', 3);
    for (let g = 0; g < 32; g++) {
      const gx = cx - 550 + g * 36;
      const sway = Math.sin(t * 3.2 + g * 0.4) * 16;
      sLine(gx, cy + 220, gx + sway, cy + 140, 500 + g, '#d97706', 2.5);
    }

    // Buzzing mosquitoes orbiting hunter
    const charX = cx - 180 + walkProg * 240;
    for (let m = 0; m < 4; m++) {
      const mx = charX + 50 + Math.sin(t * 8 + m * 2) * 65;
      const my = cy - 60 + Math.cos(t * 7 + m * 2) * 45;
      sCircle(mx, my, 2.5, 550 + m, '#0f172a', 1.5, '#ef4444');
    }

    // Walking early hunter with spear
    drawDoodleCharacter({
      x: charX,
      y: cy + 140,
      scale: 1.35,
      hairStyle: 'wild',
      expression: swatting ? 'shivering' : 'talking',
      clothing: 'none',
      armPose: 'hold_spear',
      seed: 103,
    });

  } else if (COMP_THEME === 'doodle_sewing_needle') {
    // Beat 1: Seated by campfire -> Beat 2: Zoom loupe with bone needle -> Beat 3: Timeline badges
    const loupeSpring = spring(t, window.DURATION * 0.32, 180, 15);
    const badgeSpring = spring(t, window.DURATION * 0.68, 200, 15);

    // Campfire with animated flames and sparks
    const fireX = cx - 380;
    const fireY = cy + 180;
    for (let f = 0; f < 5; f++) {
      const flH = 50 + Math.sin(t * 12 + f) * 22;
      ctx.fillStyle = f % 2 === 0 ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(fireX - 30 + f * 12, fireY);
      ctx.quadraticCurveTo(fireX + (f - 2) * 8, fireY - flH, fireX - 10 + f * 12, fireY);
      ctx.fill();
    }
    for (let sp = 0; sp < 8; sp++) {
      const sx = fireX + Math.sin(t * 4 + sp) * 35;
      const sy = fireY - 30 - ((t * 80 + sp * 35) % 140);
      sCircle(sx, sy, 2, 600 + sp, '#fbbf24', 1, '#fbbf24');
    }

    // Seated human stitching hide with bone needle
    drawDoodleCharacter({
      x: cx - 120,
      y: cy + 140,
      scale: 1.35,
      hairStyle: 'wild',
      expression: 'talking',
      clothing: 'pelt',
      armPose: 'sewing',
      seed: 104,
    });

    // Zoomed loupe expands open in Beat 2
    if (loupeSpring > 0.05) {
      ctx.save();
      const lensX = cx + 270;
      const lensY = cy - 20;
      ctx.translate(lensX, lensY);
      ctx.scale(loupeSpring, loupeSpring);

      const lensR = 140;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      ctx.arc(0, 0, lensR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Two thick leather pelt pieces being stitched
      sLine(-85, -20, 85, -20, 650, '#92400e', 8);
      sLine(-85, 20, 85, 20, 651, '#78350f', 8);

      // Drilled bone needle piercing through with animated wiggle
      const nWiggle = Math.sin(t * 4.5) * 18;
      sLine(-45 + nWiggle, -65, 25 + nWiggle, 55, 652, '#fef08a', 6);
      sCircle(-40 + nWiggle, -58, 4, 653, '#0f172a', 1.5, '#0f172a');

      // Stitches across pelts
      for (let st = 0; st < 6; st++) {
        const stX = -70 + st * 28;
        sLine(stX, -22, stX + 8, 22, 660 + st, '#ffffff', 3.5);
      }
      ctx.restore();
    }

    // Ancient stone strata and bone needle engraving in Beat 3
    if (badgeSpring > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.65, badgeSpring * 0.65);
      sLine(cx + 140, cy + 150, cx + 420, cy + 150, 670, '#d4af37', 2);
      sLine(cx + 180, cy + 168, cx + 380, cy + 168, 671, '#d4af37', 1.5);
      ctx.restore();
    }

  } else if (COMP_THEME === 'doodle_shame_reflection') {
    // Beat 1: Looking down -> Beat 2: Water reflection & blushing -> Beat 3: Theory of Mind halo
    const refSpring = spring(t, window.DURATION * 0.30, 180, 15);
    const haloSpring = spring(t, window.DURATION * 0.65, 190, 15);

    const poolX = cx;
    const poolY = cy + 180;
    ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
    ctx.beginPath();
    ctx.ellipse(poolX, poolY, 260, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Ripples in pool
    for (let rip = 1; rip <= 3; rip++) {
      const ripR = (rip * 65 + t * 45) % 250;
      const ripAlpha = (1 - ripR / 250) * 0.4;
      ctx.strokeStyle = 'rgba(56, 189, 248, ' + ripAlpha + ')';
      ctx.beginPath();
      ctx.ellipse(poolX, poolY, ripR, ripR * 0.23, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Inverted rippling reflection of character in water (clarifies in Beat 2)
    if (refSpring > 0.1) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.45, refSpring * 0.45);
      ctx.translate(cx, poolY + 20);
      ctx.scale(1.2, -0.75);
      drawDoodleCharacter({
        x: 0,
        y: 0,
        scale: 1.0,
        hairStyle: 'wild',
        expression: 'surprised',
        clothing: 'none',
        armPose: 'cover_body',
        seed: 700,
      });
      ctx.restore();
    }

    // Standing character looking down and covering body
    drawDoodleCharacter({
      x: cx,
      y: cy + 120,
      scale: 1.35,
      hairStyle: 'wild',
      expression: refSpring > 0.4 ? 'surprised' : 'talking',
      clothing: 'none',
      armPose: refSpring > 0.4 ? 'cover_body' : 'natural',
      seed: 105,
    });

    // Blushing cheeks appear in Beat 2
    if (refSpring > 0.3) {
      const blushA = Math.min(0.7, refSpring * 0.7);
      sCircle(cx - 18, cy - 8, 7, 750, 'rgba(244,63,94,' + blushA + ')', 1, 'rgba(244,63,94,' + blushA + ')');
      sCircle(cx + 18, cy - 8, 7, 751, 'rgba(244,63,94,' + blushA + ')', 1, 'rgba(244,63,94,' + blushA + ')');
    }

    // Theory of Mind Thought Halo in Beat 3
    if (haloSpring > 0.05) {
      ctx.save();
      const haloX = cx + 180;
      const haloY = cy - 120;
      ctx.translate(haloX, haloY);
      ctx.scale(haloSpring, haloSpring);
      sCircle(0, 0, 48, 760, '#38bdf8', 3);
      sCircle(0, 0, 24, 761, STROKE_ALT, 2);
      sCircle(0, 0, 8, 762, '#38bdf8', 1, '#38bdf8');
      ctx.restore();
    }

  } else if (COMP_THEME === 'doodle_tribe_meeting') {
    // Beat 1: Walking toward center -> Beat 2: Greet & check patterns -> Beat 3: Social language arc
    const approach = spring(t, 0.05, 140, 16);
    const greet = spring(t, window.DURATION * 0.38, 190, 15);
    const arcSpring = spring(t, window.DURATION * 0.68, 200, 15);

    sLine(cx - W * 0.45, cy + 220, cx + W * 0.45, cy + 220, 10, AMBIENT_LINE, 2);

    // Left Clan Member walks toward center
    const leftX = cx - 380 + Math.min(1, approach) * 160;
    drawDoodleCharacter({
      x: leftX,
      y: cy + 140,
      scale: 1.3,
      hairStyle: 'wild',
      expression: 'talking',
      clothing: 'pelt',
      armPose: greet > 0.5 ? 'peace_gesture' : 'natural',
      seed: 106,
    });

    // Right Clan Member walks toward center
    const rightX = cx + 380 - Math.min(1, approach) * 160;
    drawDoodleCharacter({
      x: rightX,
      y: cy + 140,
      scale: 1.3,
      hairStyle: 'feather',
      expression: 'curious',
      clothing: 'cloak',
      armPose: greet > 0.5 ? 'peace_gesture' : 'natural',
      seed: 107,
    });

    // Glowing connection arc in Beat 3
    if (arcSpring > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, arcSpring * 0.85);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(leftX + 40, cy);
      ctx.quadraticCurveTo(cx, cy - 100, rightX - 40, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      sCircle(cx, cy - 65, 28, 800, ACCENT, 3, IS_LIGHT ? '#ffffff' : 'rgba(15, 23, 42, 0.85)');
      sCircle(cx, cy - 65, 12, 801, STROKE_COLOR, 2, STROKE_COLOR);
      ctx.restore();
    }

  } else if (COMP_THEME === 'doodle_thinking_future') {
    // Beat 1: Seated thinker by fire -> Beat 2: Thought cloud floats up -> Beat 3: Tomorrow's rack & tools
    const cloudSpring = spring(t, window.DURATION * 0.32, 170, 14);
    const ideaSpring = spring(t, window.DURATION * 0.65, 190, 15);

    // Starlit night and crescent moon
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - 360, cy - 190, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BG2;
    ctx.beginPath();
    ctx.arc(cx - 345, cy - 200, 48, 0, Math.PI * 2);
    ctx.fill();

    // Large rock boulder for thinker
    ctx.fillStyle = IS_LIGHT ? '#78716c' : '#334155';
    ctx.beginPath();
    ctx.ellipse(cx - 140, cy + 175, 85, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thinker seated on rock
    drawDoodleCharacter({
      x: cx - 140,
      y: cy + 130,
      scale: 1.35,
      hairStyle: 'wild',
      expression: 'talking',
      clothing: 'pelt',
      armPose: 'thinker',
      seed: 108,
    });

    // Expanding thought cloud overhead in Beat 2
    if (cloudSpring > 0.05) {
      const cloudX = cx + 180;
      const cloudY = cy - 80;
      ctx.save();
      ctx.translate(cloudX, cloudY);
      ctx.scale(cloudSpring, cloudSpring);

      sCircle(-180, 160, 12, 850, STROKE_COLOR, 2, '#ffffff');
      sCircle(-140, 120, 18, 851, STROKE_COLOR, 2, '#ffffff');
      sCircle(-90, 70, 24, 852, STROKE_COLOR, 2, '#ffffff');

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(-70, 0, 55, 0, Math.PI * 2);
      ctx.arc(0, -25, 65, 0, Math.PI * 2);
      ctx.arc(70, 0, 55, 0, Math.PI * 2);
      ctx.arc(0, 30, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inside thought cloud: Tomorrow's sunrise & stretched hide on rack in Beat 3
      if (ideaSpring > 0.1) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 15, 30, Math.PI, Math.PI * 2);
        ctx.fill();

        sLine(-35, 15, -35, -25, 860, '#78350f', 3);
        sLine(35, 15, 35, -25, 861, '#78350f', 3);
        sLine(-40, -25, 40, -25, 862, '#78350f', 3);

        ctx.fillStyle = '#b45309';
        ctx.fillRect(-28, -20, 56, 32);
      }
      ctx.restore();
    }

  } else if (COMP_THEME === 'doodle_microscope_lice') {
    // Beat 1: Scratching pelt -> Beat 2: Giant microscope slides in -> Beat 3: Divergence tree
    const scopeSpring = spring(t, window.DURATION * 0.30, 180, 15);
    const treeSpring = spring(t, window.DURATION * 0.65, 200, 15);

    sLine(cx - W * 0.45, cy + 220, cx + W * 0.45, cy + 220, 10, AMBIENT_LINE, 2);

    // Early human scratching pelt with itch lines
    drawDoodleCharacter({
      x: cx - 240,
      y: cy + 140,
      scale: 1.35,
      hairStyle: 'wild',
      expression: 'shivering',
      clothing: 'pelt',
      armPose: 'shiver',
      seed: 109,
    });

    for (let it = 0; it < 3; it++) {
      const itX = cx - 290 - it * 12;
      const itY = cy + 50 + it * 20;
      sLine(itX, itY, itX + 18, itY - 14, 900 + it, '#f59e0b', 2.5);
    }

    // Microscope slides in in Beat 2
    if (scopeSpring > 0.05) {
      const lensX = cx + 180;
      const lensY = cy;
      const lensR = 150;

      ctx.save();
      ctx.translate(lensX, lensY);
      ctx.scale(scopeSpring, scopeSpring);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.beginPath();
      ctx.arc(0, 0, lensR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Fabric weave grid lines inside lens
      for (let g = -4; g <= 4; g++) {
        sLine(g * 24, -lensR * 0.8, g * 24, lensR * 0.8, 920 + g, 'rgba(56, 189, 248, 0.15)', 2);
        sLine(-lensR * 0.8, g * 24, lensR * 0.8, g * 24, 930 + g, 'rgba(56, 189, 248, 0.15)', 2);
      }

      // Divergence tree in Beat 3
      if (treeSpring > 0.1) {
        sLine(-100, 0, -20, 0, 940, '#f8fafc', 4);
        sCircle(-20, 0, 7, 941, '#d4af37', 2, '#d4af37');

        sLine(-20, 0, 75, -45, 942, '#38bdf8', 4);
        sCircle(82, -45, 8, 943, '#38bdf8', 2, '#38bdf8');

        sLine(-20, 0, 75, 45, 944, '#f43f5e', 4);
        sCircle(82, 45, 8, 945, '#f43f5e', 2, '#f43f5e');
      }
      ctx.restore();
    }

  } else if (COMP_THEME === 'doodle_general_human') {
    // General Expressive Doodled Human Narrator
    sLine(cx - W * 0.4, cy + 220, cx + W * 0.4, cy + 220, 10, AMBIENT_LINE, 2);
    drawDoodleCharacter({
      x: cx,
      y: cy + 140,
      scale: 1.4,
      hairStyle: 'wild',
      expression: 'talking',
      clothing: 'pelt',
      armPose: 'natural',
      seed: 110,
    });

  } else if (COMP_THEME === 'celestial_orbit') {
    // 3D Celestial Body (Earth) with orbiting satellites & signal pulses
    const earthR = Math.min(W, H) * 0.22;

    // Atmospheric halo
    const haloGrad = ctx.createRadialGradient(cx, cy, earthR * 0.9, cx, cy, earthR * 1.45);
    haloGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    haloGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath(); ctx.arc(cx, cy, earthR * 1.45, 0, Math.PI * 2); ctx.fill();

    // Planet body
    const planetGrad = ctx.createRadialGradient(cx - earthR * 0.35, cy - earthR * 0.35, earthR * 0.1, cx, cy, earthR);
    planetGrad.addColorStop(0, '#38bdf8');
    planetGrad.addColorStop(0.7, '#0284c7');
    planetGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = planetGrad;
    ctx.beginPath(); ctx.arc(cx, cy, earthR, 0, Math.PI * 2); ctx.fill();

    // Rotating longitude meridians
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    for (let m = 0; m < 4; m++) {
      const mAngle = t * 0.5 + (m * Math.PI) / 4;
      const mWidth = earthR * Math.cos(mAngle);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(mWidth), earthR, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Latitude parallel rings
    for (let lat = -1; lat <= 1; lat += 2) {
      const latY = cy + lat * earthR * 0.5;
      const latW = earthR * Math.cos(Math.asin(0.5));
      ctx.beginPath();
      ctx.ellipse(cx, latY, latW, earthR * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3 3D-inclined Elliptical Orbits with Satellites
    const orbitAngles = [-0.55, 0.45, 1.2];
    for (let k = 0; k < 3; k++) {
      const a = earthR * (1.85 + k * 0.35);
      const b = a * 0.45;
      const tilt = orbitAngles[k];
      const satSpeed = 0.85 + k * 0.25;
      const satAngle = t * satSpeed + k * 2.1;

      // Draw orbit path
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2); ctx.stroke();

      // Satellite coordinates in tilted frame
      const sxLoc = a * Math.cos(satAngle);
      const syLoc = b * Math.sin(satAngle);
      ctx.restore();

      // Convert to canvas coordinates
      const sx = cx + sxLoc * Math.cos(tilt) - syLoc * Math.sin(tilt);
      const sy = cy + sxLoc * Math.sin(tilt) + syLoc * Math.cos(tilt);

      // Spherical microwave signal pulses from satellite
      for (let wave = 0; wave < 3; wave++) {
        const waveProgress = ((t * 1.6 + wave * 0.33 + k * 0.2) % 1);
        const waveR = waveProgress * earthR * 1.6;
        const waveAlpha = (1 - waveProgress) * 0.5;
        ctx.strokeStyle = k === 0 ? ACCENT : ACCENT2;
        ctx.globalAlpha = waveAlpha;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, waveR, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Draw satellite body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
      // Solar panel wings
      ctx.fillStyle = ACCENT;
      ctx.fillRect(sx - 12, sy - 3, 24, 6);
    }

    // Target beacon on Earth surface
    const beaconX = cx + earthR * 0.28;
    const beaconY = cy + earthR * 0.32;
    const beaconPulse = 1 + 0.35 * Math.sin(t * 5);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(beaconX, beaconY, 14 * beaconPulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(beaconX, beaconY, 4, 0, Math.PI * 2); ctx.fill();

  } else if (COMP_THEME === 'dna_helix') {
    // 3D Rotating DNA Double Helix
    const rungs = 24;
    const spanW = W * 0.72;
    const startX = cx - spanW / 2;
    const stepX = spanW / (rungs - 1);
    const amp = 105;

    for (let i = 0; i < rungs; i++) {
      const rx = startX + i * stepX;
      const phase = rx * 0.007 + t * 2.2;
      const y1 = cy + Math.sin(phase) * amp;
      const y2 = cy - Math.sin(phase) * amp;
      const depth = Math.cos(phase); // z-depth

      // Connecting nucleotide rung
      ctx.strokeStyle = depth > 0 ? ACCENT : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = depth > 0 ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(rx, y1); ctx.lineTo(rx, y2); ctx.stroke();

      // Nodes on strands with depth perspective
      const r1 = 5 + depth * 3;
      const r2 = 5 - depth * 3;
      ctx.fillStyle = ACCENT;
      ctx.beginPath(); ctx.arc(rx, y1, Math.max(2, r1), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ACCENT2;
      ctx.beginPath(); ctx.arc(rx, y2, Math.max(2, r2), 0, Math.PI * 2); ctx.fill();
    }

  } else if (COMP_THEME === 'chart') {
    // Full-Canvas High-Resolution Japanese Candlestick Chart
    const chartW = W * 0.75;
    const chartH = H * 0.44;
    const chartX = cx - chartW / 2;
    const chartY = cy - chartH / 2;
    const baseLine = chartY + chartH;

    // Grid levels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let l = 0; l <= 4; l++) {
      const gy = chartY + (chartH / 4) * l;
      ctx.beginPath(); ctx.moveTo(chartX, gy); ctx.lineTo(chartX + chartW, gy); ctx.stroke();
    }

    // 20 Japanese Candlesticks with wicks
    const candles = 20;
    const cStep = chartW / candles;
    const revealProg = Math.min(1, t / (window.DURATION * 0.8));
    const activeCandles = Math.floor(candles * revealProg);

    const pricePoints = [];
    for (let c = 0; c < activeCandles; c++) {
      const cSeed = c * 37 + 13;
      const isBull = Math.sin(cSeed) > -0.2;
      const bodyH = 25 + Math.abs(Math.sin(cSeed * 1.5)) * 65;
      const wickTopH = 15 + Math.abs(Math.cos(cSeed)) * 30;
      const wickBotH = 12 + Math.abs(Math.sin(cSeed * 2)) * 25;
      const candleMidY = chartY + chartH * 0.5 + Math.sin(c * 0.35 + t * 0.8) * (chartH * 0.25);
      const candleX = chartX + c * cStep + cStep / 2;

      ctx.strokeStyle = isBull ? '#10b981' : '#ef4444';
      ctx.fillStyle   = isBull ? '#10b981' : '#ef4444';
      ctx.lineWidth   = 2;

      // Wicks
      ctx.beginPath();
      ctx.moveTo(candleX, candleMidY - bodyH / 2 - wickTopH);
      ctx.lineTo(candleX, candleMidY + bodyH / 2 + wickBotH);
      ctx.stroke();

      // Body
      ctx.fillRect(candleX - cStep * 0.35, candleMidY - bodyH / 2, cStep * 0.7, bodyH);
      pricePoints.push({ x: candleX, y: candleMidY });
    }

    // Glowing EMA Moving Average Ribbon
    if (pricePoints.length > 1) {
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pricePoints[0].x, pricePoints[0].y);
      for (let p = 1; p < pricePoints.length; p++) {
        const xc = (pricePoints[p - 1].x + pricePoints[p].x) / 2;
        const yc = (pricePoints[p - 1].y + pricePoints[p].y) / 2;
        ctx.quadraticCurveTo(pricePoints[p - 1].x, pricePoints[p - 1].y, xc, yc);
      }
      ctx.stroke();

      // Ticker badge on last point
      const lastPt = pricePoints[pricePoints.length - 1];
      ctx.fillStyle = ACCENT;
      ctx.fillRect(lastPt.x + 8, lastPt.y - 12, 70, 24);
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('+34.8%', lastPt.x + 43, lastPt.y + 4);
    }

  } else if (COMP_THEME === 'timeline') {
    // 3D Milestone Roadmap with Royal Golden Seals
    const stations = 5;
    const spanW = W * 0.76;
    const startX = cx - spanW / 2;
    const stepX = spanW / (stations - 1);
    const lineY = cy + 15;

    // Glowing road baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(startX, lineY); ctx.lineTo(startX + spanW, lineY); ctx.stroke();

    const activeDist = Math.min(1, t / (window.DURATION * 0.85));
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(startX, lineY); ctx.lineTo(startX + spanW * activeDist, lineY); ctx.stroke();

    for (let s = 0; s < stations; s++) {
      const sx = startX + s * stepX;
      const sActive = (s / (stations - 1)) <= activeDist;
      const sScale = spring(t, 0.1 + s * 0.14);

      // Milestone seal node
      ctx.fillStyle = sActive ? ACCENT : 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath(); ctx.arc(sx, lineY, 18 * Math.min(1, sScale), 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, lineY, 8 * Math.min(1, sScale), 0, Math.PI * 2); ctx.stroke();

      // Milestone Year / Chapter Label
      ctx.font = 'bold 15px ' + FONT_DISPLAY;
      ctx.fillStyle = sActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('ERA 0' + (s + 1), sx, lineY - 35);
    }

  } else if (COMP_THEME === 'nodes') {
    // Full-Canvas Neural Network / Distributed Topology
    const tiers = [
      [[-W * 0.32, -80], [-W * 0.32, 0], [-W * 0.32, 80]],
      [[-W * 0.12, -110], [-W * 0.12, -40], [-W * 0.12, 40], [-W * 0.12, 110]],
      [[W * 0.12, -110], [W * 0.12, -40], [W * 0.12, 40], [W * 0.12, 110]],
      [[W * 0.32, -60], [W * 0.32, 60]]
    ];

    ctx.lineWidth = 1.5;
    // Synapse connections
    for (let tier = 0; tier < tiers.length - 1; tier++) {
      for (const [x1, y1] of tiers[tier]) {
        for (const [x2, y2] of tiers[tier + 1]) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.beginPath(); ctx.moveTo(cx + x1, cy + y1); ctx.lineTo(cx + x2, cy + y2); ctx.stroke();
        }
      }
    }

    // Traveling glowing energy pulses
    for (let p = 0; p < 8; p++) {
      const pProg = (t * 0.7 + p * 0.14) % 1;
      const tierIdx = Math.floor(pProg * 3);
      const subProg = (pProg * 3) % 1;
      const startTier = tiers[tierIdx];
      const endTier = tiers[tierIdx + 1];
      const nodeA = startTier[p % startTier.length];
      const nodeB = endTier[(p + 1) % endTier.length];
      const ex = cx + nodeA[0] + (nodeB[0] - nodeA[0]) * subProg;
      const ey = cy + nodeA[1] + (nodeB[1] - nodeA[1]) * subProg;

      ctx.fillStyle = ACCENT;
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Node glyphs
    for (const tier of tiers) {
      for (const [nx, ny] of tier) {
        ctx.fillStyle = ACCENT2;
        ctx.beginPath(); ctx.arc(cx + nx, cy + ny, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx + nx, cy + ny, 4, 0, Math.PI * 2); ctx.fill();
      }
    }

  } else if (COMP_THEME === 'radar_globe') {
    // 3D Tactical Wireframe Rotating Radar Globe
    const globeR = 150;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;

    // Outer degree ring
    ctx.beginPath(); ctx.arc(cx, cy, globeR, 0, Math.PI * 2); ctx.stroke();
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * (globeR - 6), cy + Math.sin(rad) * (globeR - 6));
      ctx.lineTo(cx + Math.cos(rad) * (globeR + 6), cy + Math.sin(rad) * (globeR + 6));
      ctx.stroke();
    }

    // Rotating longitude circles
    for (let m = 0; m < 4; m++) {
      const mAngle = t * 0.6 + (m * Math.PI) / 4;
      const mW = globeR * Math.cos(mAngle);
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(mW), globeR, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Sweeping radar beam
    const sweepAngle = t * 2.2;
    const sweepGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, globeR);
    sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, globeR, sweepAngle - 0.6, sweepAngle);
    ctx.fill();

  } else if (COMP_THEME === 'isometric_geometry') {
    // True 3D Wireframe Polyhedron (Rotating Octahedron)
    const rotX = t * 0.7;
    const rotY = t * 1.1;
    const verts3D = [
      [0, -110, 0], [110, 0, 0], [0, 0, 110], [-110, 0, 0], [0, 0, -110], [0, 110, 0]
    ];
    const edges = [
      [0,1], [0,2], [0,3], [0,4],
      [5,1], [5,2], [5,3], [5,4],
      [1,2], [2,3], [3,4], [4,1]
    ];

    // Project vertices
    const projected = verts3D.map(([x, y, z]) => {
      // Rotate Y
      const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
      const z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
      // Rotate X
      const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
      const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
      const fov = 350;
      const scale = fov / (fov + z2);
      return [cx + x1 * scale, cy + y2 * scale];
    });

    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2.5;
    for (const [v1, v2] of edges) {
      ctx.beginPath();
      ctx.moveTo(projected[v1][0], projected[v1][1]);
      ctx.lineTo(projected[v2][0], projected[v2][1]);
      ctx.stroke();
    }
    for (const [px, py] of projected) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    }

  } else if (COMP_THEME === 'code') {
    // Sleek Developer Terminal Window
    const winW = W * 0.65;
    const winH = H * 0.42;
    const winX = cx - winW / 2;
    const winY = cy - winH / 2;

    ctx.fillStyle = 'rgba(10, 15, 26, 0.9)';
    ctx.strokeStyle = CARD_BORDER;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(winX, winY, winW, winH, 14); ctx.fill(); ctx.stroke();

    // Window controls
    ctx.fillStyle = '#ff5f56'; ctx.beginPath(); ctx.arc(winX + 24, winY + 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffbd2e'; ctx.beginPath(); ctx.arc(winX + 44, winY + 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27c93f'; ctx.beginPath(); ctx.arc(winX + 64, winY + 22, 6, 0, Math.PI * 2); ctx.fill();

    const codeLines = [
      'import { FrameForge } from "@amg555/frameforge";',
      'const engine = new FrameForge.AestheticEngine();',
      'await engine.renderScene({',
      '  style: "' + AESTHETIC + '",',
      '  fidelity: "CINEMATIC_24FPS"',
      '});'
    ];
    ctx.font = '19px "Fira Code", monospace';
    const typeProg = Math.min(1, t / (window.DURATION * 0.75));
    const totalChars = codeLines.join('\\n').length;
    let charsToShow = Math.floor(totalChars * typeProg);

    let lineY = winY + 70;
    for (let l = 0; l < codeLines.length; l++) {
      const line = codeLines[l];
      const sliceLen = Math.min(line.length, charsToShow);
      const textToDraw = line.slice(0, sliceLen);
      charsToShow = Math.max(0, charsToShow - line.length - 1);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.textAlign = 'left';
      ctx.fillText(String(l + 1).padStart(2, '0'), winX + 26, lineY);
      ctx.fillStyle = l === 0 ? ACCENT : l === 1 ? ACCENT2 : '#e2e8f0';
      ctx.fillText(textToDraw, winX + 70, lineY);
      lineY += 32;
    }

  } else if (COMP_THEME === 'speed_action') {
    // High-Energy Speed Streaks & Shockwaves
    const waveR = ((t * 1.8) % 1) * 220;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, waveR, 0, Math.PI * 2); ctx.stroke();

    for (let s = 0; s < 12; s++) {
      const sx = ((s * 90 + t * 900) % (W * 1.2)) - W * 0.1;
      ctx.strokeStyle = ACCENT2;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, cy - 80); ctx.lineTo(sx - 150, cy + 80); ctx.stroke();
    }

  } else if (COMP_THEME === 'quote') {
    // Editorial Quote
    ctx.font = 'bold 110px serif';
    ctx.fillStyle = ACCENT;
    ctx.textAlign = 'center';
    ctx.fillText('“', cx, cy - 40);

    ctx.font = 'italic 30px ' + FONT_DISPLAY;
    ctx.fillStyle = '#ffffff';
    const quoteText = NARRATION.length > 95 ? NARRATION.slice(0, 95) + '...' : NARRATION;
    ctx.fillText(quoteText, cx, cy + 25);

  } else if (COMP_THEME === 'metric') {
    // Massive Animated KPI Gauge
    const centerVal = Math.round(spring(t, 0.15) * 98.4);
    const radius = 95;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 16;
    ctx.beginPath();
    const arcEnd = -Math.PI / 2 + (Math.PI * 2) * (spring(t, 0.2) * 0.984);
    ctx.arc(cx, cy, radius, -Math.PI / 2, arcEnd);
    ctx.stroke();

    ctx.font = 'bold 54px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(centerVal + '%', cx, cy + 18);

  } else if (COMP_THEME === 'image' && cachedImage && cachedImage.complete && cachedImage.naturalWidth > 0) {
    // Floating Ken-Burns Image Card
    const imgW = W * 0.65;
    const imgH = H * 0.44;
    const zoom = 1.0 + (t / window.DURATION) * 0.08;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(cx - imgW / 2, cy - imgH / 2, imgW, imgH, 16); ctx.clip();
    ctx.scale(zoom, zoom);
    ctx.drawImage(cachedImage, cx - imgW / 2, cy - imgH / 2, imgW, imgH);
    ctx.restore();

  } else {
    // Kinetic Frequency Equalizer Waveform
    const bars = 36;
    const barW = (W * 0.7) / bars;
    const startX = cx - (W * 0.7) / 2;
    for (let b = 0; b < bars; b++) {
      const phase = t * 4.5 + b * 0.28;
      const hVal = 25 + 110 * Math.abs(Math.sin(phase) * Math.cos(phase * 0.8));
      const bx = startX + b * barW;
      const by = cy - hVal / 2;

      const barGrad = ctx.createLinearGradient(0, by, 0, by + hVal);
      barGrad.addColorStop(0, ACCENT);
      barGrad.addColorStop(1, ACCENT2);
      ctx.fillStyle = barGrad;
      ctx.beginPath(); ctx.roundRect(bx, by, barW - 6, hVal, 4); ctx.fill();
    }
  }

  ctx.restore();
}

// ── Sentence-Synchronized Broadcast Subtitles Overlay ───────────────────────
function drawCinematicOverlay(t) {
  ctx.save();

  // Subtitles / Spoken Narration - ONLY rendered when explicitly asked in prompt or options
  if (SHOW_CAPTIONS && NARRATION && NARRATION.trim().length > 0) {
    // Split narration into natural spoken sentence chunks
    const sentences = NARRATION.split(/[.!?;|]+/).map(s => s.trim()).filter(Boolean);

    const count = Math.max(1, sentences.length);
    const sentDur = window.DURATION / count;
    const currIdx = Math.min(count - 1, Math.floor(t / sentDur));
    const activeText = sentences[currIdx] || NARRATION;

    // Sentence local spring transition (smooth entrance per sentence)
    const localT = t - currIdx * sentDur;
    const sentSpring = spring(localT, 0.04, 210, 16);
    const sentAlpha = Math.min(1, Math.max(0, sentSpring));
    const sentSlideY = (1 - sentSpring) * 10;

    ctx.save();
    ctx.globalAlpha = sentAlpha;
    ctx.font = '500 32px ' + FONT_BODY;
    ctx.textAlign = 'center';

    // Word wrap if sentence is long (> 58 chars)
    const maxChars = 56;
    const words = activeText.split(' ');
    const lines = [];
    let currentLine = '';
    for (let w = 0; w < words.length; w++) {
      const testLine = currentLine ? currentLine + ' ' + words[w] : words[w];
      if (testLine.length > maxChars && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = words[w];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const subBaseY = H * 0.90 + sentSlideY;
    const lineSpacing = 44;
    const startY = subBaseY - ((lines.length - 1) * lineSpacing) / 2;

    for (let l = 0; l < lines.length; l++) {
      const ly = startY + l * lineSpacing;
      // Soft translucent background backing for broadcast legibility
      const textMetrics = ctx.measureText(lines[l]);
      const pillW = textMetrics.width + 40;
      ctx.fillStyle = 'rgba(6, 9, 14, 0.72)';
      ctx.beginPath();
      ctx.roundRect((W - pillW) / 2, ly - 28, pillW, 38, 8);
      ctx.fill();

      // Subtitle text with subtle glow
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 12;
      ctx.fillText(lines[l], W / 2, ly);
    }
    ctx.restore();
  }

  ctx.restore();

  // Bottom Progress Indicator (minimal line)
  ctx.save();
  const progress = Math.min(1, Math.max(0, t / window.DURATION));
  ctx.globalAlpha = 0.85;
  const progGrad = ctx.createLinearGradient(0, 0, W, 0);
  progGrad.addColorStop(0, ACCENT);
  progGrad.addColorStop(1, ACCENT2);
  ctx.fillStyle = progGrad;
  ctx.fillRect(0, H - 4, W * progress, 4);
  ctx.restore();
}

// ── Master Seek Hook ───────────────────────────────────────────────────────────
window.seek = async (t) => {
  drawBackground(t);
  drawMainScene(t);
  drawCinematicOverlay(t);
};
</script>
</body>
</html>`;
}

// ── LLM Creative Code Generator ──────────────────────────────────────────────
/**
 * Asks an LLM (Claude, Groq, Gemini, OpenAI, etc.) to write raw pure-function-of-t
 * HTML5 Canvas animation code for a given scene brief.
 * Returns raw JavaScript for window.seek = async (t) => { ... }, or null if unavailable.
 */
async function generateSceneCodeWithLLM({
  visualDescription = '',
  caption = '',
  narration = '',
  topic = '',
  style = '',
  language = '',
  duration = 3,
  width = 1920,
  height = 1080,
} = {}) {
  try {
    const { LLMProvider } = require('../pipeline/providers');
    const llm = new LLMProvider();
    const system = `You are an elite creative motion graphics developer writing high-end JavaScript Canvas animation code for video production.
You write code where EVERY PIXEL IS A PURE FUNCTION OF TIME t (seconds).
AVAILABLE VARIABLES:
- canvas, ctx, W (${width}), H (${height}), DURATION (${duration}), FONT_DISPLAY, FONT_BODY
AVAILABLE HELPERS:
- spring(t, delay, tension, friction), lerp(t, a, b, t0, t1), clamp(val, min, max)
- easeIn(t), easeOut(t), easeInOut(t), boilSeed(t, seed), hash(i)
RULES:
1. Every element must animate smoothly over time t [0..DURATION].
2. If narration, key phrase, or visual direction involves human actions, history, emotions, characters, or daily life (e.g. choosing clothes, shivering in cold, sewing hides, meeting another tribe, mirror reflection, thinking by fire), ALWAYS animate expressive hand-drawn doodled human figures actively performing those actions (limbs, head, gestures, facial expressions, setting props) rather than sterile abstract diagrams.
3. Fill the canvas with rich visual geometry, fluid strokes, animated characters, particles, or cinematic diagrams matching the prompt.
4. NEVER use Math.random(), setTimeout, setInterval, Date.now(), performance.now(). All motion must be a pure mathematical function of time t.
5. Output ONLY raw executable JavaScript code for the body of window.seek = async (t) => { ... }.
6. NO markdown backticks, NO explanations. Start directly with JavaScript.`;

    const user = `TOPIC: ${topic || 'Visual Explainer'}
VISUAL DIRECTION: ${visualDescription || caption || 'Dynamic motion graphics'}
KEY PHRASE: ${caption}
NARRATION: ${narration}
STYLE: ${style || 'cinematic'}
DURATION: ${duration}s

Write the canvas drawing code for time t.`;

    const raw = await llm.chat({ system, user, temperature: 0.7, maxTokens: 4000 });
    if (!raw) return null;
    let cleanCode = raw.trim();
    if (cleanCode.startsWith('```')) {
      cleanCode = cleanCode.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    if (cleanCode.length > 20 && (cleanCode.includes('ctx.') || cleanCode.includes('fillRect'))) {
      return cleanCode;
    }
    return null;
  } catch (_) {
    return null;
  }
}

module.exports = {
  generateSceneHtml,
  wrapCodeInHarnessHtml,
  generateSceneCodeWithLLM,
  detectAesthetic,
  detectComponentTheme,
  detectCaptionsRequested,
  getScriptFontStack,
  AESTHETICS,
  REGIONAL_FONTS,
};
