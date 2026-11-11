# Procedural Audio & SFX Timeline Alignment

Derived from `Leonxlnx/earshot`. Provides deterministic CPU sound-effect synthesis and millisecond-accurate audio-motion alignment for coding agents.

---

## 1. Core Procedural SFX Primitives

Agents synthesize or cue sound effects by semantic cue type:

| Cue Type | Physical Character | Best Narrative Trigger | Duration |
|---|---|---|---|
| **Whoosh / Swish** | Filtered white noise pitch sweep down | Camera translation, card wipe, split transition | $250 - 450\text{ms}$ |
| **Impact / Hit** | Damped $60\text{Hz}$ sine wave + transient punch | Title punch-in, major claim reveal, beat drop | $300 - 600\text{ms}$ |
| **Pop / Blip** | Short sinusoidal chirp ($400\text{Hz} \to 800\text{Hz}$) | Badge reveal, icon appearance, bullet item | $80 - 150\text{ms}$ |
| **Tactile Click** | High-frequency impulse click ($2.5\text{kHz}$) | Kinetic letter reveal, counter tick increment | $30 - 60\text{ms}$ |
| **Riser** | Exponential pitch sweep upward ($100\text{Hz} \to 1200\text{Hz}$) | Build-up to scene climax or problem resolution | $1.0 - 2.5\text{s}$ |

---

## 2. Millisecond Audio-Motion Alignment Contract

Never place sound effects at arbitrary timestamps. Audio cues synchronize strictly with physical acceleration peaks:

$$\Delta t_{\text{cue}} = t_{\text{peak velocity}} - 0.04\text{s}$$

- **Perceptual Lead**: The human ear perceives sound ~40ms before visual processing finishes. Placing audio $40\text{ms}$ ahead of visual contact makes the impact feel physical and immediate.
- **Sidechain Ducking**: During voiceover narration, background music ducks by $-18\text{dB}$ and SFX ducks by $-6\text{dB}$ to maintain speech intelligibility (LUFS $-14 \pm 1.5\text{LU}$).

