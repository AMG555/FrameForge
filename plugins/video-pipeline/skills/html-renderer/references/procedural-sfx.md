# Procedural Audio & SFX — Professional Broadcast Engineering

Derived from `Leonxlnx/earshot`. Provides deterministic CPU sound-effect synthesis,
millisecond-accurate audio-motion alignment, and a complete broadcast-grade voice chain
for coding agents producing professional video.

---

## 1. Core Procedural SFX Primitives

Agents synthesize or cue sound effects by semantic cue type:

| Cue Type | Physical Character | Best Narrative Trigger | Duration | FFmpeg Freq |
|---|---|---|---|---|
| **Whoosh / Swish** | Filtered white noise pitch sweep down | Camera translation, card wipe, split transition | 400ms | 200Hz |
| **Impact / Hit** | Damped 60Hz sine wave + transient punch | Title punch-in, major claim reveal, beat drop | 500ms | 60Hz |
| **Pop / Blip** | Short sinusoidal chirp (400Hz → 800Hz) | Badge reveal, icon appearance, bullet item | 120ms | 600Hz |
| **Tactile Click** | High-frequency impulse click (2.5kHz) | Kinetic letter reveal, counter tick increment | 50ms | 2500Hz |
| **Riser** | Exponential pitch sweep upward (100Hz → 1200Hz) | Build-up to scene climax or problem resolution | 2.0s | 100Hz |

Use via `mix_audio_pro` tool:
```
mix_audio_pro({
  voicePath: ".frameforge-files/voice_0.m4a",
  outputPath: ".frameforge-files/audio_pro.m4a",
  sfxCues: [
    { name: "whoosh", time: 2.5, volume: 0.8 },   // camera translation at t=2.5s
    { name: "impact", time: 8.0, volume: 1.0 },   // title punch at t=8.0s
    { name: "pop",    time: 12.3, volume: 0.6 },  // badge reveal at t=12.3s
  ]
})
```

Or in `edit.js` for render-time visual sync (engine.js `cue()` function):
```javascript
import { cue } from './reel/engine.js';
cue('whoosh', 2.5, 0.8);  // registered in window.__cues for render.mjs
cue('impact', 8.0, 1.0);
```

---

## 2. Millisecond Audio-Motion Alignment Contract

Never place sound effects at arbitrary timestamps. Audio cues synchronize strictly
with physical acceleration peaks:

$$\Delta t_{\text{cue}} = t_{\text{peak velocity}} - 0.04\text{s}$$

- **Perceptual Lead**: The human ear perceives sound ~40ms before visual processing finishes.
  Placing audio 40ms ahead of the visual contact makes the impact feel physical and immediate.
- **Sidechain Ducking**: During voiceover narration, background music ducks by -18dB and
  SFX ducks by -6dB to maintain speech intelligibility (LUFS -14 ±1.5LU).

---

## 3. Professional Voice Signal Chain (10+ Year Sound Engineer Standard)

The `mix_audio_pro` MCP tool and `mix_audio_pro.py` script apply the full chain:

```
Input Voice  ──►  80Hz HPF  ──►  Presence +2dB@5kHz  ──►  Air Shelf +1.5dB@12kHz
              ──►  3:1 Compressor (-20dBFS, 5ms attack, 50ms release)
              ──►  De-esser (6.5kHz, -3dB dynamic)
              ──►  [Optional: Room Acoustics 0.3s RT60]
              ──►  Sidechain Ducking (-18dB on music)
              ──►  [Optional: Stereo Widener 1.4x M/S on music]
              ──►  SFX Timeline Mix (40ms perceptual lead)
              ──►  Two-Pass EBU R128 Loudnorm (-14 LUFS, ≤-1 dBTP)
              ──►  Output: 48kHz / 192k AAC Stereo
```

### Why each stage matters (15+ year professional rationale)

| Stage | Purpose | When to engage |
|---|---|---|
| **80Hz HPF** | Remove proximity effect, desk rumble, HVAC drone | Always on — never skip |
| **Presence +2dB@5kHz** | Add intelligibility, cut through music bed | Always on for narration |
| **Air Shelf +1.5dB@12kHz** | Open "air" and breathiness on voice | Always on |
| **3:1 Compressor** | Control dynamics, keep voice at consistent level | Always on — broadcast standard |
| **De-esser @6.5kHz** | Remove harsh sibilants ("s", "sh", "ch") | Always on for TTS/VO |
| **Room Acoustics** | 30ms pre-delay + 0.3s RT60 aecho | Enable for cinematic narrator; disable for tutorial/VO |
| **Sidechain Ducking** | Music auto-ducks -18dB when voice active | Any time music is present |
| **Stereo Widener** | M/S extrastereo 1.4x on music layer only | Enable for music beds; voice stays mono-center |
| **Two-Pass Loudnorm** | Linear EBU R128 normalization | Always — final step, never skip |

---

## 4. Music Bed Selection & Mood Matching

For `music_mood` field in scenes and `withMusic: true` in `create_video_from_script`:

| Mood | Tempo | Frequency Character | Use Case |
|---|---|---|---|
| `energetic` | 120–140 BPM | High energy, punchy low end | Product launches, viral reels, calls-to-action |
| `tense` | 80–100 BPM | Staccato, minor key | Problem reveal, stakes building |
| `calm` | 60–80 BPM | Warm pads, sparse percussion | Explanation, resolution, educational |
| `mysterious` | 70–90 BPM | Sparse, reverb-heavy, minor | Open-question hooks, discovery reveals |
| `dramatic` | 90–110 BPM | Orchestral swells, crescendo | Climactic moments, emotional payoff |
| `neutral` | 100–120 BPM | Background, minimal | Default filler — prefer a named mood |
| `humorous` | 120–160 BPM | Staccato, comedic | Comedic beats, visual gags |

---

## 5. Broadcast Loudness Standards Reference

| Platform | Target LUFS | True Peak |
|---|---|---|
| YouTube | -14 LUFS | -1 dBTP |
| Spotify Podcast | -16 LUFS | -1 dBTP |
| Apple Podcasts | -16 LUFS | -1 dBTP |
| Netflix / Streaming | -27 LUFS (dialogue) | -3 dBTP |
| Broadcast (EBU R128) | -23 LUFS | -1 dBTP |
| **FrameForge Default** | **-14 LUFS** | **-1 dBTP** |

Set `targetLufs` in `mix_audio_pro` to match your delivery platform.
