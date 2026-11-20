---
name: clip-validate
description: Gate and quality-check a clip before publishing. Use on every stream clip export. Triggers on "validate clip", "QA the clip", "is clip ready", "verify stream clip".
---

# Clip Validate

Automated multi-point quality gate for stream clips.

## 1. Hard Technical Asserts (Fail = Stop)
Run probe:
```bash
ffprobe -v error -show_streams -show_format -of json clip.mp4
```

Asserts:
- **Duration**: Valid range (8s to 600s based on target format).
- **Streams**: Exactly 1 video stream and 1 audio stream.
- **Resolution**:
  - Portrait mode: `width == 1080` and `height == 1920`.
  - Landscape mode: `width == 1920` and `height == 1080`.
- **Frame Rate**: Between 24 and 60 fps.
- **Audio Integrity**:
  - `volumedetect`: `mean_volume > -35 dB` and `max_volume > -12 dB` (catches muted or silent clips).
  - Integrated loudness within ±2 LUFS of -14 LUFS (`ebur128`).

## 2. Visual & Text Quality Checks
Sample 4 test frames (at 0.5s, 25%, 50%, 75% of clip duration):
```bash
ffmpeg -v error -ss $T -i clip.mp4 -vframes 1 -q:v 2 checks/frame_$N.jpg
```

Checks:
- **No Black Frames**: Mean frame luminance > 8.0 (avoids cut transitions frozen on black).
- **Legibility**: Subtitle text and title bar are within safe margins (not cropped by vertical phone bezels).
- **Subject Framing**: Speaker face or central action is positioned inside visible boundaries.

## 3. Output Format
Returns structured validation JSON:
```json
{
  "pass": true,
  "hard_asserts": {
    "duration_ok": true,
    "streams_ok": true,
    "dimensions_ok": true,
    "audio_level_ok": true
  },
  "metrics": {
    "duration_sec": 42.5,
    "mean_volume_db": -18.2,
    "max_volume_db": -0.8,
    "resolution": "1080x1920",
    "fps": 30.0
  },
  "soft_checks": {
    "black_frames": 0,
    "subtitles_detected": true
  },
  "retry_hint": null
}
```

## Rules
- If any hard assert fails, halt pipeline and log exact failure reason.
- Never publish a clip that fails audio volume or black frame checks.
