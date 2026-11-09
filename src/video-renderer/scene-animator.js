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
function detectComponentTheme({ visualDescription = '', caption = '', narration = '', topic = '', imagePath = null, aesthetic = 'cyber_tech' } = {}) {
  if (imagePath) return 'image';
  const text = `${visualDescription} ${caption} ${narration} ${topic}`.toLowerCase();

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
  duration = 3,
  width = 1920,
  height = 1080,
  sceneIndex = 0,
} = {}) {
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
  if (BG_TYPE === 'grid_perspective') {
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
  const enterSpring = spring(t, 0.05);
  const sceneScale = Math.min(1.02, Math.max(0.9, enterSpring));
  ctx.translate(W / 2, H * 0.40);
  ctx.scale(sceneScale, sceneScale);
  ctx.translate(-W / 2, -H * 0.40);

  const cx = W / 2;
  const cy = H * 0.40;

  if (COMP_THEME === 'celestial_orbit') {
    // 3D Celestial Body (Earth) with orbiting satellites & signal pulses
    const earthR = Math.min(W, H) * 0.15;

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

// ── Cinematic Broadcast Lower-Third Overlay ────────────────────────────────────
function drawCinematicOverlay(t) {
  ctx.save();
  const textSpring = spring(t, 0.18);
  const bannerY = H * 0.74 + (1 - textSpring) * 45;
  const bannerH = H * 0.18;
  const bannerW = W * 0.88;
  const bannerX = (W - bannerW) / 2;

  ctx.globalAlpha = Math.min(1, Math.max(0, textSpring));

  // Glassmorphic Lower-Third Banner
  ctx.fillStyle = 'rgba(8, 12, 22, 0.82)';
  ctx.strokeStyle = CARD_BORDER;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 16);
  ctx.fill();
  ctx.stroke();

  // Accent Left Bar
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.roundRect(bannerX + 16, bannerY + 16, 6, bannerH - 32, 3);
  ctx.fill();

  // Tag Pill
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = ACCENT;
  ctx.textAlign = 'left';
  ctx.fillText(TAG, bannerX + 38, bannerY + 36);

  // Primary Caption Headline
  ctx.font = FONT_WEIGHT + ' 44px ' + FONT_DISPLAY;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.textAlign = 'left';
  const cleanCap = CAPTION.length > 55 ? CAPTION.slice(0, 55) + '...' : CAPTION;
  ctx.fillText(cleanCap, bannerX + 38, bannerY + 84);

  // Subtitle / Narration preview
  if (NARRATION) {
    ctx.font = '400 23px ' + FONT_BODY;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
    ctx.shadowBlur = 8;
    const cleanNarr = NARRATION.length > 95 ? NARRATION.slice(0, 95) + '...' : NARRATION;
    ctx.fillText(cleanNarr, bannerX + 38, bannerY + 120);
  }
  ctx.restore();

  // Bottom Progress Scrubber
  ctx.save();
  const progress = Math.min(1, Math.max(0, t / window.DURATION));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, H - 6, W, 6);

  const progGrad = ctx.createLinearGradient(0, 0, W, 0);
  progGrad.addColorStop(0, ACCENT);
  progGrad.addColorStop(1, ACCENT2);
  ctx.fillStyle = progGrad;
  ctx.fillRect(0, H - 6, W * progress, 6);
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

module.exports = {
  generateSceneHtml,
  wrapCodeInHarnessHtml,
  detectAesthetic,
  detectComponentTheme,
  getScriptFontStack,
  AESTHETICS,
  REGIONAL_FONTS,
};
