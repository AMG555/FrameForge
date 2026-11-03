#!/usr/bin/env python3
"""
transcribe.py — Word-level caption outline generator for FrameForge HTML renderer.

Uses openai-whisper (free, local) to transcribe TTS audio files and write
a word-level outline.txt that engine.js captions() reads at render time.

Usage:
  uv run scripts/transcribe.py                     # transcribe audio/voice_*.m4a
  uv run scripts/transcribe.py audio/custom.mp3    # single file

Output:
  audio/outline.txt   — NDJSON, one segment per line:
      {"start": 0.0, "end": 0.5, "text": "Hello"}

Requirements (installed automatically by uv):
  openai-whisper  (local inference, no API key)
  ffmpeg          (system — apt install ffmpeg / brew install ffmpeg)
"""
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "openai-whisper>=20231117",
#   "numpy<2.0",
# ]
# ///

import sys
import json
import os
import glob
import pathlib

# ── Config ────────────────────────────────────────────────────────────────────

AUDIO_DIR   = pathlib.Path(__file__).parent.parent / "audio"
MODEL_SIZE  = os.environ.get("WHISPER_MODEL", "base")   # tiny/base/small/medium
LANGUAGE    = os.environ.get("WHISPER_LANG", "en")
OUTLINE_OUT = AUDIO_DIR / "outline.txt"

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_whisper():
    try:
        import whisper
        return whisper
    except ImportError:
        print("[transcribe] Installing openai-whisper...", flush=True)
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai-whisper", "numpy<2.0"])
        import whisper
        return whisper


def transcribe_file(model, audio_path: pathlib.Path, time_offset: float = 0.0):
    """
    Transcribe a single audio file. Returns list of segment dicts:
    [{"start": float, "end": float, "text": str}, ...]
    """
    result = model.transcribe(
        str(audio_path),
        language=LANGUAGE,
        word_timestamps=True,
        fp16=False,
    )

    segments = []
    for seg in result.get("segments", []):
        # Word-level if available
        words = seg.get("words", [])
        if words:
            for w in words:
                segments.append({
                    "start": round(time_offset + w["start"], 3),
                    "end":   round(time_offset + w["end"],   3),
                    "text":  w["word"].strip(),
                })
        else:
            # Fall back to segment-level
            segments.append({
                "start": round(time_offset + seg["start"], 3),
                "end":   round(time_offset + seg["end"],   3),
                "text":  seg["text"].strip(),
            })

    return segments


def get_audio_duration(path: pathlib.Path) -> float:
    """Return duration of an audio file in seconds using ffprobe."""
    import subprocess
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=nk=1:nw=1",
            str(path),
        ],
        capture_output=True, text=True, timeout=10,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # Collect audio files to transcribe
    if len(sys.argv) > 1:
        audio_files = [pathlib.Path(p) for p in sys.argv[1:]]
    else:
        # Auto-discover TTS outputs: voice_0.m4a, voice_1.m4a, ... or any audio
        patterns = ["voice_*.m4a", "voice_*.mp3", "*.m4a", "*.mp3", "*.wav"]
        audio_files = []
        for pat in patterns:
            found = sorted(AUDIO_DIR.glob(pat))
            audio_files.extend(f for f in found if f not in audio_files)
        # Deduplicate while preserving order
        seen = set()
        audio_files = [f for f in audio_files if not (f in seen or seen.add(f))]

    if not audio_files:
        print(f"[transcribe] No audio files found in {AUDIO_DIR}")
        print("  Place TTS outputs there first (voice_0.m4a, voice_1.m4a, …)")
        sys.exit(0)

    print(f"[transcribe] model={MODEL_SIZE}  files={len(audio_files)}", flush=True)

    whisper = load_whisper()
    model   = whisper.load_model(MODEL_SIZE)

    all_segments = []
    time_offset  = 0.0

    for audio_path in audio_files:
        if not audio_path.exists():
            print(f"  ⚠  Not found: {audio_path}", flush=True)
            continue

        print(f"  → {audio_path.name}", end="  ", flush=True)
        segs = transcribe_file(model, audio_path, time_offset)
        dur  = get_audio_duration(audio_path)
        time_offset += dur
        all_segments.extend(segs)
        print(f"{len(segs)} words  ({dur:.1f}s)", flush=True)

    if not all_segments:
        print("[transcribe] No segments produced.", flush=True)
        sys.exit(1)

    # Write NDJSON outline
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTLINE_OUT, "w", encoding="utf-8") as f:
        for seg in all_segments:
            f.write(json.dumps(seg, ensure_ascii=False) + "\n")

    print(f"\n[transcribe] ✅  {len(all_segments)} segments → {OUTLINE_OUT}")
    print(f"             Total duration: {time_offset:.1f}s")
    print(f"\nLoad in edit.js:")
    print(f"  captions('audio/outline.txt');")


if __name__ == "__main__":
    main()
