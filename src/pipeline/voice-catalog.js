'use strict';

/**
 * FrameForge Voice Catalog
 *
 * Canonical, language-keyed voice catalog for all supported TTS providers.
 * Used by:
 *   - TTSProvider.selectNarratorVoice()  (auto-selection)
 *   - list_voices MCP tool               (agent presentation + user selection)
 *   - preview_voice MCP tool             (short audio sample before full render)
 *
 * Each entry:
 *   { id, name, gender, style, provider, langCode, sample? }
 *
 * "sample" is a short sentence used by preview_voice to let the user hear the voice.
 * "style"  is a 1-word description of the voice character.
 */

/**
 * Short sample sentences per language for voice preview.
 * Kept under ~12 words / ~4 seconds so preview is instant.
 */
const SAMPLE_SENTENCES = {
  en: "Hello! This is a preview of your selected voice for the video.",
  ml: "നമസ്കാരം! ഇത് നിങ്ങളുടെ തിരഞ്ഞെടുത്ത ശബ്ദത്തിന്റെ പ്രിവ്യൂ ആണ്.",
  hi: "नमस्ते! यह आपकी चुनी हुई आवाज़ का पूर्वावलोकन है।",
  ta: "வணக்கம்! இது உங்கள் தேர்ந்தெடுத்த குரலின் முன்னோட்டம்.",
  te: "నమస్కారం! ఇది మీరు ఎంచుకున్న స్వరం యొక్క ముందస్తు వినికిడి.",
  kn: "ನಮಸ್ಕಾರ! ಇದು ನಿಮ್ಮ ಆಯ್ಕೆ ಮಾಡಿದ ಧ್ವನಿಯ ಪೂರ್ವವೀಕ್ಷಣೆ.",
  bn: "নমস্কার! এটি আপনার নির্বাচিত কণ্ঠস্বরের পূর্বরূপ।",
  mr: "नमस्कार! हे तुमच्या निवडलेल्या आवाजाचे पूर्वावलोकन आहे.",
  gu: "નમસ્તે! આ તમારા પસંદ કરેલા અવાજનો પ્રિવ્યૂ છે.",
  pa: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਇਹ ਤੁਹਾਡੀ ਚੁਣੀ ਹੋਈ ਆਵਾਜ਼ ਦਾ ਪ੍ਰੀਵਿਊ ਹੈ।",
  ur: "السلام علیکم! یہ آپ کی منتخب آواز کا پیش نظارہ ہے۔",
  ar: "مرحبًا! هذا معاينة للصوت الذي اخترته لمقطع الفيديو.",
  fr: "Bonjour ! Voici un aperçu de la voix sélectionnée pour votre vidéo.",
  de: "Hallo! Dies ist eine Vorschau der ausgewählten Stimme für Ihr Video.",
  es: "¡Hola! Esta es una vista previa de la voz seleccionada para tu vídeo.",
  pt: "Olá! Esta é uma prévia da voz selecionada para o seu vídeo.",
  zh: "你好！这是您为视频选择的语音预览。",
  ja: "こんにちは！これはあなたが選んだ声のプレビューです。",
  ko: "안녕하세요! 이것은 선택한 목소리의 미리보기입니다.",
  ru: "Здравствуйте! Это предварительный просмотр выбранного голоса для видео.",
  it: "Ciao! Questa è un'anteprima della voce selezionata per il tuo video.",
  nl: "Hallo! Dit is een voorbeeld van de geselecteerde stem voor uw video.",
  tr: "Merhaba! Bu, videonuz için seçtiğiniz sesin önizlemesidir.",
  vi: "Xin chào! Đây là bản xem trước giọng nói bạn đã chọn cho video.",
  id: "Halo! Ini adalah pratinjau suara yang Anda pilih untuk video.",
  th: "สวัสดี! นี่คือตัวอย่างเสียงที่คุณเลือกสำหรับวิดีโอ",
  pl: "Cześć! To jest podgląd wybranego głosu do Twojego wideo.",
  sv: "Hej! Det här är en förhandsgranskning av den valda rösten för din video.",
};

/** @type {Record<string, Array<{id:string, name:string, gender:string, style:string, provider:string, langCode:string}>>} */
const VOICE_CATALOG = {
  // ── English ─────────────────────────────────────────────────────────────
  en: [
    { id: 'en-US-BrianNeural',      name: 'Brian',      gender: 'male',   style: 'authoritative', provider: 'edge-tts', langCode: 'en' },
    { id: 'en-US-GuyNeural',        name: 'Guy',        gender: 'male',   style: 'casual',        provider: 'edge-tts', langCode: 'en' },
    { id: 'en-US-EricNeural',       name: 'Eric',       gender: 'male',   style: 'clear',         provider: 'edge-tts', langCode: 'en' },
    { id: 'en-US-JennyNeural',      name: 'Jenny',      gender: 'female', style: 'warm',          provider: 'edge-tts', langCode: 'en' },
    { id: 'en-US-AriaNeural',       name: 'Aria',       gender: 'female', style: 'expressive',    provider: 'edge-tts', langCode: 'en' },
    { id: 'en-GB-RyanNeural',       name: 'Ryan (UK)',  gender: 'male',   style: 'british',       provider: 'edge-tts', langCode: 'en' },
    { id: 'en-GB-SoniaNeural',      name: 'Sonia (UK)', gender: 'female', style: 'british',       provider: 'edge-tts', langCode: 'en' },
    { id: 'en-AU-WilliamNeural',    name: 'William (AU)',gender:'male',   style: 'australian',    provider: 'edge-tts', langCode: 'en' },
    // ElevenLabs
    { id: 'pNInz6obpgDQGcFmaJgB',  name: 'Adam',       gender: 'male',   style: 'deep',          provider: 'elevenlabs', langCode: 'en' },
    { id: '21m00Tcm4TlvDq8ikWAM',  name: 'Rachel',     gender: 'female', style: 'calm',          provider: 'elevenlabs', langCode: 'en' },
    { id: 'AZnzlk1XvdvUeBnXmlld',  name: 'Domi',       gender: 'female', style: 'strong',        provider: 'elevenlabs', langCode: 'en' },
    { id: 'EXAVITQu4vr4xnSDxMaL',  name: 'Bella',      gender: 'female', style: 'soft',          provider: 'elevenlabs', langCode: 'en' },
    { id: 'ErXwobaYiN019PkySvjV',   name: 'Antoni',     gender: 'male',   style: 'well-rounded',  provider: 'elevenlabs', langCode: 'en' },
    { id: 'VR6AewLTigWG4xSOukaG',  name: 'Arnold',     gender: 'male',   style: 'crisp',         provider: 'elevenlabs', langCode: 'en' },
    // OpenAI
    { id: 'onyx',    name: 'Onyx',    gender: 'male',   style: 'deep',    provider: 'openai', langCode: 'en' },
    { id: 'echo',    name: 'Echo',    gender: 'male',   style: 'smooth',  provider: 'openai', langCode: 'en' },
    { id: 'fable',   name: 'Fable',   gender: 'male',   style: 'british', provider: 'openai', langCode: 'en' },
    { id: 'nova',    name: 'Nova',    gender: 'female', style: 'warm',    provider: 'openai', langCode: 'en' },
    { id: 'shimmer', name: 'Shimmer', gender: 'female', style: 'clear',   provider: 'openai', langCode: 'en' },
    { id: 'alloy',   name: 'Alloy',   gender: 'neutral',style: 'versatile',provider:'openai', langCode: 'en' },
    // Azure
    { id: 'en-US-GuyNeural',   name: 'Guy (Azure)',   gender: 'male',   style: 'casual', provider: 'azure', langCode: 'en' },
    { id: 'en-US-JennyNeural', name: 'Jenny (Azure)', gender: 'female', style: 'warm',   provider: 'azure', langCode: 'en' },
  ],

  // ── Malayalam ────────────────────────────────────────────────────────────
  ml: [
    { id: 'ml-IN-MidhunNeural',   name: 'Midhun',   gender: 'male',   style: 'clear',  provider: 'edge-tts', langCode: 'ml' },
    { id: 'ml-IN-SobhanaNeural',  name: 'Sobhana',  gender: 'female', style: 'warm',   provider: 'edge-tts', langCode: 'ml' },
    // ElevenLabs multilingual model supports Malayalam
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (ML)', gender: 'male',   style: 'deep',  provider: 'elevenlabs', langCode: 'ml', note: 'eleven_multilingual_v2' },
    // Azure
    { id: 'ml-IN-MidhunNeural',   name: 'Midhun (Azure)',  gender: 'male',   style: 'clear', provider: 'azure', langCode: 'ml' },
    { id: 'ml-IN-SobhanaNeural',  name: 'Sobhana (Azure)', gender: 'female', style: 'warm',  provider: 'azure', langCode: 'ml' },
  ],

  // ── Hindi ────────────────────────────────────────────────────────────────
  hi: [
    { id: 'hi-IN-MadhurNeural',  name: 'Madhur',  gender: 'male',   style: 'clear',      provider: 'edge-tts', langCode: 'hi' },
    { id: 'hi-IN-SwaraNeural',   name: 'Swara',   gender: 'female', style: 'expressive', provider: 'edge-tts', langCode: 'hi' },
    { id: 'hi-IN-MadhurNeural',  name: 'Madhur (Azure)', gender: 'male',   style: 'clear', provider: 'azure', langCode: 'hi' },
    { id: 'hi-IN-SwaraNeural',   name: 'Swara (Azure)',  gender: 'female', style: 'expressive', provider: 'azure', langCode: 'hi' },
    { id: 'pNInz6obpgDQGcFmaJgB',name: 'Adam (HI)',  gender: 'male', style: 'deep', provider: 'elevenlabs', langCode: 'hi', note: 'eleven_multilingual_v2' },
  ],

  // ── Tamil ────────────────────────────────────────────────────────────────
  ta: [
    { id: 'ta-IN-ValluvarNeural',  name: 'Valluvar', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'ta' },
    { id: 'ta-IN-PallaviNeural',   name: 'Pallavi',  gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'ta' },
    { id: 'ta-SG-AnbuNeural',      name: 'Anbu (SG)',gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'ta' },
    { id: 'ta-IN-ValluvarNeural',  name: 'Valluvar (Azure)', gender: 'male',   style: 'clear', provider: 'azure', langCode: 'ta' },
    { id: 'ta-IN-PallaviNeural',   name: 'Pallavi (Azure)',  gender: 'female', style: 'warm',  provider: 'azure', langCode: 'ta' },
  ],

  // ── Telugu ────────────────────────────────────────────────────────────────
  te: [
    { id: 'te-IN-MohanNeural',   name: 'Mohan',   gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'te' },
    { id: 'te-IN-ShrutiNeural',  name: 'Shruti',  gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'te' },
    { id: 'te-IN-MohanNeural',   name: 'Mohan (Azure)',  gender: 'male',   style: 'clear', provider: 'azure', langCode: 'te' },
    { id: 'te-IN-ShrutiNeural',  name: 'Shruti (Azure)', gender: 'female', style: 'warm',  provider: 'azure', langCode: 'te' },
  ],

  // ── Kannada ──────────────────────────────────────────────────────────────
  kn: [
    { id: 'kn-IN-GaganNeural',  name: 'Gagan',  gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'kn' },
    { id: 'kn-IN-SapnaNeural',  name: 'Sapna',  gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'kn' },
    { id: 'kn-IN-GaganNeural',  name: 'Gagan (Azure)', gender: 'male',   style: 'clear', provider: 'azure', langCode: 'kn' },
    { id: 'kn-IN-SapnaNeural',  name: 'Sapna (Azure)', gender: 'female', style: 'warm',  provider: 'azure', langCode: 'kn' },
  ],

  // ── Bengali ──────────────────────────────────────────────────────────────
  bn: [
    { id: 'bn-IN-BashkarNeural',  name: 'Bashkar', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'bn' },
    { id: 'bn-IN-TanishaaNeural', name: 'Tanishaa',gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'bn' },
    { id: 'bn-BD-NabanitaNeural', name: 'Nabanita (BD)', gender: 'female', style: 'clear', provider: 'edge-tts', langCode: 'bn' },
    { id: 'bn-BD-PradeepNeural',  name: 'Pradeep (BD)',  gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'bn' },
  ],

  // ── Marathi ──────────────────────────────────────────────────────────────
  mr: [
    { id: 'mr-IN-ManoharNeural', name: 'Manohar', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'mr' },
    { id: 'mr-IN-AarohiNeural',  name: 'Aarohi',  gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'mr' },
  ],

  // ── Gujarati ─────────────────────────────────────────────────────────────
  gu: [
    { id: 'gu-IN-NiranjanNeural', name: 'Niranjan', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'gu' },
    { id: 'gu-IN-DhwaniNeural',   name: 'Dhwani',   gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'gu' },
  ],

  // ── Punjabi ──────────────────────────────────────────────────────────────
  pa: [
    { id: 'pa-IN-OjasvNeural', name: 'Ojas', gender: 'neutral', style: 'clear', provider: 'edge-tts', langCode: 'pa' },
  ],

  // ── Urdu ─────────────────────────────────────────────────────────────────
  ur: [
    { id: 'ur-PK-AsadNeural',  name: 'Asad',  gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'ur' },
    { id: 'ur-PK-UzmaNeural',  name: 'Uzma',  gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'ur' },
    { id: 'ur-IN-GulNeural',   name: 'Gul (IN)', gender: 'female', style: 'warm', provider: 'edge-tts', langCode: 'ur' },
    { id: 'ur-IN-SalmanNeural',name: 'Salman (IN)', gender: 'male', style: 'clear', provider: 'edge-tts', langCode: 'ur' },
  ],

  // ── Arabic ───────────────────────────────────────────────────────────────
  ar: [
    { id: 'ar-SA-HamedNeural',   name: 'Hamed (SA)',  gender: 'male',   style: 'authoritative', provider: 'edge-tts', langCode: 'ar' },
    { id: 'ar-SA-ZariyahNeural', name: 'Zariyah (SA)',gender: 'female', style: 'clear',         provider: 'edge-tts', langCode: 'ar' },
    { id: 'ar-EG-ShakirNeural',  name: 'Shakir (EG)', gender: 'male',   style: 'casual',        provider: 'edge-tts', langCode: 'ar' },
    { id: 'ar-EG-SalmaNeural',   name: 'Salma (EG)',  gender: 'female', style: 'warm',          provider: 'edge-tts', langCode: 'ar' },
  ],

  // ── French ───────────────────────────────────────────────────────────────
  fr: [
    { id: 'fr-FR-HenriNeural',    name: 'Henri',    gender: 'male',   style: 'clear',      provider: 'edge-tts', langCode: 'fr' },
    { id: 'fr-FR-DeniseNeural',   name: 'Denise',   gender: 'female', style: 'expressive', provider: 'edge-tts', langCode: 'fr' },
    { id: 'fr-CA-AntoineNeural',  name: 'Antoine (CA)', gender: 'male',   style: 'casual', provider: 'edge-tts', langCode: 'fr' },
    { id: 'fr-CA-SylvieNeural',   name: 'Sylvie (CA)',  gender: 'female', style: 'warm',   provider: 'edge-tts', langCode: 'fr' },
  ],

  // ── German ───────────────────────────────────────────────────────────────
  de: [
    { id: 'de-DE-ConradNeural', name: 'Conrad', gender: 'male',   style: 'clear',      provider: 'edge-tts', langCode: 'de' },
    { id: 'de-DE-KatjaNeural',  name: 'Katja',  gender: 'female', style: 'expressive', provider: 'edge-tts', langCode: 'de' },
    { id: 'de-DE-KillianNeural',name: 'Killian',gender: 'male',   style: 'authoritative', provider: 'edge-tts', langCode: 'de' },
  ],

  // ── Spanish ──────────────────────────────────────────────────────────────
  es: [
    { id: 'es-ES-AlvaroNeural',  name: 'Álvaro (ES)',  gender: 'male',   style: 'clear',      provider: 'edge-tts', langCode: 'es' },
    { id: 'es-ES-ElviraNeural',  name: 'Elvira (ES)',  gender: 'female', style: 'expressive', provider: 'edge-tts', langCode: 'es' },
    { id: 'es-MX-JorgeNeural',   name: 'Jorge (MX)',   gender: 'male',   style: 'casual',     provider: 'edge-tts', langCode: 'es' },
    { id: 'es-MX-DaliaNeural',   name: 'Dalia (MX)',   gender: 'female', style: 'warm',       provider: 'edge-tts', langCode: 'es' },
  ],

  // ── Portuguese ───────────────────────────────────────────────────────────
  pt: [
    { id: 'pt-BR-AntonioNeural',   name: 'Antônio (BR)', gender: 'male',   style: 'clear',      provider: 'edge-tts', langCode: 'pt' },
    { id: 'pt-BR-FranciscaNeural', name: 'Francisca (BR)',gender:'female', style: 'warm',       provider: 'edge-tts', langCode: 'pt' },
    { id: 'pt-PT-DuarteNeural',    name: 'Duarte (PT)',  gender: 'male',   style: 'authoritative', provider: 'edge-tts', langCode: 'pt' },
    { id: 'pt-PT-RaquelNeural',    name: 'Raquel (PT)',  gender: 'female', style: 'expressive', provider: 'edge-tts', langCode: 'pt' },
  ],

  // ── Chinese ──────────────────────────────────────────────────────────────
  zh: [
    { id: 'zh-CN-YunxiNeural',    name: 'Yunxi',   gender: 'male',   style: 'casual',     provider: 'edge-tts', langCode: 'zh' },
    { id: 'zh-CN-YunjianNeural',  name: 'Yunjian', gender: 'male',   style: 'sports',     provider: 'edge-tts', langCode: 'zh' },
    { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao',gender: 'female', style: 'warm',       provider: 'edge-tts', langCode: 'zh' },
    { id: 'zh-CN-XiaoyiNeural',   name: 'Xiaoyi',  gender: 'female', style: 'lively',     provider: 'edge-tts', langCode: 'zh' },
    { id: 'zh-TW-YunJheNeural',   name: 'YunJhe (TW)', gender: 'male', style: 'clear',    provider: 'edge-tts', langCode: 'zh' },
    { id: 'zh-TW-HsiaoChenNeural',name: 'HsiaoChen (TW)', gender: 'female', style: 'warm', provider: 'edge-tts', langCode: 'zh' },
  ],

  // ── Japanese ─────────────────────────────────────────────────────────────
  ja: [
    { id: 'ja-JP-KeitaNeural',  name: 'Keita',  gender: 'male',   style: 'casual', provider: 'edge-tts', langCode: 'ja' },
    { id: 'ja-JP-NanamiNeural', name: 'Nanami', gender: 'female', style: 'warm',   provider: 'edge-tts', langCode: 'ja' },
  ],

  // ── Korean ───────────────────────────────────────────────────────────────
  ko: [
    { id: 'ko-KR-InJoonNeural', name: 'InJoon', gender: 'male',   style: 'casual', provider: 'edge-tts', langCode: 'ko' },
    { id: 'ko-KR-SunHiNeural',  name: 'SunHi',  gender: 'female', style: 'warm',   provider: 'edge-tts', langCode: 'ko' },
  ],

  // ── Russian ──────────────────────────────────────────────────────────────
  ru: [
    { id: 'ru-RU-DmitryNeural',   name: 'Dmitry',   gender: 'male',   style: 'clear',      provider: 'edge-tts', langCode: 'ru' },
    { id: 'ru-RU-SvetlanaNeural', name: 'Svetlana', gender: 'female', style: 'expressive', provider: 'edge-tts', langCode: 'ru' },
  ],

  // ── Italian ──────────────────────────────────────────────────────────────
  it: [
    { id: 'it-IT-DiegoNeural', name: 'Diego', gender: 'male',   style: 'casual', provider: 'edge-tts', langCode: 'it' },
    { id: 'it-IT-ElsaNeural',  name: 'Elsa',  gender: 'female', style: 'warm',   provider: 'edge-tts', langCode: 'it' },
    { id: 'it-IT-IsabellaNeural', name: 'Isabella', gender: 'female', style: 'expressive', provider: 'edge-tts', langCode: 'it' },
  ],

  // ── Dutch ────────────────────────────────────────────────────────────────
  nl: [
    { id: 'nl-NL-MaartenNeural', name: 'Maarten', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'nl' },
    { id: 'nl-NL-ColetteNeural', name: 'Colette', gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'nl' },
  ],

  // ── Turkish ──────────────────────────────────────────────────────────────
  tr: [
    { id: 'tr-TR-AhmetNeural', name: 'Ahmet', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'tr' },
    { id: 'tr-TR-EmelNeural',  name: 'Emel',  gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'tr' },
  ],

  // ── Vietnamese ───────────────────────────────────────────────────────────
  vi: [
    { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'vi' },
    { id: 'vi-VN-HoaiMyNeural',  name: 'Hoài My',  gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'vi' },
  ],

  // ── Indonesian ───────────────────────────────────────────────────────────
  id: [
    { id: 'id-ID-ArdiNeural',   name: 'Ardi',  gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'id' },
    { id: 'id-ID-GadisNeural',  name: 'Gadis', gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'id' },
  ],

  // ── Thai ─────────────────────────────────────────────────────────────────
  th: [
    { id: 'th-TH-NiwatNeural',      name: 'Niwat',    gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'th' },
    { id: 'th-TH-PremwadeeNeural',  name: 'Premwadee',gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'th' },
  ],

  // ── Polish ───────────────────────────────────────────────────────────────
  pl: [
    { id: 'pl-PL-MarekNeural', name: 'Marek', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'pl' },
    { id: 'pl-PL-ZofiaNeural', name: 'Zofia', gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'pl' },
  ],

  // ── Swedish ──────────────────────────────────────────────────────────────
  sv: [
    { id: 'sv-SE-MattiasNeural', name: 'Mattias', gender: 'male',   style: 'clear', provider: 'edge-tts', langCode: 'sv' },
    { id: 'sv-SE-SofieNeural',   name: 'Sofie',   gender: 'female', style: 'warm',  provider: 'edge-tts', langCode: 'sv' },
  ],
};

/**
 * Get voices available for a given language code and optionally filter by provider.
 *
 * @param {string} [langCode]   BCP-47 prefix e.g. 'en', 'ml', 'hi'. Pass '' or 'all' for every voice.
 * @param {string} [provider]   Filter to a specific provider: 'edge-tts'|'elevenlabs'|'azure'|'openai'. Optional.
 * @param {string[]} [activeProviders]  Providers that have a configured API key (used to mark availability).
 * @returns {Array}
 */
function getVoices(langCode = '', provider = '', activeProviders = ['edge-tts']) {
  const lang = langCode.toLowerCase().slice(0, 2);
  let voices = [];

  if (!lang || lang === 'al') {
    // All languages
    for (const list of Object.values(VOICE_CATALOG)) voices.push(...list);
  } else {
    voices = VOICE_CATALOG[lang] || [];
  }

  if (provider) {
    voices = voices.filter(v => v.provider === provider.toLowerCase());
  }

  // De-duplicate by id+provider (some voices appear for both edge-tts and azure)
  const seen = new Set();
  voices = voices.filter(v => {
    const key = `${v.provider}:${v.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Annotate with availability flag
  return voices.map(v => ({
    ...v,
    available: activeProviders.includes(v.provider),
  }));
}

/**
 * Get the default recommended voice for a language + provider.
 * Returns the first available male voice, or first female, or first any.
 *
 * @param {string} langCode
 * @param {string} provider
 * @param {string} [gender]  'male'|'female'|'default'
 * @returns {string|null}  voice ID or null if not found
 */
function getDefaultVoice(langCode, provider, gender = 'default') {
  const voices = getVoices(langCode, provider);
  if (!voices.length) return null;
  if (gender === 'male')   return (voices.find(v => v.gender === 'male')   || voices[0]).id;
  if (gender === 'female') return (voices.find(v => v.gender === 'female') || voices[0]).id;
  return voices[0].id;
}

/** All supported language codes */
const SUPPORTED_LANGUAGES = Object.keys(VOICE_CATALOG);

module.exports = { VOICE_CATALOG, SAMPLE_SENTENCES, getVoices, getDefaultVoice, SUPPORTED_LANGUAGES };
