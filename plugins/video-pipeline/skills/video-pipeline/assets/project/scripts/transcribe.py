#!/usr/bin/env python3
"""
scripts/transcribe.py — Whisper caption outline generator for FrameForge HTML renderer

Transcribes an audio file (FrameForge TTS output or your own recording) using
OpenAI Whisper (local, free) and writes a word-level timing outline in the format
expected by reel/engine.js captions():

    start_ms  TAB  end_ms  TAB  word

One word per line. Lines are tab-separated.

Usage:
  uv run scripts/transcribe.py                         # auto-discovers audio/voice_*.m4a
  uv run scripts/transcribe.py --audio audio/narration.m4a
  uv run scripts/transcribe.py --audio out/audio_mix.m4a --out audio/outline.txt
  uv run scripts/transcribe.py --model large-v3        # higher accuracy (slower)
  uv run scripts/transcribe.py --lang en               # force language
  python scripts/transcribe.py                         # standard python (no uv)

Requirements:
  pip install openai-whisper  (or: uv add openai-whisper)
  ffmpeg in PATH (used by Whisper for audio decoding)

Output:
  audio/outline.txt  (default) — load in edit.js with: captions('audio/outline.txt')
"""

import sys
import os
import argparse
import glob
import json


def find_audio(audio_dir):
    """Find the best audio source: audio_mix.m4a first, then voice_*.m4a files."""
    mix = os.path.join(audio_dir, "audio_mix.m4a")
    if os.path.exists(mix):
        return mix
    # Fall back to concatenated voices — pick the first one
    voice_files = sorted(
        glob.glob(os.path.join(audio_dir, "voice_*.m4a")),
        key=lambda f: int("".join(filter(str.isdigit, os.path.basename(f))) or "0"),
    )
    return voice_files[0] if voice_files else None


def transcribe(audio_path, model_name="base", language=None):
    """Run Whisper on the audio file. Returns list of word-level segments."""
    try:
        import whisper
    except ImportError:
        print(
            "[transcribe] ERROR: openai-whisper not installed.\n"
            "  Install with: pip install openai-whisper\n"
            "  Or with uv:   uv add openai-whisper",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"[transcribe] Loading Whisper model '{model_name}'…")
    model = whisper.load_model(model_name)

    opts = {"word_timestamps": True, "verbose": False}
    if language:
        opts["language"] = language

    print(f"[transcribe] Transcribing: {audio_path}")
    result = model.transcribe(audio_path, **opts)
    return result


def extract_word_timings(result):
    """
    Extract (start_ms, end_ms, word) tuples from a Whisper result.
    Handles both segment-level and word-level timestamps.
    """
    timings = []
    for segment in result.get("segments", []):
        words = segment.get("words", [])
        if words:
            # Word-level timestamps available (word_timestamps=True)
            for w in words:
                word  = w.get("word", "").strip()
                start = int(w.get("start", 0) * 1000)
                end   = int(w.get("end",   0) * 1000)
                if word:
                    timings.append((start, end, word))
        else:
            # Fall back to segment-level: distribute words evenly over the segment
            text  = segment.get("text", "").strip()
            words = text.split()
            if not words:
                continue
            seg_start = int(segment.get("start", 0) * 1000)
            seg_end   = int(segment.get("end",   0) * 1000)
            dur_per   = max(1, (seg_end - seg_start) // len(words))
            for i, word in enumerate(words):
                ws = seg_start + i * dur_per
                we = min(seg_end, ws + dur_per)
                timings.append((ws, we, word))
    return timings


def write_outline(timings, output_path):
    """Write word-timing outline in the format engine.js loadCaptionData() expects."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for start_ms, end_ms, word in timings:
            f.write(f"{start_ms}\t{end_ms}\t{word}\n")
    print(f"[transcribe] ✅  Outline written: {output_path} ({len(timings)} words)")


def main():
    parser = argparse.ArgumentParser(
        description="Generate word-level caption outline from audio using Whisper"
    )
    parser.add_argument("--audio",  default=None,   help="Audio file to transcribe (auto-discovers if omitted)")
    parser.add_argument("--out",    default=None,   help="Output .txt file path (default: audio/outline.txt)")
    parser.add_argument("--model",  default="base", help="Whisper model: tiny, base, small, medium, large, large-v3 (default: base)")
    parser.add_argument("--lang",   default=None,   help="Force language code, e.g. 'en', 'es', 'fr' (auto-detect if omitted)")
    parser.add_argument("--json",   action="store_true", help="Also write a full JSON transcript alongside the outline")
    args = parser.parse_args()

    root      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    audio_dir = os.path.join(root, "audio")
    out_dir   = os.path.join(root, "audio")

    # ── Resolve audio source ──────────────────────────────────────────────────
    audio_path = args.audio
    if not audio_path:
        audio_path = find_audio(audio_dir)
    if not audio_path or not os.path.exists(audio_path):
        print(
            f"[transcribe] No audio file found. Options:\n"
            f"  1. Copy FrameForge TTS outputs to audio/ (voice_0.m4a, voice_1.m4a, …)\n"
            f"  2. Run scripts/mix_audio.py first to create out/audio_mix.m4a\n"
            f"  3. Pass --audio <path>",
            file=sys.stderr,
        )
        sys.exit(1)

    out_path = args.out or os.path.join(out_dir, "outline.txt")

    # ── Transcribe ────────────────────────────────────────────────────────────
    result  = transcribe(audio_path, model_name=args.model, language=args.lang)
    timings = extract_word_timings(result)

    if not timings:
        print("[transcribe] WARNING: no word timings extracted. Try --model small or --model base.", file=sys.stderr)

    write_outline(timings, out_path)

    # ── Optional full JSON transcript ──────────────────────────────────────────
    if args.json:
        json_path = out_path.replace(".txt", ".json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"[transcribe] Full transcript JSON: {json_path}")

    # ── Print edit.js usage hint ──────────────────────────────────────────────
    rel_out = os.path.relpath(out_path, root)
    print(f"\n[transcribe] Add to edit.js:\n  captions('{rel_out}');\n")


if __name__ == "__main__":
    main()
