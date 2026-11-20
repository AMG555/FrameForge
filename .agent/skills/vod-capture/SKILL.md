---
name: vod-capture
description: Capture a live moment or VOD range to disk. Use when a highlight needs saving from a stream, or when a VOD section must be pulled for editing. Triggers on "clip that", "grab the last 60s", "pull 2:14:00-2:14:40", "capture vod", "download stream section".
---

# VOD Capture

Save source media to incoming clip directory: `$CLIPS_ROOT/incoming/<clip_id>/source.<ext>` (or local path).

## Methods

### 1. Live capture (OBS Replay Buffer on local machine)
When running alongside OBS Studio with Replay Buffer enabled:
1. Send `SaveReplayBuffer` to OBS WebSocket (default `ws://localhost:4455` or `obs_command` tool).
2. Poll the configured OBS replay folder for the newly written video file (timeout: 10s).
3. Move file to target clip directory, record `captured_at` timestamp.

If OBS is unreachable, fall back to Twitch/YouTube clipping API.

### 2. VOD range download (YouTube, Twitch, Kick)
Download only the targeted seconds without downloading the full multi-hour stream:
```bash
yt-dlp --download-sections "*00:10:00-00:10:40" \
  -f "bv*[height<=1080][vcodec^=avc1]+ba/b" --merge-output-format mp4 \
  -o source.mp4 "<STREAM_URL>"
```

For live streams from the start:
```bash
yt-dlp --live-from-start --download-sections "*00:05:00-00:06:00" \
  -f "bv*+ba/b" --merge-output-format mp4 -o source.mp4 "<STREAM_URL>"
```

### 3. Live stream capture via pipe
For real-time stream segment capture:
```bash
streamlink --stdout "<STREAM_URL>" best | ffmpeg -i - -t 60 -c copy source.mp4
```

## Rules
- Never re-encode on initial download: stream copy only (`-c copy` or yt-dlp native muxing).
- Hard-fail if the captured file is under 3 seconds or has no audio stream (`ffprobe`).
- Return manifest record with metadata (`source_path`, `duration`, `start_pts`, `streamer`, `title`), never raw bytes.
