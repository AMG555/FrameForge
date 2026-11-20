---
name: stream-clips
description: Turns long livestreams and broadcast recordings (live news channels, press conferences, political debates, podcasts, talk shows, sports, esports, gaming, conferences) into ready-to-post clips in both portrait (9:16 for Shorts, Reels, TikTok) and landscape (16:9 for YouTube, X, broadcast highlights). Supports variable duration from 30s social bites up to 5–10 minute complete news stories and debate segments. Finds major live streams, analyzes audio locally with Whisper, detects audio energy spikes and chat surges, selects viral and high-impact moments via AI, formats frames with intelligent layouts, generates word-by-word subtitles across global and Indian languages (native scripts and Romanized transliteration), and outputs POSTING.md with metadata. Free and local, no API keys; runs across macOS and Windows.
---

# Stream Clips

Long livestreams and broadcast feeds in, polished clips out. **Supports both portrait (9:16) and landscape (16:9) formats, and flexible durations from short bites to complete 5–10 minute news reports.**

`SKILL_DIR` = the folder this file is in. Every command is:

- macOS / Linux: `python3 "SKILL_DIR/scripts/streamclips.py" <command> ...`
- Windows: `python "SKILL_DIR\scripts\streamclips.py" <command> ...` (or `py` if `python` is missing)

Below, `streamclips` is short for that command.

Clips are saved in `~/StreamClips/<date>/<topic>/<creator>__<title>/` (Windows: `C:\Users\<name>\StreamClips\...`).

## 0. First time setup

1. Run `streamclips setup` and wait for **READY**. It verifies ffmpeg, a JavaScript runtime (deno or node; needed for stream downloads) and disk space. It creates a local Python virtual environment in `~/.streamclips`, installs Whisper, OpenCV, Pillow and yt-dlp, and downloads Whisper models and face detection models.
2. If components are missing, install via package managers:
   - macOS: `brew install ffmpeg deno`
   - Windows: `winget install Gyan.FFmpeg` and `winget install DenoLand.Deno`
3. **Typography & Complex Script Subtitles (libass + HarfBuzz):**
   - Standard ffmpeg `drawtext` breaks complex scripts (mangles conjuncts and vowel marks). Subtitles must render via ffmpeg's `subtitles` filter powered by **libass + HarfBuzz**.
   - Ensure TrueType/OpenType Unicode fonts are available (e.g. Google Noto Sans family: `Noto Sans Devanagari`, `Noto Sans Malayalam`, `Noto Sans Tamil`, `Noto Sans Telugu`, `Noto Sans Bengali`, or Windows `Nirmala UI`). Pass font directory via `fontsdir=` or system fontconfig.
4. Run `streamclips doctor` to verify environment readiness at any time.

## 1. Processing pipeline

1. **Audio extraction:** Downloads the stream audio track first for fast, lightweight processing.
2. **Local speech & signal analysis:**
   - Whisper transcribes speech in cached 10-minute blocks.
   - Volume spikes detect shouting, heated debate clashes, breaking news declarations, audience laughter, or high-energy moments.
   - Live chat replay velocity tracks audience reaction peaks when available.
3. **Moment selection & Story Completeness:**
   - The transcript is segmented into windows annotated with `<<VOLUME +N dB>>` and `<<CHAT Nx>>`.
   - The AI identifies high-impact moments tailored to the content type:
     - **News & debates:** `breaking_news`, `debate_clash`, `key_quote`, `revelation`, `hard_question`, `speech_highlight`.
     - **Talk shows & podcasts:** `take`, `story`, `tip`, `insight`, `discussion`.
     - **Sports & gaming:** `reaction`, `skill`, `funny`, `reveal`, `clutch`.
   - **Completeness over arbitrary limits:** Clips are not restricted to under 1 minute. When a news story, policy announcement, or debate exchange requires 2, 5, or up to 10 minutes to reach its natural conclusion without cutting off context or counter-arguments, duration boundaries expand to capture the complete arc.
   - Snaps cut points to natural pauses and clean sentence boundaries.
4. **Clip rendering & framing:**
   - Downloads high-resolution video slices only for selected segments (up to 1080p).
   - Audio is aligned to sub-second synchronization, normalized to -14 LUFS (peak -0.5 dBTP), with smooth 0.5-0.7s audio fades at head and tail.
   - **Portrait (9:16) Framing:**
     - **blur (News & Broadcast standard):** Full uncropped 16:9 news picture (e.g. 1080 × 606 at y ≈ 336) centered over a darkened, blurred 9:16 copy. Preserves 100% of the broadcaster's chyron, lower-third tickers, and live corner clock. Dedicated caption panel sits cleanly in the lower half (y ≈ 1104) without covering broadcast graphics.
     - **stack:** Upper panel tracks speaker/face, lower panel shows primary visual content or gameplay.
     - **crop:** Dynamic face/speaker tracking for solo anchors, guests, podcasts, or field reporting.
   - **Landscape (16:9) Framing:**
     - Full widescreen presentation preserving 100% pixel density (1920 × 1080), broadcast graphics, multi-guest panels, and lower-third chyrons. Primary format for extended 2–10 minute news reports and debate highlights.
   - **Subtitles & Typography:**
     - Word-by-word synchronized subtitles rendered through libass with real text shaping (conjuncts, reordered vowels, and ligatures fully preserved).
     - Full script rendering: Romanized/transliterated (e.g. Hinglish) or native scripts (Devanagari, Dravidian, Bengali, Gurmukhi, etc.).
     - Subtitle wrapping measured by glyph widths to prevent mid-word hyphenation.
5. **Output artifacts:**
   - `POSTING.md`: Platform-ready titles, descriptions, hashtags, wall-clock broadcast window, and viral justification.
   - `clips.json`: Complete timing, layout, and score metadata.
   - `checks/<clip>.jpg`: Multi-frame verification previews.

## 2. Broadcast News Clipping Principles

When clipping live news channels and 24/7 broadcast feeds:

1. **The Chyron is Ground Truth:**
   - Audio transcription alone (especially small models) can struggle with noisy debate floors or rapid regional speech.
   - Broadcaster lower-thirds (chyrons) and headline banners provide primary verified factual text.
   - Story and segment boundaries align directly with lower-third graphic transitions (changes in banner background or headline card swaps).
2. **Wall-Clock & Sliding DVR Synchronization:**
   - 24/7 live streams have rolling DVR manifests that slide over time (often keeping only a 3–5 minute buffer). Relative offsets (`t=600s`) shift continuously.
   - Anchor clips to the broadcaster's burnt-in corner clock (`LIVE NOW HH:MM:SS`). Stepping across minute flips establishes precise wall-clock time (`wall_start`).
3. **Preserving Broadcaster Context:**
   - Never crop 16:9 news feeds tightly in 9:16 if doing so cuts off the chyron, breaking news ticker, or timestamp. Use the fitted 1080 × 606 on blurred backdrop layout.
   - Guard against `force_original_aspect_ratio=decrease` horizontal overflow that clips channel bugs or corner logos.
4. **End Card & Concat Timestamp Safety:**
   - When joining an end card or channel branding card, **re-encode on concat** (`-filter_complex concat=n=2:v=1:a=1`). Stream-copy concats can corrupt timestamps and desync audio at seams.
5. **Temporal Frame Averaging for Broadcast Text:**
   - For noisy live-broadcast streams, averaging 10–50 consecutive frames of static lower-third bars eliminates MPEG macroblocking and compression artifacts for clear reading.

## 3. Clip Duration Strategy: Short vs Long News Packages

Clip duration must fit the story structure rather than a forced 60-second limit:

- **Quick Social Bites (20–59 seconds):**
  - Best for: Single fiery quotes, quick reactions, breaking alert intros, punchlines.
  - Recommended canvas: Portrait (9:16) for YouTube Shorts, Instagram Reels, TikTok.
  - Flags: `--min 20 --max 59`
- **Complete News Reports & Debates (2–5 minutes):**
  - Best for: Full anchor intros, field reporter live handoffs, complete debate point-and-rebuttal rounds, key evidence presentations.
  - Recommended canvas: Landscape (16:9) or fitted portrait (9:16).
  - Flags: `--min 120 --max 300`
- **Extended In-Depth Coverage (5–10 minutes):**
  - Best for: Full press briefings, ministerial addresses, entire panel debate segments, long-form investigative breakdowns.
  - Recommended canvas: Landscape (16:9) for standard YouTube, Facebook, X.
  - Flags: `--min 300 --max 600`
  - In `settings.json`, set `"part_minutes": 15` or `"part_minutes": 20` to allow the AI window to span the entire story arc.

## 4. AI Selection Brain (`--brain`)

The default `--brain auto` detects and uses the active AI environment:

| Environment | Setting | Notes |
|---|---|---|
| Claude Code | `--brain claude` | Calls `claude -p` |
| Codex (ChatGPT) | `--brain codex` | Calls `codex exec` |
| Gemini CLI / Antigravity | `--brain gemini` | Calls `gemini -p` |
| OpenCode | `--brain opencode` | Calls `opencode run` |
| Standalone / Agent Sandbox | `--brain agent` | Generates prompt files for the agent to answer |

Optional `--model <name>` specifies custom model tier (e.g. `--model sonnet`).

**Agent mode workflow (`--brain agent`):**
1. Read generated `part_XXXXXX.prompt.txt` files.
2. Evaluate transcript and signals according to stream type (news, debate, podcast, gaming).
3. Write pure JSON array of chosen moments to corresponding `.answer.json`.
4. Re-run command to finish rendering.

## 5. Usage & Examples

### Live News & Debate Streams
```bash
# 1. Complete 3-to-5 minute news story / debate segment
streamclips clip URL --topic "Policy Announcement" --min 180 --max 300 --focus "complete speech and rebuttal"

# 2. Extended 5-to-10 minute press conference / debate clash
streamclips clip URL --topic "Election Debate" --min 300 --max 600 --clips 2

# 3. Fast breaking news alert bite (< 1 min for Shorts/Reels)
streamclips clip URL --topic "Breaking News" --min 20 --max 59 --clips 3

# 4. Clip specific 2-hour window of a 24/7 live news channel
streamclips clip URL --topic "Live News" --section "1:00:00-3:00:00" --min 120 --max 360
```

### Podcasts, Interviews & Talk Shows
```bash
# Complete interview story (3-5 minutes)
streamclips clip URL --topic "Interview" --min 150 --max 300 --layout crop

# Fast viral take (< 1 min)
streamclips clip URL --topic "Podcast" --min 30 --max 59 --layout crop
```

### Gaming & Live Entertainment
```bash
# Tournament final match round (2-5 minutes)
streamclips clip URL --topic "Tournament" --min 120 --max 300 --layout stack

# Fast clutch / rage bite
streamclips clip URL --topic "Championship" --min 15 --max 59 --layout stack
```

### Orientation & Layout Control

Clips can be produced in either portrait (9:16) or landscape (16:9).

- **Landscape (16:9)** (ideal for 2–10 minute complete news stories, debate highlights, YouTube, X):
  Configure dimensions in `~/StreamClips/settings.json`:
  ```json
  {
    "width": 1920,
    "height": 1080,
    "layout": "auto",
    "cap_y": 0.82,
    "min_len": 120,
    "max_len": 360,
    "part_minutes": 15
  }
  ```
- **Portrait (9:16)** (Shorts, Reels, TikTok, or vertical mobile news):
  ```json
  {
    "width": 1080,
    "height": 1920,
    "layout": "blur",
    "cap_y": 0.70
  }
  ```

### Multilingual Support & Language Configuration

The system provides complete transcription and captioning across major world languages and regional languages, including Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Urdu, English, Spanish, French, Arabic, and more.

- **Automatic detection (default):** Language is auto-detected per block and per clip.
- **Specific language code:** Pass `--language <code>` (e.g. `--language hi`, `--language ta`, `--language te`, `--language ml`, `--language kn`, `--language bn`, `--language mr`, `--language gu`, `--language pa`, `--language ur`, `--language en`, `--language es`).
- **Code-switched & Romanized subtitles (e.g. Hinglish):** Pass `--language en` to generate subtitles in Roman/Latin script.
- **Native script subtitles:** Pass the specific language code (e.g. `--language hi`, `--language mr`, `--language ta`, `--language bn`, `--language ml`). Configure a Unicode font file in `settings.json` under `"title_font_file"` and `"cap_font"` to ensure proper complex script glyph shaping.
- **Enhanced scanning accuracy:** For non-English audio, set `"scan_model": "base"` or `"small"` in `settings.json`.

### Command Line Flags

| Flag | Description |
|---|---|
| `--topic "..."` | Content topic or broadcast theme (guides search & moment scoring) |
| `--focus "..."` | Specific angle (e.g. "breaking updates", "debate clashes", "complete statement") |
| `--keywords "..."` | Search keywords and variations for title matching |
| `--min N` | Minimum clip duration in seconds (e.g. 20 for short bite, 120 for 2 min, 300 for 5 min) |
| `--max N` | Maximum clip duration in seconds (e.g. 59 for Shorts, 300 for 5 min, 600 for 10 min) |
| `--clips N` | Number of clips to extract per stream (default: 3) |
| `--count N` | Number of streams to process when combined with `--find` |
| `--when hour/today/week/month` | Search timeframe filter (default: today) |
| `--search "..."` | Exact search query instead of "<topic> stream" |
| `--parallel N` | Number of streams processed concurrently (default: 2) |
| `--section A-B` | Timestamp range to clip, e.g. `1:15:00-2:30:00` |
| `--new-only` | Process only newly broadcasted segments since previous run |
| `--cookies <browser>` | Use browser session (chrome, firefox, edge) for authenticated/restricted feeds |
| `--layout stack/crop/blur` | Force framing mode (stack = split screen; crop = speaker track; blur = 16:9 on blur) |
| `--cam x,y,w,h` | Manual face/speaker bounding coordinates as fractions of frame |
| `--language <code>` | Explicit language code (`hi`, `ta`, `te`, `ml`, `kn`, `bn`, `mr`, `gu`, `pa`, `ur`, `en`, etc.) |
| `--fast` | Enable hardware-accelerated video encoding (NVENC, VideoToolbox, QSV, AMF) |
| `--repick` | Re-run AI moment selection without re-downloading media |
| `--keep-audio` | Retain complete downloaded stream audio file |

## 6. Discovering Streams & Feeds

`find` queries public stream listings and the local watchlist:

- **Stream Search:** Queries live and recent long-form streams matching `--topic` within the selected time window.
- **Watchlist (`~/StreamClips/watchlist.txt`):** Tracks monitored channels:
  - News channels & broadcasts: `youtube:@ChannelHandle | news`
  - Talk shows & podcasts: `youtube:@PodcastHandle | interview`
  - Streamers & creators: `twitch:<handle>`, `kick:<handle>`, `youtube:@handle`

## 7. Verification & Quality Control

Check output previews in `checks/*.jpg` before publishing:

- **Story Completeness:** Verify the clip does not terminate abruptly mid-sentence, before the counter-argument is delivered, or before the anchor completes the announcement.
- **Framing & Heads:** Ensure speaker or anchor faces are centered in crop/stack layouts.
- **Lower Thirds & Chyrons:** Verify news graphics and tickers are not awkwardly cropped. If a stream features heavy lower-thirds, use landscape mode or adjust `--layout blur` or `--cam`.
- **Subtitles & Text Rendering:** Ensure font size and vertical alignment (`cap_y`) do not collide with on-screen broadcast elements. Ensure native script glyphs render cleanly with correct ligatures and vowel positions.
- **Pacing & Hook:** Review `why` explanations and scores in `POSTING.md`.

## 8. Troubleshooting & Adjustments

- **High-tempo speech / dialect transcription:** Upgrade `"scan_model"` from `"tiny"` to `"base"` or `"small"` in `settings.json`.
- **Complex script rendering / garbled ligatures:** Avoid ffmpeg `drawtext`. Ensure ffmpeg is built with `libass` and use Unicode fonts (`Noto Sans`, `Nirmala UI`).
- **News lower-third collision:** Adjust `"cap_y": 0.82` (or lower) or use landscape 16:9 mode.
- **Restricted / geo-blocked stream:** Add `--cookies chrome` to pass local browser authentication.
- **Low energy score drops:** For formal news broadcasts or interviews without screaming, lower score threshold in `settings.json` (`"min_score": 30`).
- **Banding on broadcast color bars:** Set `"crf": 18` and `"x264_preset": "medium"` in `settings.json`.
