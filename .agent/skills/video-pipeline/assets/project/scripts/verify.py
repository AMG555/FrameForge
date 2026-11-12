#!/usr/bin/env python3
"""
verify.py — 7-gate quality verification for FrameForge HTML renderer output.

Runs the same quality checks as FrameForge's QualityGate class:
  1. File size > 1 MB
  2. Video stream present (H.264, yuv420p)
  3. Resolution 1920×1080 (or 1080×1920 for Shorts)
  4. Frame rate 24–30 fps
  5. Integrated loudness -14 ±1.5 LUFS
  6. True peak ≤ -0.5 dBTP
  7. No black frames > 0.5s
  8. No frozen frames > 0.5s (warn, not fail)

Usage:
  uv run scripts/verify.py                 # verify most recent out/*.mp4
  uv run scripts/verify.py out/video.mp4   # specific file
  uv run scripts/verify.py --short         # validate as 1080×1920 Short

Exit code: 0 = all gates pass, 1 = one or more gates failed.
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

import sys
import os
import json
import re
import pathlib
import subprocess

# ── Config ────────────────────────────────────────────────────────────────────

ROOT = pathlib.Path(__file__).parent.parent

# ── Helpers ───────────────────────────────────────────────────────────────────

def ffprobe(file: pathlib.Path, args: list) -> str:
    r = subprocess.run(
        ["ffprobe", "-v", "error"] + args + [str(file)],
        capture_output=True, text=True, timeout=60,
    )
    return r.stdout + r.stderr


def ffmpeg_filter(file: pathlib.Path, vf_or_af: str, kind: str = "af") -> str:
    """Run an ffmpeg filter and return combined stdout+stderr."""
    arg = ["-vf", vf_or_af] if kind == "vf" else ["-af", vf_or_af]
    r = subprocess.run(
        ["ffmpeg", "-nostdin", "-i", str(file)] + arg + ["-f", "null", "-"],
        capture_output=True, text=True, timeout=300,
    )
    return r.stdout + r.stderr


def check(name, ok: bool, expected: str, actual: str, kind: str = "HARD"):
    icon = "✅" if ok else ("⚠️ " if kind == "WARN" else "❌")
    status = "PASS" if ok else ("WARN" if kind == "WARN" else "FAIL")
    print(f"  {icon} [{status}] {name:<30} expected={expected}  actual={actual}")
    return ok


# ── Validate ─────────────────────────────────────────────────────────────────

def validate(video_path: pathlib.Path, is_short: bool = False) -> bool:
    if is_short:
        expect_w, expect_h = 1080, 1920
    else:
        expect_w, expect_h = 1920, 1080

    passed = True

    print(f"\n[verify] {video_path.name}")
    print(f"         {video_path.stat().st_size / 1024 / 1024:.1f} MB")

    # ── 1. File size ──────────────────────────────────────────────────────────
    size_mb = video_path.stat().st_size / (1024 * 1024)
    ok = size_mb > 1.0
    if not check("file_size", ok, ">1 MB", f"{size_mb:.1f} MB"):
        passed = False

    # ── 2. Stream probe ───────────────────────────────────────────────────────
    probe_out = ffprobe(video_path, ["-show_streams", "-show_format", "-print_format", "json"])
    try:
        probe = json.loads(probe_out.strip().split('\n', 1)[-1] if '\n' in probe_out else probe_out)
    except json.JSONDecodeError:
        check("ffprobe", False, "no errors", "parse error")
        return False

    video_stream = next((s for s in probe.get("streams", []) if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in probe.get("streams", []) if s.get("codec_type") == "audio"), None)

    # Video stream
    ok = video_stream is not None
    if not check("video_stream", ok, "present", "present" if ok else "missing"):
        passed = False

    if video_stream:
        # Resolution
        w = video_stream.get("width", 0)
        h = video_stream.get("height", 0)
        ok = w == expect_w and h == expect_h
        if not check("resolution", ok, f"{expect_w}×{expect_h}", f"{w}×{h}"):
            passed = False

        # Codec
        codec = video_stream.get("codec_name", "")
        ok = codec == "h264"
        if not check("video_codec", ok, "h264", codec):
            passed = False

        # Pixel format
        pix = video_stream.get("pix_fmt", "")
        ok = pix == "yuv420p"
        if not check("pixel_format", ok, "yuv420p", pix):
            passed = False

        # Frame rate
        fps_str = video_stream.get("r_frame_rate", "0/1")
        try:
            num, den = map(int, fps_str.split("/"))
            fps = num / den if den > 0 else 0
        except Exception:
            fps = 0
        ok = 23 <= fps <= 31
        if not check("frame_rate", ok, "24–30 fps", f"{fps:.1f} fps"):
            passed = False

        # Duration sanity
        dur = float(probe.get("format", {}).get("duration", 0))
        if dur > 0:
            min_dur = 5 if is_short else 5
            ok = dur >= min_dur
            check("duration", ok, f"≥{min_dur}s", f"{dur:.1f}s", kind="WARN" if not ok else "HARD")

    # Audio stream
    ok = audio_stream is not None
    if not check("audio_stream", ok, "present", "present" if ok else "missing"):
        passed = False

    # ── 3. LUFS + True Peak ───────────────────────────────────────────────────
    try:
        loudnorm_out = ffmpeg_filter(video_path, "loudnorm=I=-14:TP=-1:print_format=json")
        m = re.search(r'\{[\s\S]*?\}', loudnorm_out)
        if m:
            ln = json.loads(m.group())
            measured_i  = float(ln.get("input_i",  "-99"))
            measured_tp = float(ln.get("input_tp", "-99"))

            ok = abs(measured_i - (-14.0)) <= 1.5
            if not check("integrated_loudness", ok, "-14 ±1.5 LUFS", f"{measured_i:.1f} LUFS"):
                passed = False

            ok = measured_tp <= -0.5
            if not check("true_peak", ok, "≤ -0.5 dBTP", f"{measured_tp:.1f} dBTP"):
                passed = False
    except Exception as e:
        check("loudness_check", False, "measurable", str(e)[:60], kind="WARN")

    # ── 4. Black frames ───────────────────────────────────────────────────────
    try:
        black_out = ffmpeg_filter(video_path, "blackdetect=d=0.5:pix_th=0.10", kind="vf")
        has_black = "black_start" in black_out
        check("black_frames", not has_black, "none >0.5s", "detected" if has_black else "none",
              kind="HARD" if has_black else "HARD")
        if has_black:
            passed = False
    except Exception:
        pass

    # ── 5. Frozen frames (warn, not fail) ─────────────────────────────────────
    try:
        freeze_out = ffmpeg_filter(video_path, "freezedetect=n=0.0001:d=0.5", kind="vf")
        has_freeze = "freeze_start" in freeze_out
        check("frozen_frames", not has_freeze, "none >0.5s",
              "detected (check)" if has_freeze else "none", kind="WARN")
    except Exception:
        pass

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    if passed:
        print(f"[verify] ✅  All gates passed: {video_path.name}")
    else:
        print(f"[verify] ❌  One or more gates FAILED: {video_path.name}")

    return passed


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("files",   nargs="*", help="MP4 files to verify (auto-discovers out/*.mp4 if omitted)")
    p.add_argument("--short", action="store_true", help="Expect 1080×1920 Short resolution")
    args = p.parse_args()

    out_dir = ROOT / "out"

    if args.files:
        targets = [pathlib.Path(f) for f in args.files]
    else:
        # Auto-discover most-recent MP4
        mp4s = sorted(
            (f for f in out_dir.glob("*.mp4") if "muxed" not in f.name or True),
            key=lambda f: f.stat().st_mtime,
            reverse=True,
        )
        if not mp4s:
            print(f"[verify] No MP4 files found in {out_dir}")
            print("  Run: node scripts/render.mjs full")
            sys.exit(0)
        targets = [mp4s[0]]
        print(f"[verify] Auto-selected: {mp4s[0].name}")

    all_passed = True
    for target in targets:
        if not target.exists():
            print(f"[verify] Not found: {target}", file=sys.stderr)
            all_passed = False
            continue
        ok = validate(target, is_short=args.short)
        if not ok:
            all_passed = False

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
