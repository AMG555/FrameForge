---
name: clip-cut
description: Cut and reframe a source video into a 9:16 vertical clip (or 16:9 widescreen) with burned subtitles, title bar, and audio mastering. Use after capture and after timestamps are chosen. Triggers on "make the clip", "cut and reframe", "vertical export", "reframe stream".
---

# Clip Cut

Input: `source.mp4`, `start`, `end`, layout configuration, optional `crop_track.json`.
Output: Finished, ready-to-post `clip.mp4`.

## 1. Trimming & Audio Mastering
Precise cut point with EBU R128 loudness normalization and head/tail zero-crossing audio fades:
```bash
ffmpeg -ss $START -to $END -i source.mp4 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:ss=0:d=0.3,afade=t=out:st=$(echo "$END - $START - 0.3" | bc):d=0.3" \
  -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k cut.mp4
```

## 2. Reframe Layouts

### A. Blur Layout (News, Broadcast, Esports standard)
Preserves 100% of broadcaster chyron, ticker, and scores without cropping:
- Center uncropped 16:9 feed (1080 × 607) at y ≈ 336.
- Background: 9:16 copy scaled, blurred (boxblur=20:5), and darkened.
- Lower 9:16 area reserved for subtitles and hook titlebar.

```bash
ffmpeg -i cut.mp4 -filter_complex "\
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5,eq=brightness=-0.15[bg];\
[0:v]scale=1080:608:force_original_aspect_ratio=decrease[fg];\
[bg][fg]overlay=(W-w)/2:336[v]" \
-map "[v]" -map 0:a -c:v libx264 -crf 18 -c:a copy reframed.mp4
```

### B. Dynamic Crop Layout (Podcasts, Solo Streamers, Just Chatting)
Follows speaker/face with smooth 12-frame box-filtered tracking:
```bash
ffmpeg -i cut.mp4 -vf "crop=ih*9/16:ih:x='<SMOOTHED_FACE_X>':y=0,scale=1080:1920" \
  -c:v libx264 -crf 18 reframed.mp4
```

### C. Stack Layout (Gaming, Reaction Streams)
Top panel: zoomed facecam. Bottom panel: main visual/gameplay.

### D. Landscape (16:9) Mode
For in-depth 2–10 minute news reports, debates, and press briefings:
Keeps native 1920 × 1080 widescreen, sharpens broadcast text, applies libass captions.

## 3. Burned Animated Subtitles (libass + HarfBuzz)
Word-by-word synchronized subtitles rendered via libass:
- 2–4 words per event.
- Bold typography (Inter, Anton, or Noto Sans for Indian/complex scripts).
- White fill, 4–6px dark outline, center-safe position at `y = 0.72 * H` (avoids TikTok/Reels UI icons).
- Full Unicode text shaping: Devanagari, Malayalam, Tamil, Telugu, Arabic, and Romanized transliteration.

```bash
ffmpeg -i reframed.mp4 -vf "subtitles=captions.ass:fontsdir=/path/to/fonts" \
  -c:v libx264 -crf 18 -c:a copy final_clip.mp4
```

## Rules
- Target duration: 20–59s for social bites, 2–10 min for news/debate stories. Reject clips < 8s.
- Always clamp crop coordinates so the viewport never leaves video bounds.
- Preserve source frame rate up to 60 fps; never interpolate duplicate frames.
