# STORYBOARD.md — Shot List Template

> Fill this out and validate it with `node scripts/storyboard-validator.mjs STORYBOARD.md`
> before writing any scene code. All four gates must pass.
>
> Gate 1 — Every shot has an EVENT (what physically happens), not a description.
> Gate 2 — Reads within each shot have non-overlapping timestamps.
> Gate 3 — Every seam has a named transition, including the film open and close.
> Gate 4 — No on-screen text. Emotion and story must be acted, not captioned.

---

## Film

- title: My Film
- duration: 30.0
- fps: 30
- size: 1920 × 1080
- palette: #0d1117 #f0f6ff #3b82f6
- bpm: 120

---

## Shot 1 — Opening
- start: 0.0
- end: 8.0
- transition_in: fade-from-black
- transition_out: cut
- event: The camera pushes slowly through darkness until a single point of light fills the frame.
- reads:
  - 0.0–3.0: Viewer feels disorientation — where are we?
  - 3.0–8.0: The light resolves into a planet, establishing scale.

---

## Shot 2 — Reveal
- start: 8.0
- end: 18.0
- transition_in: cut
- transition_out: dissolve
- event: The planet rotates a quarter-turn, revealing the continent below, and the camera begins a slow descent.
- reads:
  - 8.0–12.0: Viewer recognises the landmass.
  - 12.0–18.0: Viewer understands we are descending toward a specific location.

---

## Shot 3 — Close
- start: 18.0
- end: 30.0
- transition_in: dissolve
- transition_out: fade-to-black
- event: A single window lights up in the city below as all other lights flicker off.
- reads:
  - 18.0–24.0: Viewer feels the loneliness of the lit window.
  - 24.0–30.0: Viewer understands this story is about one person among millions.

---
<!-- 
  NOTES FOR THE MODEL
  ───────────────────
  • "event" is a physical action, not a mood adjective.
    BAD:  "A beautiful landscape is shown."
    GOOD: "A wave breaks over the seawall and spray hits the lens."

  • "reads" timestamps must not overlap:
    BAD:  0.0–2.0 and 1.5–3.0 (overlap at 1.5–2.0)
    GOOD: 0.0–2.0 and 2.0–4.0

  • Every transition must be named. Recognised values:
    cut  fade-from-black  fade-to-black  dissolve  wipe-left  wipe-right
    iris-in  iris-out  cross-dissolve  push-left  push-right  flash  dip-to-white

  • No text means no lower-thirds, title cards, subtitles, or overlays.
    The model cannot write `text()` calls that convey plot information.
    Character names, place names, dates — all must be acted or implied visually.
-->
