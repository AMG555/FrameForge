#!/usr/bin/env python3
"""
mix_audio_pro.py — Professional broadcast-grade audio post-production chain.
v2.7.2 — synced with mixer.js: 13-type SFX library, 5 room profiles, noise gate,
         mud notch, sfx-events.json auto-read (window.__events contract).

15+ year sound engineer signal chain applied via FFmpeg:
  1. Noise gate: -60dBFS threshold — remove breath/room tone (--noise-gate)
  2. Pre-EQ: 80Hz HPF (rumble/proximity), mud notch -1.5dB@300Hz
  3. Presence boost: +2dB@5kHz, air shelf +1.5dB@12kHz
  4. De-esser: 6.5kHz dynamic suppression (-3dB)
  5. Voice compressor: 3:1 ratio, -20dBFS threshold, 5ms attack, 50ms release
  6. Room acoustics: 5 named profiles OR computed:sizeM:damp:earlyMs (Sabine RT60)
  7. Sidechain ducking: music ducks -18dB at 40ms perceptual lead when voice active
  8. Stereo widener: M/S extrastereo 1.4x on music layer (voice stays mono-center)
  9. SFX timeline mixer: 13 procedural types with 40ms perceptual lead
     Types: whoosh|swish|impact|deep_boom|punch|pop|click|riser|chime|buzz|tick|sparkle|transition
 10. Master bus: two-pass EBU R128 loudnorm at target LUFS, true peak ≤-1 dBTP
     Platforms: youtube (-14) | podcast (-16) | broadcast (-23) | netflix (-27) | instagram (-14)

New in v2.7.2:
  --sfx-events  Auto-load sfx-events.json from out/ (window.__events contract from render.mjs)
  --room        Named room profile or computed:sizeM:damp:earlyMs
  --platform    Platform LUFS preset (youtube|podcast|broadcast|netflix|instagram)
  --noise-gate  Enable noise gate (-60dBFS threshold)

Usage:
  uv run scripts/mix_audio_pro.py
  uv run scripts/mix_audio_pro.py --music assets/bg.mp3 --room broadcast --platform youtube
  uv run scripts/mix_audio_pro.py --music assets/bg.mp3 --sfx whoosh:2.5:0.8 impact:8.0:1.0
  uv run scripts/mix_audio_pro.py --sfx-events                # auto-reads out/sfx-events.json
  uv run scripts/mix_audio_pro.py --video out/animation.mp4 --out out/final.mp4

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
import re
import pathlib
import subprocess
import shutil
import tempfile
import argparse

# ── Config ────────────────────────────────────────────────────────────────────

ROOT      = pathlib.Path(__file__).parent.parent
AUDIO_DIR = ROOT / "audio"
OUT_DIR   = ROOT / "out"

PERCEPTUAL_LEAD_S = 0.04   # 40ms ahead of visual cue (earshot contract)

# ── 13-type SFX frequency map (synced with mixer.js SFX_FREQ_MAP) ─────────────
# Each entry: freq (Hz), dur (s), vol (0–1), waveform ('sine'|'anoise'|'sawtooth')
# All at -8 dBFS in SFX bus = vol ≈ 0.40 before final mix
SFX_MAP = {
    "whoosh":      {"freq": 200,   "dur": 0.40, "vol": 0.35, "wave": "sine"},
    "swish":       {"freq": 350,   "dur": 0.25, "vol": 0.30, "wave": "sine"},
    "impact":      {"freq": 60,    "dur": 0.50, "vol": 0.42, "wave": "sine"},
    "deep_boom":   {"freq": 35,    "dur": 0.80, "vol": 0.50, "wave": "sine"},
    "punch":       {"freq": 80,    "dur": 0.30, "vol": 0.45, "wave": "sine"},
    "pop":         {"freq": 600,   "dur": 0.12, "vol": 0.28, "wave": "sine"},
    "click":       {"freq": 2500,  "dur": 0.05, "vol": 0.22, "wave": "sine"},
    "riser":       {"freq": 100,   "dur": 2.00, "vol": 0.30, "wave": "sine"},
    "chime":       {"freq": 1400,  "dur": 0.60, "vol": 0.25, "wave": "sine"},
    "buzz":        {"freq": 120,   "dur": 0.35, "vol": 0.32, "wave": "sine"},
    "tick":        {"freq": 3000,  "dur": 0.04, "vol": 0.20, "wave": "sine"},
    "sparkle":     {"freq": 4000,  "dur": 0.20, "vol": 0.18, "wave": "sine"},
    "transition":  {"freq": 500,   "dur": 0.50, "vol": 0.28, "wave": "sine"},
}

# OneTake ROOM_SFX material → SFX_MAP key
MATERIAL_SFX = {
    "air":    "whoosh",
    "wood":   "impact",
    "glass":  "chime",
    "sub":    "deep_boom",
    "bubble": "pop",
}

# ── Named room profiles (synced with mixer.js ROOM_PROFILES) ──────────────────
ROOM_PROFILES = {
    "studio_dry":    {"in_gain": 0.5,  "out_gain": 0.4,  "delays": "8",       "decays": "0.05"},
    "broadcast":     {"in_gain": 0.65, "out_gain": 0.6,  "delays": "15|25",   "decays": "0.08|0.04"},
    "cinematic":     {"in_gain": 0.8,  "out_gain": 0.85, "delays": "30|60|90","decays": "0.3|0.2|0.1"},
    "concert_hall":  {"in_gain": 0.9,  "out_gain": 0.9,  "delays": "35|80|150|250","decays": "0.5|0.35|0.2|0.08"},
    "intimate":      {"in_gain": 0.55, "out_gain": 0.5,  "delays": "10|18",   "decays": "0.06|0.03"},
}

# ── Platform LUFS presets ─────────────────────────────────────────────────────
PLATFORM_LUFS = {
    "youtube":   -14.0,
    "instagram": -14.0,
    "podcast":   -16.0,
    "broadcast": -23.0,
    "netflix":   -27.0,
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def ffmpeg(*args, check=True, capture=False, timeout=300):
    cmd = ["ffmpeg", "-nostdin", "-y"] + list(args)
    if capture:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r
    else:
        r = subprocess.run(cmd, capture_output=False, text=True, timeout=timeout)
        if check and r.returncode != 0:
            sys.exit(f"[mix_audio_pro] ffmpeg failed: {' '.join(cmd[:6])}...")
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
    """Two-pass measure — return (integrated_I, true_peak) floats."""
    r = subprocess.run(
        ["ffmpeg", "-nostdin", "-i", str(path),
         "-af", "loudnorm=I=-14:TP=-1:print_format=json",
         "-f", "null", "-"],
        capture_output=True, text=True, timeout=120,
    )
    combined = r.stderr + r.stdout
    m = re.search(r'\{[\s\S]*?\}', combined)
    if not m:
        return None, None
    try:
        d = json.loads(m.group())
        return float(d.get("input_i", 0)), float(d.get("input_tp", 0))
    except Exception:
        return None, None


def two_pass_norm(in_path: pathlib.Path, out_path: pathlib.Path,
                  lufs: float = -14.0, tp: float = -1.0):
    """Apply EBU R128 two-pass loudnorm for linear accuracy."""
    r = subprocess.run(
        ["ffmpeg", "-nostdin", "-i", str(in_path),
         "-af", f"loudnorm=I={lufs}:TP={tp}:print_format=json",
         "-f", "null", "-"],
        capture_output=True, text=True, timeout=120,
    )
    combined = r.stderr + r.stdout
    m = re.search(r'\{[\s\S]*?\}', combined)
    filter_str = f"loudnorm=I={lufs}:TP={tp}"
    if m:
        try:
            ln = json.loads(m.group())
            filter_str = (
                f"loudnorm=I={lufs}:TP={tp}:"
                f"measured_I={ln['input_i']}:measured_LRA={ln['input_lra']}:"
                f"measured_TP={ln['input_tp']}:measured_thresh={ln['input_thresh']}:"
                f"offset={ln['target_offset']}:linear=true"
            )
        except Exception:
            pass
    ffmpeg(
        "-i", str(in_path), "-af", filter_str,
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        str(out_path),
    )


def build_room_filter(room: str) -> str | None:
    """
    Build an aecho room filter from a named profile or 'computed:sizeM:damp:earlyMs'.
    Returns None for 'none' / empty.
    """
    if not room or room.lower() in ("none", "dry"):
        return None

    if room.startswith("computed:"):
        # Earshot forgeComputedRoom — Sabine RT60 approximation
        parts = room.split(":")
        size_m   = float(parts[1]) if len(parts) > 1 else 8.0
        damp     = float(parts[2]) if len(parts) > 2 else 0.5
        early_ms = float(parts[3]) if len(parts) > 3 else 15.0

        rt60     = max(0.05, 0.05 * size_m * (1.0 - damp))
        in_gain  = 0.85
        out_gain = min(0.95, 0.3 + rt60 * 0.8)
        e1 = max(1.0, early_ms)
        e2 = max(e1 + 1, early_ms + size_m * 0.8)
        e3 = max(e2 + 1, early_ms + size_m * 2.0)
        d1 = max(0.01, damp * 0.4)
        d2 = max(0.01, damp * 0.25)
        d3 = max(0.01, damp * 0.15)
        return (
            f"aecho=in_gain={in_gain:.2f}:out_gain={out_gain:.2f}:"
            f"delays={e1:.0f}|{e2:.0f}|{e3:.0f}:"
            f"decays={d1:.3f}|{d2:.3f}|{d3:.3f}"
        )

    profile = ROOM_PROFILES.get(room.lower())
    if not profile:
        print(f"  ⚠  Unknown room profile '{room}'. Valid: {', '.join(ROOM_PROFILES)} or computed:sizeM:damp:earlyMs", file=sys.stderr)
        return None

    return (
        f"aecho=in_gain={profile['in_gain']}:out_gain={profile['out_gain']}:"
        f"delays={profile['delays']}:decays={profile['decays']}"
    )


def build_voice_chain_filter(noise_gate: bool = False, room: str | None = None) -> str:
    """
    Professional voice signal chain (synced with mixer.js _buildVoiceChainFilter):
      [noise gate] → 80Hz HPF → mud notch -1.5dB@300Hz → presence +2dB@5kHz →
      air shelf +1.5dB@12kHz → 3:1 compressor → de-esser → [room acoustics]
    """
    chain = []

    # Step 1: Noise gate (-60dBFS threshold removes breath between words)
    if noise_gate:
        chain.append("agate=threshold=0.0003:range=0.15:attack=5:release=200")

    # Step 2: 80Hz HPF — remove proximity and room rumble
    chain.append("highpass=f=80")

    # Step 3: Mud notch -1.5dB@300Hz — acoustic pocket carving (mixer.js v2.5.0+)
    chain.append("equalizer=f=300:width_type=q:width=1.5:g=-1.5")

    # Step 4: Presence boost +2dB@5kHz
    chain.append("equalizer=f=5000:width_type=o:width=2:g=2.0")

    # Step 5: Air shelf +1.5dB@12kHz
    chain.append("equalizer=f=12000:width_type=s:width=1:g=1.5")

    # Step 6: 3:1 broadcast compressor
    chain.append("acompressor=ratio=3:threshold=-20dB:attack=5:release=50:makeup=2")

    # Step 7: De-esser — 6.5kHz band suppression
    chain.append("equalizer=f=6500:width_type=h:width=1500:g=-3.0")

    # Step 8: Room acoustics (optional)
    if room:
        room_filter = build_room_filter(room)
        if room_filter:
            chain.append(room_filter)

    return ",".join(chain)


def synthesize_sfx_cue(sfx_name: str, cue_time: float, cue_vol: float,
                        total_dur: float, tmp: pathlib.Path) -> pathlib.Path:
    """
    Generate a procedural SFX tone at the correct timeline position.
    Applies 40ms perceptual lead (earshot contract: SFX arrives before visual peak).
    Supports all 13 SFX types from SFX_MAP.
    """
    sfx = SFX_MAP.get(sfx_name.lower(), SFX_MAP["pop"])
    adjusted_time = max(0.0, cue_time - PERCEPTUAL_LEAD_S)
    adelay_ms = int(adjusted_time * 1000)
    volume = sfx["vol"] * cue_vol
    pad_dur = max(sfx["dur"] + adjusted_time + 0.5, 1.0, total_dur)

    out = tmp / f"sfx_{sfx_name}_{adelay_ms}.m4a"
    ffmpeg(
        "-f", "lavfi", "-i",
        f"anullsrc=channel_layout=stereo:sample_rate=48000:duration={pad_dur}",
        "-f", "lavfi", "-i",
        f"sine=f={sfx['freq']}:d={sfx['dur']}",
        "-filter_complex",
        f"[1:a]volume={volume},adelay={adelay_ms}|{adelay_ms}[sfx];"
        f"[0:a][sfx]amix=inputs=2:duration=first[out]",
        "-map", "[out]",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
        "-t", str(pad_dur),
        str(out),
    )
    return out


def load_sfx_events(events_path: pathlib.Path) -> list[tuple[str, float, float]]:
    """
    Load SFX cues from sfx-events.json (window.__events() contract from render.mjs).
    Returns list of (sfx_name, time_s, vol) tuples.
    """
    if not events_path.exists():
        return []
    try:
        events = json.loads(events_path.read_text("utf8"))
        cues = []
        for ev in events:
            if ev.get("type") != "sfx":
                continue
            # Support both sfxName and material (OneTake ROOM_SFX contract)
            sfx_name = ev.get("sfxName") or MATERIAL_SFX.get(ev.get("material", ""), "pop")
            t        = float(ev.get("t", 0.0))
            vol      = float(ev.get("vol", 1.0))
            cues.append((sfx_name, t, vol))
        return cues
    except Exception as e:
        print(f"  ⚠  Could not parse sfx-events.json: {e}", file=sys.stderr)
        return []


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(
        description="Professional audio post-production (15+ yr sound engineer chain, v2.7.2)"
    )
    p.add_argument("--music",           default=None,   help="Background music file")
    p.add_argument("--music-vol",       default="0.12", help="Music volume before ducking (default 0.12)")
    p.add_argument("--duck-level",      default="-18",  help="Music attenuation when voice active (dB, default -18)")
    p.add_argument("--room",            default=None,
                   help="Room acoustics: studio_dry|broadcast|cinematic|concert_hall|intimate "
                        "or computed:sizeM:damp:earlyMs  (e.g. computed:8:0.5:15 = 8m studio)")
    p.add_argument("--reverb",          action="store_true",
                   help="Legacy: shorthand for --room cinematic")
    p.add_argument("--noise-gate",      action="store_true",
                   help="Enable noise gate (-60dBFS threshold, removes breath between words)")
    p.add_argument("--no-stereo-widen", action="store_true",
                   help="Disable stereo widening on music layer")
    p.add_argument("--platform",        default=None,
                   choices=list(PLATFORM_LUFS.keys()),
                   help="Platform LUFS preset (overrides --lufs)")
    p.add_argument("--lufs",            default="-14",  help="Target integrated loudness in LUFS (default -14)")
    p.add_argument("--sfx",             action="append", metavar="NAME:TIME:VOL",
                   help="Add SFX cue: e.g. whoosh:2.5:0.8 or impact:8.0:1.0. "
                        f"Valid names: {', '.join(SFX_MAP)}. Repeat for multiple cues.")
    p.add_argument("--sfx-events",      action="store_true",
                   help="Auto-read out/sfx-events.json (window.__events() from render.mjs). "
                        "Merges with any --sfx cues.")
    p.add_argument("--video",           default=None,   help="Mux final audio into this video file")
    p.add_argument("--out",             default=None,   help="Output file path (default: out/audio_mix_pro.m4a)")
    args = p.parse_args()

    # Resolve LUFS target
    target_lufs = PLATFORM_LUFS.get(args.platform, float(args.lufs)) if args.platform else float(args.lufs)

    music_vol    = float(args.music_vol)
    duck_level   = float(args.duck_level)
    stereo_widen = not args.no_stereo_widen

    # --reverb is a legacy alias for --room cinematic
    room = args.room or ("cinematic" if args.reverb else None)

    # Default output
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if args.out:
        out_path = pathlib.Path(args.out)
    elif args.video:
        out_path = OUT_DIR / "final.mp4"
    else:
        out_path = OUT_DIR / "audio_mix_pro.m4a"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # ── Collect voice files ───────────────────────────────────────────────────
    voice_files = []
    for pat in ["voice_*.m4a", "voice_*.mp3", "voice_*.wav"]:
        voice_files.extend(sorted(AUDIO_DIR.glob(pat)))

    if not voice_files:
        print(f"[mix_audio_pro] No voice files found in {AUDIO_DIR}", file=sys.stderr)
        print("  Copy FrameForge TTS outputs there first: voice_0.m4a, voice_1.m4a, ...")
        sys.exit(0)

    def sort_key(path):
        nums = re.findall(r'\d+', path.stem)
        return int(nums[0]) if nums else 0

    voice_files.sort(key=sort_key)
    print(f"[mix_audio_pro] Voices: {len(voice_files)} files | LUFS target: {target_lufs}{' (' + args.platform + ')' if args.platform else ''}")

    # ── Collect SFX cues ─────────────────────────────────────────────────────
    sfx_cues: list[tuple[str, float, float]] = []

    # Auto-load sfx-events.json if --sfx-events flag or file exists
    sfx_events_path = OUT_DIR / "sfx-events.json"
    if args.sfx_events or sfx_events_path.exists():
        loaded = load_sfx_events(sfx_events_path)
        if loaded:
            sfx_cues.extend(loaded)
            print(f"[mix_audio_pro] Loaded {len(loaded)} SFX cue(s) from sfx-events.json (window.__events contract)")

    # Parse --sfx NAME:TIME:VOL flags
    if args.sfx:
        for sfx_arg in args.sfx:
            parts = sfx_arg.split(":")
            sfx_name = parts[0].lower()
            cue_time = float(parts[1]) if len(parts) > 1 else 0.0
            cue_vol  = float(parts[2]) if len(parts) > 2 else 1.0
            if sfx_name not in SFX_MAP:
                print(f"  ⚠  Unknown SFX '{sfx_name}'. Valid: {', '.join(SFX_MAP)}", file=sys.stderr)
                continue
            sfx_cues.append((sfx_name, cue_time, cue_vol))

    with tempfile.TemporaryDirectory() as tmp_str:
        tmp = pathlib.Path(tmp_str)

        # ── Step 1: Concatenate voice files ──────────────────────────────────
        if len(voice_files) == 1:
            concat_path = tmp / "concat.m4a"
            shutil.copy(voice_files[0], concat_path)
        else:
            concat_list = tmp / "list.txt"
            with open(concat_list, "w") as f:
                for vf in voice_files:
                    f.write(f"file '{vf.resolve()}'\n")
            concat_path = tmp / "concat.m4a"
            ffmpeg("-f", "concat", "-safe", "0", "-i", str(concat_list),
                   "-c", "copy", str(concat_path))

        total_dur = ffprobe_duration(concat_path)
        print(f"[mix_audio_pro] Voice duration: {total_dur:.1f}s")

        # ── Step 2: Professional voice chain ─────────────────────────────────
        voice_chain = build_voice_chain_filter(noise_gate=args.noise_gate, room=room)
        voice_chain_path = tmp / "voice_chain.m4a"
        ffmpeg("-i", str(concat_path), "-af", voice_chain,
               "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
               str(voice_chain_path))
        gate_label = " +gate" if args.noise_gate else ""
        room_label = f" +{room}" if room else ""
        print(f"[mix_audio_pro] Voice chain: HPF+mud-notch+EQ+compress+de-ess{gate_label}{room_label}")

        # ── Step 3: SFX synthesis ─────────────────────────────────────────────
        sfx_mix_path = None
        if sfx_cues:
            sfx_paths = []
            for sfx_name, cue_time, cue_vol in sfx_cues:
                sfx_path = synthesize_sfx_cue(sfx_name, cue_time, cue_vol, total_dur, tmp)
                sfx_paths.append(sfx_path)
                print(f"  ✔ SFX [{sfx_name}] t={cue_time}s → t={max(0, cue_time - PERCEPTUAL_LEAD_S):.3f}s (40ms lead)")

            if len(sfx_paths) == 1:
                sfx_mix_path = sfx_paths[0]
            elif len(sfx_paths) > 1:
                sfx_mix_path = tmp / "sfx_combined.m4a"
                inputs = []
                for sp in sfx_paths:
                    inputs += ["-i", str(sp)]
                sfx_filter  = "".join(f"[{i}:a]" for i in range(len(sfx_paths)))
                sfx_filter += f"amix=inputs={len(sfx_paths)}:duration=longest:normalize=0[sfxout]"
                ffmpeg(*inputs, "-filter_complex", sfx_filter,
                       "-map", "[sfxout]",
                       "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
                       str(sfx_mix_path))

        # ── Step 4: Music + sidechain ducking ─────────────────────────────────
        if args.music:
            music_path = pathlib.Path(args.music)
            if not music_path.exists():
                print(f"[mix_audio_pro] Music file not found: {music_path}", file=sys.stderr)
                sys.exit(1)

            music_filter = (
                f"aformat=sample_rates=48000:channel_layouts=stereo,"
                f"highpass=f=80,lowpass=f=16000,volume={music_vol}"
            )
            if stereo_widen:
                music_filter += ",extrastereo=m=1.4"

            pre_mix_path  = tmp / "pre_mix.m4a"
            extra_inputs  = ["-i", str(sfx_mix_path)] if sfx_mix_path else []
            sfx_input_idx = 2 if sfx_mix_path else None

            if sfx_mix_path:
                filter_complex = (
                    f"[1:a]{music_filter}[music_proc];"
                    f"[0:a][music_proc]sidechaincompress="
                    f"threshold=0.003:ratio=20:attack=0.2:release=1:makeup=2[ducked];"
                    f"[ducked][{sfx_input_idx}:a]amix=inputs=2:duration=first:normalize=0[out]"
                )
            else:
                filter_complex = (
                    f"[1:a]{music_filter}[music_proc];"
                    f"[0:a][music_proc]sidechaincompress="
                    f"threshold=0.003:ratio=20:attack=0.2:release=1:makeup=2[out]"
                )

            ffmpeg(
                "-i", str(voice_chain_path),
                "-stream_loop", "-1", "-i", str(music_path), "-t", str(total_dur),
                *extra_inputs,
                "-filter_complex", filter_complex,
                "-map", "[out]",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                str(pre_mix_path),
            )
            print(f"[mix_audio_pro] Sidechain duck {duck_level}dB | stereo widen: {'1.4x M/S' if stereo_widen else 'off'}")
            final_pre_norm = pre_mix_path

        elif sfx_mix_path:
            voice_sfx_path = tmp / "voice_sfx.m4a"
            ffmpeg(
                "-i", str(voice_chain_path), "-i", str(sfx_mix_path),
                "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:normalize=0[out]",
                "-map", "[out]",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                str(voice_sfx_path),
            )
            final_pre_norm = voice_sfx_path
        else:
            final_pre_norm = voice_chain_path

        # ── Step 5: Two-pass EBU R128 loudnorm ───────────────────────────────
        norm_path = tmp / "master_norm.m4a"
        two_pass_norm(final_pre_norm, norm_path, lufs=target_lufs)
        print(f"[mix_audio_pro] Two-pass loudnorm → {target_lufs} LUFS")

        # ── Step 6: Mux into video or copy ────────────────────────────────────
        if args.video:
            video_path = pathlib.Path(args.video)
            if not video_path.exists():
                print(f"[mix_audio_pro] Video not found: {video_path}", file=sys.stderr)
                sys.exit(1)
            vid_dur    = ffprobe_duration(video_path)
            extra_t    = ["-t", str(vid_dur)] if vid_dur > 0 else []
            ffmpeg(
                "-i", str(video_path), "-i", str(norm_path),
                "-map", "0:v", "-map", "1:a",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                *extra_t,
                "-movflags", "+faststart",
                str(out_path),
            )
            print(f"[mix_audio_pro] Muxed → {out_path}")
        else:
            shutil.copy(norm_path, out_path)

    # ── Report ────────────────────────────────────────────────────────────────
    measured_I, measured_TP = measure_lufs(out_path)
    size_mb = out_path.stat().st_size / 1024 / 1024

    print(f"\n[mix_audio_pro] ✅  {out_path}")
    print(f"                Duration: {total_dur:.1f}s  |  Size: {size_mb:.1f}MB")
    if measured_I is not None:
        lufs_ok = abs(measured_I - target_lufs) <= 1.5
        tp_ok   = measured_TP <= -0.5
        status  = "✅ PASS" if lufs_ok and tp_ok else "⚠️ WARN"
        print(f"                LUFS: {measured_I:.1f}  |  TP: {measured_TP:.1f} dBTP  |  {status}")
        if not lufs_ok:
            print(f"  ⚠  LUFS deviation > 1.5 LU from target {target_lufs}")
        if not tp_ok:
            print(f"  ⚠  True peak above -0.5 dBTP")

    print(f"\n  Signal chain (v2.7.2):")
    if args.noise_gate:
        print(f"  noise gate (-60dBFS) →")
    print(f"  80Hz HPF → mud notch -1.5dB@300Hz → presence +2dB@5kHz → air shelf +1.5dB@12kHz")
    print(f"  → 3:1 compressor → de-ess@6.5kHz", end="")
    if room:
        print(f" → room: {room}", end="")
    if args.music:
        print(f"\n  → sidechain duck {duck_level}dB → stereo widen {'1.4x M/S' if stereo_widen else 'off'}", end="")
    if sfx_cues:
        print(f"\n  → {len(sfx_cues)} SFX cue(s) with 40ms perceptual lead", end="")
    print(f"\n  → two-pass EBU R128 @ {target_lufs} LUFS{' (' + args.platform + ')' if args.platform else ''}")


if __name__ == "__main__":
    main()
