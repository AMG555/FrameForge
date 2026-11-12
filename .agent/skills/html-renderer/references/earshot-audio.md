# Earshot — Professional Audio Quality Workflow

Adapted from `Leonxlnx/earshot` SKILL.md.
AI-native audio analysis, verification, and synthesis. 
**Core principle: Never say how audio sounds without measurement data behind it.**

---

## Why Earshot Matters for Agents

Agents cannot hear. Without measurement, every audio decision is a guess. Earshot provides:
- **Semantic matching**: describe a sound and find the closest asset
- **Realness detection**: is this audio synthesized code or a real recording?
- **Professional critique**: does the mix meet broadcast/launch film standards?
- **Synthesis optimization**: make a sound in code, measure it, improve it

---

## The 5 Loops

### Loop 1: Choose an Asset

```
1. RANK: earshot rank "<description>" downloads/sfx/ --top 5
   → shortlist from a folder by semantic match

2. FIND: earshot find winner.ogg "<description>" --top 3
   → best moments as sample trims (start/end in seconds)
   → Each segment kind: stroke (one onset → decay), event (strokes that belong together),
     window (stretch for beds/textures)
   → "head cut" / "tail cut" = trim starts/ends inside a sound — don't use as-is

3. DESCRIBE: earshot describe winner.ogg --start 1.12 --end 1.48
   → what it actually sounds like; check attack/decay shape fits the picture

4. REALNESS: earshot realness winner.ogg --start 1.12 --end 1.48
   → p_real: is this recorded audio or code-synthesized?
   → Thresholds for clips (≤6 s): lo 0.17 / hi 0.77
   → "likely code-synthesized" → don't use if brief asks for real recorded sound
   → Clean pro-synthesized tones (UI sounds, chimes, synth stabs) also read as code-synthesized

5. COMPARE: earshot ab a.ogg b.ogg --query "<description>"
   → which is closer, and how B differs from A in measured words
```

### Loop 2: Review a Mix or Film

```
1. TIMELINE: earshot timeline film.mp4 --cues cues.json
   → listening transcript: events with time, level, and tags
   → sections, loudness curve, picture cuts, sync per cut/cue
   → sync offset_ms = sound minus picture (negative = early)
   → A cut listed with no hit can still carry a soft whoosh — check with sheet before adding

2. SHEET: earshot sheet film.mp4 -o sheet.png --cues cues.json
   → annotated PNG: frames, sections, labelled events, spectrogram, loudness, beats, cue markers
   → Green = within a frame, Amber = within 100 ms, Red = no sound
   → OPEN THE PNG — gaps, pile-ups, masking, and late hits are obvious at a glance

3. CRITIQUE: earshot critique film.mp4
   → scorecard against measured range of professional launch films
   → verdict: launch-grade / close / needs work / not launch-grade
   → Fix critical rows first, re-run 1-3 on the new render

4. MEASURE: earshot measure mix.wav
   → LUFS, true peak dBTP, LRA, noise floor, attack/decay, brightness, bands
```

### Loop 3: A/B a Change

```
earshot ab before.wav after.wav --query "<description>"
```
- Which is closer, and how B differs from A in measured words (louder, brighter, longer decay)
- Change one thing at a time

### Loop 4: Make a Sound in Code (Earshot Forge)

When the brief calls for a **made** sound (not chosen from a library):

1. Write a recipe `render(params, r) -> 48 kHz array` using DSP primitives:
   - Modal resonators, contact excitations, noise colours
   - Time-varying SVF filter, computed room, mic with noise floor
   - Model the physics of the real thing (what strikes what, what rings, how long, in what room)
2. Run a search round with budget and reps
3. **Evaluate by measurement** (not by model score):
   - Tonal balance: which bands fall outside every reference
   - `robust`: mean over new seeds, not the lucky best render
   - Spectrograms vs reference: `ffmpeg -i x.wav -lavfi showspectrumpic=s=900x360:scale=log x.png`
4. Fix recipe structure for what's wrong; repeat

**Goodhart warning**: The search optimises earshot's models. Made sounds routinely out-score real recordings on them, which means the critic is satisfied, not that the sound is better. Judge by measured closeness to references.

### Loop 5: Make a Film's Sound Kit

Use when a code-made film needs its effects rendered from earshot's shipped sound bank:

```bash
# Initialize a kit from a preset
earshot kit init --preset calm -o audio/kit.json
# calm = text-led, crisp = energetic product films, minimal = effects-only, launch = music-led

# Check candidates
earshot sfx list --kind hit

# Render the kit
earshot kit render audio/kit.json --out audio/kit

# Verify
earshot kit check audio/kit.json --out audio/kit
```

**0.4 families for music-led launch films**:
- `ui_pop` — rounded mid pops for chips, bubbles, rows arriving (most-used effect)
- `knock` — mid-band wood and plastic
- `cut_hit` — short sub hits with a kick
- `mallet` — gated glockenspiel/celesta/marimba notes, soft pluck, chime runs (supports `--pitch`)
- `drip` — water drops (pitch rises)
- `shutter` — snap zooms, whip-cuts
- `reverse_swell` — peaks just after a cut (one per film)
- Plus: `whoosh_big`, `thump`, `riser`, `swish`, `glitch`, `notify`

**Levels against the music, not fixed**:
```python
from earshot.forge import kit
lock = kit.render('audio/kit.json', 'audio/kit')  # takes carry l50_lufs; roles bed_db
role = lock['roles']['pop']
take = role['takes'][i]
bed = kit.bed_level(music, t_cue)  # the music's median 50ms level
gain = kit.gain_db(take, role, bed)  # dB on the take file (never over -1 dBFS peak)
start = kit.place(take, role, t_cue)  # onset on the frame for hits/touches, peak for whoosh
```

Duck the music **6–12 dB for 0.3–0.5 s** before a hit, drop, big whoosh, or swell; bring it back on the hit.

---

## Professional Audio Numbers

| Number | What it is | Trust |
|--------|-----------|-------|
| LUFS, dBTP, LRA, dBFS, ms, Hz | Measurements (BS.1770 meter, spectrum, envelope) | Exact — use for levels |
| z (match/rank/find) | How far a description stands out among vocabulary | z ≥ 3 strong, 2.5–3 plausible, 2–2.5 weak, < 2 no match |
| p_real | Real-recorded vs code-synthesized | Strong evidence, not proof |
| cosine | Raw CLAP similarity | Never a probability; compare only same sound + same query |
| AudioSet labels (0..1) | Independent per-class probabilities | Good for broad classes; hears only up to 8 kHz |
| sync offset_ms | Sound minus picture per cut | Trust when well above chance |
| critique status | Value vs range of 7 professional launch films | A range, not a target |

---

## Writing Audio Queries

Describe the sound, not its use:
- ✓ "a heavy wooden door slamming in a small room"
- ✗ "a sound for the logo"

Give alternatives that are realistic confusions:
- ✓ `--alts "a click vs a typewriter key vs a thock"`

Job words are not heard. Check with 2–3 phrasings and keep the best.

---

## Professional Levels Quick Reference

| Platform | Target LUFS | True Peak |
|----------|-------------|-----------|
| YouTube | −14 LUFS | −1 dBTP |
| Podcast | −16 LUFS | −1 dBTP |
| Netflix | −27 LUFS | −2 dBTP |
| Instagram/TikTok | −14 LUFS | −1 dBTP |
| Broadcast | −23 LUFS | −1 dBTP |
| Music streaming | −14 LUFS | −1 dBTP |

Music under a voice: ~0.14 relative volume (≈ −17 dB).  
Each SFX hit sits 3–6 dB over the music bed.

---

## FrameForge Integration

| Earshot concept | FrameForge tool | Parameter |
|----------------|-----------------|-----------|
| `earshot measure` | `mix_audio_pro` | Returns LUFS, dBTP in result |
| Sound-on-beat timing | `cue('sfxname', t, dur)` in edit.js | `cue()` in engine.js |
| Platform LUFS target | `mix_audio_pro` | `platform: "youtube" \| "podcast" \| "netflix"` |
| Room acoustics | `mix_audio_pro` | `roomProfile: "studio_dry" \| "broadcast" \| "cinematic"` |
| SFX synthesis types | `mix_audio_pro` | `sfxType: "chime" \| "buzz" \| "tick" \| "swish" \| ...` |
| Noise gate | `mix_audio_pro` | `noiseGate: true` |

---

## Earshot Limits (Cite These When They Matter)

- **Taste is not measured**: earshot says what a sound is and how it measures, not whether it is beautiful or right for the story. The user decides on taste; give them the evidence and the shortlist.
- **No speech recognition**: it can tell there is speech, not what is said.
- **CLAP hears 50 Hz – 14 kHz**, AST up to 8 kHz: check "air" and low-pass problems with `measure (bandwidth_hz, bands)`.
- **Very short sounds** are padded to a 10 s window; isolated hits read best with `find`/`describe` on a trimmed segment.
- **Picture cuts** from frame-difference detector: hard cuts and whips are reliable, slow crossfades are missed or found late.
- **Licence and provenance** are not audio questions: earshot cannot check them.
