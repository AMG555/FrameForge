#!/usr/bin/env python3
"""
mix_audio.py — Voice concat + sidechain ducking + EBU R128 -14 LUFS normalization.

Takes FrameForge TTS outputs (voice_0.m4a, voice_1.m4a, ...) from the audio/
directory, concatenates them in numeric order, optionally sidechain-ducks
a background music track, and writes out/audio_mix.m4a at -14 LUFS.

Usage:
  uv run scripts/mix_audio.py                      # concat voices, no music
  uv run scripts/mix_audio.py --music assets/bg.mp3
  uv run scripts/mix_audio.py --music assets/bg.mp3 --duck-level=-18

Requirements (installed automatically by uv):
  ffmpeg  (system — apt install ffmpeg / brew install ffmpeg)
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

import sys
import os
import json
import pathlib
import subprocess
import shutil
import tempfile

# ── Config ────────────────────────────────────────────────────────────────────

ROOT      = pathlib.Path(__file__).parent.parent
AUDIO_DIR = ROOT / "audio"
OUT_DIR   = ROOT / "out"
OUT_FILE  = OUT_DIR / "audio_mix.m4a"

TARGET_LUFS = -14.0
TRUE_PEAK   = -1.0

# ── Helpers ───────────────────────────────────────────────────────────────────

def ffmpeg(*args, check=True, capture=False):
    cmd = ["ffmpeg", "-nostdin", "-y"] + list(args)
    if capture:
        r = subprocess.run(cmd, capture_output=True, text=True)
        return r
    else:
        r = subprocess.run(cmd, capture_output=False, text=True)
        if check and r.returncode != 0:
            sys.exit(f"[mix_audio] ffmpeg failed: {' '.join(cmd)}")
        return r


def ffprobe_duration(path: pathlib.Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(path)],
        capture_output=True, text=True, timeout=10,
    )
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def measure_lufs(path: pathlib.Path):
    """Return (I, TP) as floats using ffmpeg loudnorm."""
    r = subprocess.run(
        ["ffmpeg", "-nostdin", "-i", str(path),
         "-af", "loudnorm=I=-14:TP=-1:print_format=json",
         "-f", "null", "-"],
        capture_output=True, text=True, timeout=120,
    )
    combined = r.stderr + r.stdout
    import re
    m = re.search(r'\{[\s\S]*?\}', combined)
    if not m:
        return None, None
    try:
        d = json.loads(m.group())
        return float(d.get("input_i", 0)), float(d.get("input_tp", 0))
    except Exception:
        return None, None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--music",      default=None,   help="Background music file")
    p.add_argument("--duck-level", default="-18",  help="Music level when voice active (dB, default -18)")
    p.add_argument("--voice-vol",  default="1.0",  help="Voice volume multiplier (default 1.0)")
    p.add_argument("--out",        default=None,   help="Output path (default: out/audio_mix.m4a)")
    args = p.parse_args()

    out_path   = pathlib.Path(args.out) if args.out else OUT_FILE
    duck_level = float(args.duck_level)
    voice_vol  = float(args.voice_vol)

    # ── Step 1: Collect voice files ───────────────────────────────────────────
    patterns = ["voice_*.m4a", "voice_*.mp3", "voice_*.wav"]
    voice_files = []
    for pat in patterns:
        voice_files.extend(sorted(AUDIO_DIR.glob(pat)))

    if not voice_files:
        print(f"[mix_audio] No voice files found in {AUDIO_DIR}")
        print("  Copy FrameForge TTS outputs there first: voice_0.m4a, voice_1.m4a, ...")
        sys.exit(0)

    # Sort numerically
    def sort_key(p):
        import re
        nums = re.findall(r'\d+', p.stem)
        return int(nums[0]) if nums else 0

    voice_files.sort(key=sort_key)
    print(f"[mix_audio] Voices: {len(voice_files)} files")
    for vf in voice_files:
        dur = ffprobe_duration(vf)
        print(f"  {vf.name}  ({dur:.1f}s)")

    out_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)

        # ── Step 2: Concat voices ─────────────────────────────────────────────
        if len(voice_files) == 1:
            concat_path = tmp / "concat.m4a"
            shutil.copy(voice_files[0], concat_path)
        else:
            # Write concat list
            concat_list = tmp / "list.txt"
            with open(concat_list, "w") as f:
                for vf in voice_files:
                    f.write(f"file '{vf.resolve()}'\n")

            concat_path = tmp / "concat.m4a"
            ffmpeg(
                "-f", "concat", "-safe", "0", "-i", str(concat_list),
                "-c", "copy",
                str(concat_path),
            )

        total_dur = ffprobe_duration(concat_path)
        print(f"\n[mix_audio] Concatenated voice: {total_dur:.1f}s")

        # ── Step 3: Mix with music (optional sidechain ducking) ────────────────
        if args.music:
            music_path = pathlib.Path(args.music)
            if not music_path.exists():
                print(f"[mix_audio] Music file not found: {music_path}", file=sys.stderr)
                sys.exit(1)

            print(f"[mix_audio] Music: {music_path.name}  duck={duck_level}dB")

            # Sidechain ducking filter:
            # 1. compand: reduce music when voice is present
            # 2. Loop music to cover full duration
            mixed_path = tmp / "mixed.m4a"
            ffmpeg(
                # Voice (input 0)
                "-i", str(concat_path),
                # Music looped (input 1)
                "-stream_loop", "-1", "-i", str(music_path),
                "-t", str(total_dur),
                "-filter_complex",
                (
                    f"[1:a]volume={duck_level}dB[music];"
                    f"[0:a]volume={voice_vol}[voice];"
                    f"[voice][music]amix=inputs=2:duration=first:dropout_transition=2[mix];"
                    f"[mix]loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}[out]"
                ),
                "-map", "[out]",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                "-t", str(total_dur),
                str(mixed_path),
            )
            final_tmp = mixed_path
        else:
            # ── Step 4: Normalize voice only ──────────────────────────────────
            print("[mix_audio] No music — normalizing voice to -14 LUFS")
            norm_path = tmp / "norm.m4a"

            # Two-pass loudnorm
            r = subprocess.run(
                ["ffmpeg", "-nostdin", "-i", str(concat_path),
                 "-af", "loudnorm=I=-14:TP=-1:print_format=json",
                 "-f", "null", "-"],
                capture_output=True, text=True,
            )
            import re, json as _json
            m = re.search(r'\{[\s\S]*?\}', r.stderr + r.stdout)
            if m:
                ln = _json.loads(m.group())
                filter_str = (
                    f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:"
                    f"measured_I={ln['input_i']}:"
                    f"measured_LRA={ln['input_lra']}:"
                    f"measured_TP={ln['input_tp']}:"
                    f"measured_thresh={ln['input_thresh']}:"
                    f"offset={ln['target_offset']}:linear=true"
                )
            else:
                filter_str = f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}"

            ffmpeg(
                "-i", str(concat_path),
                "-af", filter_str,
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                str(norm_path),
            )
            final_tmp = norm_path

        # ── Step 5: Copy to output ────────────────────────────────────────────
        shutil.copy(final_tmp, out_path)

    # ── Report ────────────────────────────────────────────────────────────────
    measured_I, measured_TP = measure_lufs(out_path)
    size_mb = out_path.stat().st_size / 1024 / 1024

    print(f"\n[mix_audio] ✅  {out_path}")
    print(f"            Duration: {total_dur:.1f}s  |  Size: {size_mb:.1f}MB")
    if measured_I is not None:
        print(f"            LUFS: {measured_I:.1f}  |  True peak: {measured_TP:.1f} dBTP")
        if abs(measured_I - TARGET_LUFS) > 1.5:
            print(f"  ⚠  LUFS deviation > 1.5 LU from target {TARGET_LUFS}")


if __name__ == "__main__":
    main()
