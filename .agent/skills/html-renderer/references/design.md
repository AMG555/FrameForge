# Design Reference — Layouts, Safe Zones, Type Scale, Pacing

Production design rules for FrameForge HTML compositor projects.  
These rules apply to every frame whether it is a motion graphic, explainer, reel, or short.

---

## Canvas Formats

| Format | Dimensions | Use case |
|--------|-----------|---------|
| Landscape | 1920 × 1080 | YouTube, presentations, explainers |
| Portrait | 1080 × 1920 | TikTok, Instagram Reels, YouTube Shorts |
| Square | 1080 × 1080 | Instagram feed (export crop only) |

Set in `reel()`: `reel({ width: 1080, height: 1920, fps: 30, duration: 30 })`.

---

## Safe Zones

**Always keep story-critical content inside the safe zone.** Platform overlays (captions, UI chrome, handle badges) encroach from all edges.

### Landscape (1920 × 1080)

```
┌────────────────────────────────────────────────────────┐
│  80px                                              80px │  ← bleed margin
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │   TEXT & FOCAL CONTENT SAFE ZONE                 │  │  96px top
│  │   1728 × 888 px (centred)                       │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│  80px                                             120px │  ← bottom caption strip
└────────────────────────────────────────────────────────┘
```

- **Title / headline text:** keep within x: 96–1824, y: 96–200
- **Body / callout text:** keep within x: 96–1824, y: 200–880
- **Caption strip:** y: 880–980 (reserved for `captions()` output)
- **Never place story-critical text below y: 880** (platform UIs cover it)

### Portrait (1080 × 1920)

```
Top safe:     y > 120    (avoid top bar + handle overlay)
Bottom safe:  y < 1680   (avoid TikTok/Reels caption strip)
Side safe:    x: 60–1020
```

---

## Five-Layer Depth Stack

Every scene must maintain clear atmospheric depth. Name layers accordingly.

| Z-index | Layer name | Contents |
|---------|-----------|---------|
| 0 | `bg` | Radial gradient, sky, atmospheric tint |
| 1 | `env` | Grid lines, floor plane, distant elements, star field |
| 2 | `subject` | Primary visual entity (character, diagram, device) |
| 3 | `overlay` | Callout lines, pulse packets, data labels, badges |
| 4 | `fg` | Vignette, glass arcs, foreground foliage, grain |

In CSS: use `z-index: 0..4` on stage children or set `position: absolute` stacking order.

---

## Type Scale

### Landscape

| Role | Size | Weight | Font family |
|------|------|--------|-------------|
| Display / hero | 96–120px | 800 | Archivo, Rajdhani, or Cinzel |
| Headline | 64–80px | 700 | Archivo, Inter |
| Subhead | 40–52px | 600 | Inter, Rajdhani |
| Body | 28–36px | 400 | Inter, system-ui |
| Caption / badge | 20–24px | 500 | Inter |
| Fine print | 16–18px | 400 | Inter |

### Portrait (scale down ~25%)

| Role | Size |
|------|------|
| Display | 72–88px |
| Headline | 48–60px |
| Body | 22–28px |
| Caption | 18–20px |

### Regional stacks

| Script | Primary | Fallback |
|--------|---------|---------|
| Malayalam | Manjari, Gayathri, Chilanka | Nirmala UI, Noto Sans Malayalam |
| Devanagari (Hindi) | Noto Sans Devanagari | Nirmala UI |
| Tamil | Noto Sans Tamil | Latha |
| Telugu | Noto Sans Telugu | Gautami |
| CJK (Chinese/Japanese/Korean) | Noto Sans CJK SC/JP/KR | system-ui |
| Arabic | Noto Sans Arabic | Tahoma |
| Latin | Inter, Archivo | system-ui, sans-serif |

**WCAG AAA minimum contrast:** 7:1 text:background. Check with `seg()` + luminance math at every frame where background colour changes.

---

## Pacing Rules (cuts per second)

| Format | Min shot length | Max shot length | Pacing feel |
|--------|----------------|----------------|------------|
| Short-form reel | 1.5 s | 5 s | Fast, punchy |
| Educational explainer | 3 s | 12 s | Measured |
| Cinematic | 4 s | 20 s | Deliberate |

**Beats per minute → cuts per minute:** For music-synced videos, place cut points on downbeats. At 120 BPM, that's every 2 seconds (or every 4 for half-time feel).

---

## Motion Budget per Shot

Keep total simultaneous animated properties per shot under these thresholds to avoid visual noise.

| Properties moving at once | Perception |
|--------------------------|-----------|
| 1–2 | Clean, focused |
| 3–4 | Dynamic, energetic |
| 5–6 | Busy — only justified for reveal moments |
| 7+ | Chaotic — avoid |

---

## Transition Catalogue

Named transitions for `STORYBOARD.md` `transition_in` / `transition_out`:

| Name | Description | Duration |
|------|-------------|---------|
| `cut` | Instant switch | 0 s |
| `fade-from-black` | Fade in from black | 0.5–0.8 s |
| `fade-to-black` | Fade out to black | 0.4–0.6 s |
| `dissolve` | Alpha crossfade | 0.3–0.5 s |
| `wipe-left` | Wipe from right to left | 0.4 s |
| `wipe-right` | Wipe from left to right | 0.4 s |
| `iris-in` | Circle grows from centre | 0.6 s |
| `iris-out` | Circle shrinks to point | 0.5 s |
| `cross-dissolve` | Overlap dissolve | 0.4 s |
| `push-left` | New slide pushes old left | 0.5 s |
| `push-right` | New slide pushes old right | 0.5 s |
| `flash` | Single white frame | 1 frame |
| `dip-to-white` | Fade to white, then in | 0.6 s |

**Rule:** Exits are always faster than entrances (motion craft rule #4).  
For `cut`, no transition layer is needed. For all others, create a `layer('transition-out')` at the end of the outgoing shot and a `layer('transition-in')` at the start of the incoming shot.

---

## Camera Motion Vocabulary

| Keyword | Implementation |
|---------|--------------|
| `ken_burns` | `scale: 1.0 + p * 0.06` + subtle pan (Lissajous) |
| `zoom_in` | `scale: 1.0 + p * 0.12`, pan to subject |
| `zoom_out` | `scale: 1.12 - p * 0.12` |
| `pan_left` | `translateX: p * -80px` |
| `pan_right` | `translateX: p * 80px` |
| `static` | No transform — for diagram / data shots |
| `auto` | Pick from above based on `visual_description` |

`p = t / REEL.duration` — normalised film progress (0 → 1).

Camera never snaps. All motion is a smooth function of `p`. Cuts are handled by resetting `p` to 0 in the local shot frame (`lt`).

---

## Colour Palette Conventions

| Role | Recommendation |
|------|---------------|
| Background (dark) | `#0c1116` to `#111827` |
| Background (light) | `#f8f9fa` to `#ffffff` |
| Primary accent | Saturated, 60–70% lightness: `#3b82f6`, `#f59e0b`, `#10b981` |
| Text on dark | `#f8fafc` (95% white) — never pure `#ffffff` (too harsh) |
| Text on light | `#1f2328` (near black) |
| Muted text | `#57606a` |
| Warning / alert | `#ef4444` — use sparingly |

**One palette rule:** Pick one accent colour per video. Two maximum. Three or more = visual noise.

---

## Continuous Life Checklist

Every shot must have at least one of these running at all times (motion craft rule #7):

- [ ] Background gradient slowly shifting hue (`kf(t, [[0, 0], [REEL.duration, 10]])` hue offset)
- [ ] Subtle camera drift (Lissajous pan `sin(0.4*t) * 6px`)
- [ ] Particle system ticking (positions from `hash(i) * width`, animated by `t`)
- [ ] Progress indicator animating (ring, bar, counter)
- [ ] Wave / oscillation on any data element
- [ ] Character breathing (`sin(3*t) * 4px` vertical drift)

A completely frozen background for more than 3 consecutive seconds reads as a PowerPoint slide, not a video.

---

## Closed-Loop QA Thresholds

| Metric | Pass | Fail |
|--------|------|------|
| Content presence (foreground variance) | > 1.5% | ≤ 1.5% |
| Overexposure (bright pixel share) | < 92% | ≥ 92% |
| Compositional coverage (bbox area share) | > 8% | ≤ 8% |
| Motion delta (t=30% vs t=70%) | pixels differ | identical hash |
| Overall QA score | ≥ 7.0 / 10 | < 7.0 |

Run `node scripts/harness.mjs quality` to check all five. The encode step refuses to proceed if the report is absent or failing.
