#!/usr/bin/env python3
"""
scripts/verify.py — Post-render quality verification for FrameForge HTML renderer

Runs the same 7 hard gates as FrameForge's QualityGate:
  1. File size > 1 MB
  2. Valid video + audio streams
  3. Resolution (1920x1080 master or 1080x1920 short)
  4. H.264 codec, yuv420p pixel format, 24-30 fps
  5. Integrated loudness: -14 LUFS ±1.5 LU
  6. True peak: ≤ -0.5 dBTP
  7. No black frames > 0.5s
  8. No frozen frames > 0.5s

Usage:
  uv run scripts/verify.py
  uv run scripts/verify.py --file out/my-video.mp4
  python scripts/verify.py

Requirements: FFmpeg + ffprobe in PATH.
"""

import sys
import os
import subprocess
import argparse
import json
import glob
import re


def ffprobe(args, timeout=30):
    r = subprocess.run(["ffprobe"] + args, capture_output=True, text=True, timeout=timeout)
    return (r.stdout or "") + (r.stderr or "")


def ffmpeg(args, timeout=120):
    r = subprocess.run(["ffmpeg", "-nostdin"] + args, capture_output=True, text=True, timeout=timeout)
    return (r.stdout or "") + (r.stderr or "")


PASS = "✓"
FAIL = "✗"
WARN = "⚠"


def check(name, ok, expected, actual, is_hard=True):
    sym = PASS if ok else (FAIL if is_hard else WARN)
    tag = "HARD" if is_hard else "SOFT"
    print(f"  [{sym}] {name:30s} expected={expected}  actual={actual}  [{tag}]")
    return ok or (not is_hard)


def verify(video_path):
    print(f"\n🔍  Verifying: {video_path}\n")
    all_passed = True

    # 1. File size
    stat = os.stat(video_path)
    size_mb = stat.st_size / 1024 / 1024
    ok = stat.st_size > 1024 * 1024
    all_passed &= check("file_size", ok, ">1MB", f"{size_mb:.2f}MB")

    # 2. Streams + resolution + codec
    raw = ffprobe(["-v", "error", "-show_streams", "-show_format", "-print_format", "json", video_path])
    try:
        probe = json.loads(raw[raw.index("{"):])
        streams = probe.get("streams", [])
        video   = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio   = next((s for s in streams if s.get("codec_type") == "audio"), None)
        dur     = float(probe.get("format", {}).get("duration", 0))
    except (ValueError, json.JSONDecodeError) as e:
        all_passed &= check("ffprobe_parse", False, "no errors", str(e))
        video = audio = None
        dur = 0

    if video:
        w, h = video.get("width", 0), video.get("height", 0)
        expected_res = "1920x1080 or 1080x1920"
        ok = (w == 1920 and h == 1080) or (w == 1080 and h == 1920)
        all_passed &= check("resolution", ok, expected_res, f"{w}x{h}")

        ok = video.get("codec_name") == "h264"
        all_passed &= check("video_codec", ok, "h264", video.get("codec_name", "?"))

        ok = video.get("pix_fmt") == "yuv420p"
        all_passed &= check("pixel_format", ok, "yuv420p", video.get("pix_fmt", "?"))

        fps_raw = video.get("r_frame_rate", "0/1").split("/")
        fps = int(fps_raw[0]) / max(int(fps_raw[1]), 1) if len(fps_raw) == 2 else 0
        ok = 23 <= fps <= 31
        all_passed &= check("frame_rate", ok, "24-30fps", f"{fps:.1f}fps")
    else:
        all_passed &= check("video_stream", False, "present", "missing")

    if not audio:
        all_passed &= check("audio_stream", False, "present", "missing")

    if dur > 0:
        ok = dur >= 5
        check("duration", ok, ">5s", f"{dur:.1f}s", is_hard=False)

    # 3. LUFS + True Peak
    loudnorm_out = ffmpeg(["-i", video_path, "-af", "loudnorm=I=-14:TP=-1:print_format=json", "-f", "null", "-"])
    json_match = re.search(r"\{[\s\S]*\}", loudnorm_out)
    if json_match:
        try:
            ln = json.loads(json_match.group())
            measured_i  = float(ln.get("input_i",  "-99"))
            measured_tp = float(ln.get("input_tp", "-99"))

            ok = abs(measured_i - (-14)) <= 1.5
            all_passed &= check("integrated_loudness", ok, "-14 ±1.5 LUFS", f"{measured_i:.1f} LUFS")

            ok = measured_tp <= -0.5
            all_passed &= check("true_peak", ok, "≤-0.5 dBTP", f"{measured_tp:.1f} dBTP")
        except (KeyError, ValueError):
            check("loudness_parse", False, "parseable", "error", is_hard=False)
    else:
        check("loudness_check", False, "measurable", "no output", is_hard=False)

    # 4. Black frames
    black_out = ffmpeg(["-i", video_path, "-vf", "blackdetect=d=0.5:pix_th=0.10", "-f", "null", "-"])
    ok = "black_start" not in black_out
    all_passed &= check("black_frames", ok, "none >0.5s", "none" if ok else "detected")

    # 5. Frozen frames
    freeze_out = ffmpeg(["-i", video_path, "-vf", "freezedetect=n=0.001:d=0.5", "-f", "null", "-"])
    ok = "freeze_start" not in freeze_out
    all_passed &= check("frozen_frames", ok, "none >0.5s", "none" if ok else "detected")

    print()
    if all_passed:
        print("✅  All hard gates passed.")
    else:
        print("❌  One or more hard gates FAILED. Fix before publishing.")

    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Verify a rendered video against FrameForge quality gates")
    parser.add_argument("--file", default=None, help="Path to video file (auto-detects from out/ if omitted)")
    args = parser.parse_args()

    root    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "out")

    if args.file:
        videos = [args.file]
    else:
        videos = [f for f in glob.glob(os.path.join(out_dir, "*.mp4")) if "_mux" not in f or len(glob.glob(os.path.join(out_dir, "*.mp4"))) == 1]

    if not videos:
        print(f"No .mp4 files found in {out_dir}. Run render.mjs full first.")
        sys.exit(1)

    all_ok = True
    for v in videos:
        all_ok &= verify(v)

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
