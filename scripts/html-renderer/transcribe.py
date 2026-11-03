#!/usr/bin/env python3
"""
transcribe.py — Generate a Whisper-format caption outline from FrameForge TTS audio.

Reads all voice_*.m4a (or voice_*.mp3) files from the project's audio/ directory,
transcribes each with OpenAI Whisper (if installed) or falls back to silence-based
segmentation via ffmpeg, and writes audio/outline.txt.

audio/outline.txt format (tab-separated, one word-group per line):
  <start_seconds>\t<end_seconds>\t<text>

This file is consumed by captions() in reel/engine.js:
  captions('audio/outline.txt');

Usage:
  # From inside a scaffolded html-renderer project:
  uv run scripts/transcribe.py

  # Or with an explicit audio directory:
  uv run scripts/transcribe.py --audio-dir /path/to/audio/

  # Or without uv (python ≥ 3.9 required):
  python scripts/transcribe.py

Requirements (Whisper path — highest quality):
  pip install openai-whisper
  # or: uv add openai-whisper

Requirements (ffmpeg fallback — no ML dependency):
  ffmpeg must be on PATH

Environment:
  WHISPER_MODEL   Model size: tiny | base | small | medium | large (default: base)
  AUDIO_DIR       Override audio directory (default: audio/)
  OUTLINE_PATH    Override output path (default: audio/outline.txt)
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


# ── Configuration ──────────────────────────────────────────────────────────────

DEFAULT_AUDIO_DIR  = "audio"
DEFAULT_OUTLINE    = "audio/outline.txt"
WHISPER_MODEL      = os.environ.get("WHISPER_MODEL", "base")
WORDS_PER_GROUP    = 6    # words per caption line (for ffmpeg fallback)
SILENCE_THRESHOLD  = -35  # dB (for ffmpeg silence detection fallback)
SILENCE_DURATION   = 0.3  # seconds


# ── Helpers ────────────────────────────────────────────────────────────────────

def find_audio_files(audio_dir: Path) -> list[Path]:
    """Return all voice_*.m4a / voice_*.mp3 files sorted by scene index."""
    files = sorted(
        [p for p in audio_dir.iterdir() if re.match(r"voice_\d+\.(m4a|mp3)", p.name)],
        key=lambda p: int(re.search(r"voice_(\d+)", p.name).group(1)),
    )
    if not files:
        # Also accept any .m4a/.mp3 in the directory
        files = sorted(
            [p for p in audio_dir.iterdir() if p.suffix in (".m4a", ".mp3")],
            key=lambda p: p.name,
        )
    return files


def get_audio_duration(path: Path) -> float:
    """Return duration in seconds using ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", str(path)],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        return 5.0  # fallback estimate
    data = json.loads(result.stdout)
    for stream in data.get("streams", []):
        if "duration" in stream:
            return float(stream["duration"])
    return 5.0


def convert_to_wav(src: Path, dst: Path) -> None:
    """Convert audio to 16kHz mono WAV for Whisper."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-ar", "16000", "-ac", "1", str(dst)],
        capture_output=True, check=True, timeout=120,
    )


# ── Whisper transcription ──────────────────────────────────────────────────────

def transcribe_whisper(audio_file: Path, time_offset: float) -> list[tuple[float, float, str]]:
    """
    Transcribe one audio file with Whisper.
    Returns list of (start, end, text) tuples with absolute timestamps.
    """
    import whisper  # type: ignore

    model = whisper.load_model(WHISPER_MODEL)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = Path(tmp.name)

    try:
        convert_to_wav(audio_file, wav_path)
        result = model.transcribe(str(wav_path), word_timestamps=True, language=None)
    finally:
        wav_path.unlink(missing_ok=True)

    segments = []
    for seg in result.get("segments", []):
        start = seg["start"] + time_offset
        end   = seg["end"]   + time_offset
        text  = seg["text"].strip()
        if text:
            segments.append((start, end, text))

    return segments


# ── FFmpeg silence-based fallback ──────────────────────────────────────────────

def transcribe_ffmpeg_fallback(audio_file: Path, time_offset: float, narration: str | None = None) -> list[tuple[float, float, str]]:
    """
    Fallback when Whisper is not installed.
    Uses ffmpeg silence detection to estimate word timings, then distributes
    the narration text evenly across the detected speech segments.
    Falls back to even word distribution if narration is unavailable.
    """
    duration = get_audio_duration(audio_file)

    # Detect silence boundaries
    result = subprocess.run(
        [
            "ffmpeg", "-i", str(audio_file),
            "-af", f"silencedetect=noise={SILENCE_THRESHOLD}dB:d={SILENCE_DURATION}",
            "-f", "null", "-",
        ],
        capture_output=True, text=True, timeout=60,
    )
    stderr = result.stderr

    # Parse silence_start / silence_end pairs
    starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", stderr)]
    ends   = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", stderr)]

    # Build speech segments from silence gaps
    speech_segments: list[tuple[float, float]] = []
    cursor = 0.0
    for s, e in zip(starts, ends):
        if s > cursor + 0.1:
            speech_segments.append((cursor, s))
        cursor = e
    if cursor < duration - 0.1:
        speech_segments.append((cursor, duration))

    if not speech_segments:
        speech_segments = [(0.0, duration)]

    # Distribute narration text across speech segments
    words = (narration or "").split() if narration else []
    if not words:
        # No narration — emit one entry per speech segment with placeholder
        return [
            (seg[0] + time_offset, seg[1] + time_offset, f"[scene {i+1}]")
            for i, seg in enumerate(speech_segments)
        ]

    total_seg_dur = sum(e - s for s, e in speech_segments)
    captions: list[tuple[float, float, str]] = []
    word_idx = 0

    for seg_start, seg_end in speech_segments:
        seg_dur = seg_end - seg_start
        seg_word_count = max(1, round(len(words) * (seg_dur / total_seg_dur)))
        seg_words = words[word_idx : word_idx + seg_word_count]
        word_idx += seg_word_count

        # Split segment words into groups of WORDS_PER_GROUP
        for i in range(0, len(seg_words), WORDS_PER_GROUP):
            group = seg_words[i : i + WORDS_PER_GROUP]
            frac_start = i / len(seg_words)
            frac_end   = min(1.0, (i + WORDS_PER_GROUP) / len(seg_words))
            t_start = seg_start + frac_start * seg_dur + time_offset
            t_end   = seg_start + frac_end   * seg_dur + time_offset
            captions.append((t_start, t_end, " ".join(group)))

    # Append any remaining words to the last segment
    if word_idx < len(words):
        last = captions[-1] if captions else (time_offset, time_offset + duration, "")
        captions.append((last[1], last[1] + 1.0, " ".join(words[word_idx:])))

    return captions


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate caption outline from FrameForge TTS audio.")
    parser.add_argument("--audio-dir",  default=os.environ.get("AUDIO_DIR", DEFAULT_AUDIO_DIR),
                        help="Directory containing voice_*.m4a files (default: audio/)")
    parser.add_argument("--outline",    default=os.environ.get("OUTLINE_PATH", DEFAULT_OUTLINE),
                        help="Output path for outline.txt (default: audio/outline.txt)")
    parser.add_argument("--script",     default=None,
                        help="Optional: path to FrameForge script JSON for narration text (improves ffmpeg fallback)")
    parser.add_argument("--no-whisper", action="store_true",
                        help="Force ffmpeg fallback even if Whisper is installed")
    args = parser.parse_args()

    audio_dir   = Path(args.audio_dir)
    outline_path = Path(args.outline)

    if not audio_dir.exists():
        print(f"[transcribe] ERROR: audio directory not found: {audio_dir}", file=sys.stderr)
        print(f"  Copy FrameForge TTS outputs (voice_0.m4a, voice_1.m4a …) into {audio_dir}/", file=sys.stderr)
        sys.exit(1)

    audio_files = find_audio_files(audio_dir)
    if not audio_files:
        print(f"[transcribe] ERROR: no voice_*.m4a or voice_*.mp3 files found in {audio_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"[transcribe] Found {len(audio_files)} audio file(s) in {audio_dir}")

    # Load narration text from script JSON if provided (for ffmpeg fallback)
    narrations: list[str | None] = [None] * len(audio_files)
    if args.script:
        try:
            raw = json.loads(Path(args.script).read_text())
            script = raw.get("script", raw)
            scenes = script.get("scenes", [])
            for i, scene in enumerate(scenes):
                if i < len(narrations):
                    narrations[i] = scene.get("narration")
            print(f"[transcribe] Loaded {len(scenes)} narration(s) from {args.script}")
        except Exception as exc:
            print(f"[transcribe] WARNING: could not load script JSON: {exc}", file=sys.stderr)

    # Choose transcription backend
    use_whisper = False
    if not args.no_whisper:
        try:
            import whisper  # type: ignore  # noqa: F401
            use_whisper = True
            print(f"[transcribe] Using Whisper model '{WHISPER_MODEL}'")
        except ImportError:
            print("[transcribe] Whisper not installed — using ffmpeg silence-detection fallback.")
            print("             Install for better accuracy: pip install openai-whisper")

    # Transcribe each file and accumulate captions with absolute timestamps
    all_captions: list[tuple[float, float, str]] = []
    time_offset = 0.0

    for i, audio_file in enumerate(audio_files):
        print(f"[transcribe]   {audio_file.name} …", end=" ", flush=True)
        try:
            if use_whisper:
                segments = transcribe_whisper(audio_file, time_offset)
            else:
                segments = transcribe_ffmpeg_fallback(audio_file, time_offset, narrations[i])
            all_captions.extend(segments)
            duration = get_audio_duration(audio_file)
            time_offset += duration
            print(f"{len(segments)} segment(s), duration {duration:.1f}s")
        except Exception as exc:
            duration = get_audio_duration(audio_file)
            time_offset += duration
            print(f"ERROR: {exc}", file=sys.stderr)

    if not all_captions:
        print("[transcribe] ERROR: no captions generated.", file=sys.stderr)
        sys.exit(1)

    # Write outline.txt
    outline_path.parent.mkdir(parents=True, exist_ok=True)
    with open(outline_path, "w", encoding="utf-8") as fh:
        for start, end, text in all_captions:
            fh.write(f"{start:.3f}\t{end:.3f}\t{text}\n")

    print(f"[transcribe] Written {len(all_captions)} caption(s) → {outline_path}")
    print(f"[transcribe] Total duration: {time_offset:.1f}s")
    print(f"[transcribe] Use in edit.js:  captions('{outline_path}')")


if __name__ == "__main__":
    main()
