#!/usr/bin/env python3
"""
scripts/mix_audio.py — Audio mixer for FrameForge HTML renderer projects

Reads all FrameForge TTS outputs from audio/voice_*.m4a (in scene order),
concatenates them, applies -14 LUFS normalization, and writes out/audio_mix.m4a.

Optionally mixes in background music from audio/music.mp3 or audio/music.m4a
with sidechain ducking (same as FrameForge's AudioMixer).

Usage:
  uv run scripts/mix_audio.py
  uv run scripts/mix_audio.py --music audio/bgm.mp3
  uv run scripts/mix_audio.py --no-music
  python scripts/mix_audio.py  (standard python, no uv needed)

Requirements: FFmpeg in PATH.
"""

import sys
import os
import subprocess
import argparse
import glob
import json


def run(args, **kwargs):
    """Run a command, raise on non-zero exit."""
    result = subprocess.run(args, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        print(f"[mix_audio] ERROR: {' '.join(str(a) for a in args[:3])}\n{result.stderr[-300:]}", file=sys.stderr)
        sys.exit(1)
    return result


def find_voice_files(audio_dir):
    """Return voice_N.m4a files sorted numerically."""
    pattern = os.path.join(audio_dir, "voice_*.m4a")
    files = sorted(
        glob.glob(pattern),
        key=lambda f: int("".join(filter(str.isdigit, os.path.basename(f))) or "0"),
    )
    return files


def get_duration(path):
    """Get duration of a media file via ffprobe."""
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", path],
        capture_output=True, text=True,
    )
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def main():
    parser = argparse.ArgumentParser(description="Mix FrameForge TTS audio for HTML renderer")
    parser.add_argument("--music",    default=None,  help="Background music file (mp3/m4a)")
    parser.add_argument("--no-music", action="store_true", help="Skip music, voice only")
    parser.add_argument("--lufs",     default="-14", help="Target loudness (default: -14)")
    args = parser.parse_args()

    root      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    audio_dir = os.path.join(root, "audio")
    out_dir   = os.path.join(root, "out")
    os.makedirs(out_dir, exist_ok=True)

    # ── Find voice files ──────────────────────────────────────────────────────
    voice_files = find_voice_files(audio_dir)
    if not voice_files:
        print("[mix_audio] No voice_*.m4a files found in audio/. Copy FrameForge TTS outputs there.")
        sys.exit(1)
    print(f"[mix_audio] Found {len(voice_files)} voice file(s)")

    # ── Concatenate voices → raw_voice.m4a ───────────────────────────────────
    raw_voice = os.path.join(out_dir, "raw_voice.m4a")
    if len(voice_files) == 1:
        # No concat needed — just use directly
        import shutil
        shutil.copy(voice_files[0], raw_voice)
    else:
        concat_list = os.path.join(out_dir, "voice_concat.txt")
        with open(concat_list, "w") as f:
            for vf in voice_files:
                f.write(f"file '{os.path.abspath(vf)}'\n")
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", raw_voice])
        os.unlink(concat_list)
    print(f"[mix_audio] Concatenated voices → {raw_voice}")

    # ── Find music file ───────────────────────────────────────────────────────
    music_file = None
    if not args.no_music:
        if args.music:
            music_file = args.music
        else:
            # Auto-discover music in audio/ or root
            for candidate in [
                os.path.join(audio_dir, "music.mp3"),
                os.path.join(audio_dir, "music.m4a"),
                os.path.join(audio_dir, "bgm.mp3"),
                os.path.join(audio_dir, "bgm.m4a"),
                os.path.join(root, "music.mp3"),
            ]:
                if os.path.exists(candidate):
                    music_file = candidate
                    break

    out_mix = os.path.join(out_dir, "audio_mix.m4a")

    # ── Mix ───────────────────────────────────────────────────────────────────
    if music_file and os.path.exists(music_file):
        print(f"[mix_audio] Music: {music_file}")
        # Voice: compress + sidechain trigger
        # Music: highpass/lowpass + loop to full duration + sidechaincompress
        filter_complex = ";".join([
            "[0:a]acompressor=ratio=3:threshold=-20dB:attack=5:release=50[voice_comp]",
            "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,"
            "highpass=f=80,lowpass=f=8000,volume=0.15[music_filtered]",
            "[voice_comp][music_filtered]sidechaincompress=threshold=0.003:ratio=20:"
            "attack=0.2:release=1:makeup=2[mixed]",
            f"[mixed]loudnorm=I={args.lufs}:TP=-1:LRA=11[out]",
        ])
        run([
            "ffmpeg", "-y",
            "-i", raw_voice,
            "-stream_loop", "-1", "-i", music_file,
            "-filter_complex", filter_complex,
            "-map", "[out]",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            "-shortest",
            out_mix,
        ])
    else:
        if music_file:
            print(f"[mix_audio] WARNING: music file not found: {music_file}")
        print("[mix_audio] Voice only — applying loudnorm")
        run([
            "ffmpeg", "-y", "-i", raw_voice,
            "-af", f"loudnorm=I={args.lufs}:TP=-1:LRA=11",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            out_mix,
        ])

    # Cleanup raw
    if os.path.exists(raw_voice):
        os.unlink(raw_voice)

    dur = get_duration(out_mix)
    print(f"[mix_audio] ✅  {out_mix} ({dur:.1f}s)")


if __name__ == "__main__":
    main()
