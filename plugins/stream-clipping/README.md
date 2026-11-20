# Stream Clips

Turn long livestreams, news broadcasts, talk shows, podcasts, and gaming streams into ready-to-post clips.

Supports both **portrait (9:16)** for Shorts, Reels, TikTok and **landscape (16:9)** for YouTube, X, and web embeds. Handles **flexible durations** from 20-second viral bites to complete **3-to-10 minute** news reports and debate segments. Transcribes and captions speech across world and regional languages, including full support for Indian languages (Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Urdu, etc.) with both native and Romanized subtitles.

- **Any stream type:** 24/7 news channels, political debates, press conferences, panel discussions, interviews, podcasts, esports, gaming, live sports, and conferences.
- **Flexible duration (30s to 10 min):** Not capped at 1 minute. Extracts full news stories, complete speeches, and multi-round debate clashes without cutoffs.
- **Dual format output:** 9:16 vertical (fitted broadcast on blur, speaker crop, split stack) or 16:9 widescreen.
- **Broadcast-grade chyron & clock preservation:** Full 16:9 news picture (1080 × 606) fitted without cropping, keeping channel logos, breaking news tickers, and corner clocks fully visible.
- **Advanced typography engine:** Subtitle rendering via libass + HarfBuzz with Unicode fonts (e.g. Noto Sans), ensuring correct conjuncts, ligatures, and vowel signs without `drawtext` distortion.
- **Multilingual speech engine:** Local Whisper transcription with auto-detection, code-switching support (e.g. Hinglish), and Unicode subtitle rendering.
- **Intelligent moment extraction:** Identifies breaking news alerts, heated debate clashes, key quotes, humorous moments, high-skill plays, and viral hooks.
- **Free & local:** Speech transcription runs locally. Moment selection uses your existing AI CLI (Claude Code, Codex, Gemini CLI, OpenCode). No external API fees.

## Requirements

- AI CLI: **Gemini CLI**, **Claude Code**, **Codex**, or **OpenCode**.
- **ffmpeg** (with `libass` support) and **deno** (or Node.js):
  - macOS: `brew install ffmpeg deno`
  - Windows: `winget install Gyan.FFmpeg` and `winget install DenoLand.Deno`
- **Python 3.9+** (Windows: `winget install Python.Python.3.12`)
- ~1 GB free disk space

## Quick Start

1. Set up the environment:
   ```bash
   python scripts/streamclips.py setup
   ```
2. Verify installation:
   ```bash
   python scripts/streamclips.py doctor
   ```
3. Extract clips from any livestream or recording:
   ```bash
   # Complete 3-to-5 minute news story
   python scripts/streamclips.py clip <URL> --topic "Policy Announcement" --min 180 --max 300

   # Extended 5-to-10 minute debate segment
   python scripts/streamclips.py clip <URL> --topic "News Debate" --min 300 --max 600

   # Fast breaking news bite (< 1 min for Shorts/Reels)
   python scripts/streamclips.py clip <URL> --topic "Breaking News" --min 20 --max 59

   # Podcast or talk show
   python scripts/streamclips.py clip <URL> --topic "Tech Talk" --layout crop --min 120 --max 240
   ```

## Clip Duration & Orientation Strategy

- **Quick Social Bites (20–59 seconds, 9:16 Portrait):**
  - For YouTube Shorts, Reels, TikTok. Single quote, punchline, or alert.
  - Flags: `--min 20 --max 59`
- **Complete News Reports & Debates (2–5 minutes, 16:9 Landscape or 9:16):**
  - For complete news stories, anchor intros, and full debate exchanges.
  - Flags: `--min 120 --max 300`
- **In-Depth Segments & Press Briefings (5–10 minutes, 16:9 Landscape):**
  - For long-form YouTube, Facebook, and news portal embeds.
  - Flags: `--min 300 --max 600`
  - In `settings.json`:
    ```json
    {
      "width": 1920,
      "height": 1080,
      "min_len": 180,
      "max_len": 600,
      "part_minutes": 20
    }
    ```

## Multilingual Support & Typography

- **Automatic language detection:** Handles bilingual streams and live code-switching naturally.
- **Specific language code:** Use `--language <code>` (e.g. `--language hi` for Hindi, `--language ta` for Tamil, `--language te` for Telugu, `--language ml` for Malayalam, `--language bn` for Bengali, `--language mr` for Marathi, `--language en` for English, `--language es` for Spanish).
- **Romanized captions (e.g. Hinglish):** Use `--language en` to generate Latin script captions.
- **Native scripts & complex shaping:** Uses libass + HarfBuzz. Set `"title_font_file"` or `"cap_font"` in `settings.json` to a Unicode font (e.g. `Noto Sans Devanagari`, `Noto Sans Malayalam`, `Noto Sans Tamil`, `Nirmala UI`) for accurate conjuncts and reordered vowels.
- **Transcription quality:** For regional languages and fast broadcast speech, set `"scan_model": "base"` or `"small"` in `settings.json`.

## Configuration Files

- `SKILL.md`: Detailed agent instructions and command reference.
- `watchlist.txt`: Monitored channels across news, podcasts, creators, and broadcasters.
- `~/StreamClips/settings.json`: Custom overrides for layout, resolution, fonts, thresholds, and models.
