# Directing a Video Film — Professional Method

Adapted from `lemomo-ai/lemo-opuscar` DIRECTOR.md.
Applies to any FrameForge render: HTML compositor, Remotion, or FFmpeg pipeline.

A film is judged in this order: **sound, rhythm, camera, directing** (performance, staging, emotional arc).
Good-looking frames are only the starting point.

---

## 1. Before You Write Anything — Find a Benchmark

Before writing treatment or storyboard, pick one or two reference works (films, title sequences, ads) that set the bar for this style **and this topic**. They are your creative choice, not the demo's. Write down:

- **What to learn**: composition, pacing, camera grammar, colour logic, score structure
- **What NOT to copy**: characters, designs, melodies, specific shots, logos, fonts

The benchmark lifts quality more than any rule below.

---

## 2. Shape the Story (3-act minimum)

- **One subject, one goal, one turn.** A character (or object, product, idea) wants something, something changes, it ends differently from how it began.
- **Hook in the first 3 seconds.** No slow logo reveal before anything happens.
- **An ending that echoes.** Bookend the opening, reveal the scale, or let the character do the thing right the second time.
- **One native move**: a moment only this medium can do (a fold that becomes a transition, ink that blooms into the next scene, a type grid that snaps into the logo). Put it at the emotional peak.
- **Cut the extras.** One gag the audience reads at thumbnail size beats three they can't.

---

## 3. TREATMENT.md Before Any Code

Write `TREATMENT.md` before drawing or coding anything:

```
1. Three candidate structures (e.g.: single journey, before/after, countdown, list-that-turns)
   → choose one + reason why
2. Logline + arc: setup → turn → ending (one sentence)
3. Benchmark: what to learn / what not to copy
4. Shot list: for every shot → framing (wide/full/medium/close/insert), angle,
   camera move (push/pull/pan/track/crane/zoom), duration, WHY
5. Beat sheet: second by second
6. Cue map: tempo, bar grid, instrumentation per section,
   on which beat every cut / key action / subtitle lands
7. Sound design table: for each section → ambience bed, main foley, music state
8. Subtitle and title design: the type is part of the style
```

---

## 4. Sound Is Half the Film

- **Every visible action has a sound**: landings, page turns, cuts, drips, clicks, cloth. Match the material (paper, wood, metal, ink and glass all sound different).
- **Three audio layers**:
  1. **Ambience** (room, wind, rain, city)
  2. **Foley** (tied to specific actions)
  3. **Music** (bed — duck under dialogue and key foley)
- **At least two real silences** (or near-silences) before the turn or the emotional peak. The first sound after silence should be one of the most important sounds in the film.
- **J-cuts and L-cuts**: use sound as a transition at least twice:
  - **J-cut**: bring the next scene's sound in before the picture cuts
  - **L-cut**: let the last scene's sound run over into the next
- **Avoid generic "piano and strings"** — score in the instruments of the style's sound palette.
- **Earshot professional levels**: music bed sits around −18 to −14 LUFS for dialogue scenes, individual effects 3–6 dB over the bed. Target −14 LUFS final mix (social/web delivery).

---

## 5. Rhythm: Music Grid Comes First

- Write the **cue map** before animating. The picture locks to the grid.
- **Vary the pace**: alternate fast and slow; include one clear acceleration or deceleration; give the audience one breath (a long take or held pause).
- A film at one even speed has failed — contrast is what creates rhythm.
- One action, one sound, one cut — but don't cut on every beat. Leave time to see.
- **Pace for the viewer, not the clock**:
  - Hold every subtitle at least 1.8 s (never shorter than spoken line + 0.6 s)
  - After text finishes animating in, hold for roughly `(letters ÷ 15 + 1.5) s` in English
  - Hold a title card at least 4 s
  - Give failures and gags enough time to be understood
  - Fast is fine: make it fast with **fewer words per screen**, not by cutting before people finish reading

---

## 6. Camera: Every Shot Needs a Reason

- Use at least **four different camera moves** and real changes of framing. 2D has a camera too: push, pull, parallax, focus pulls, frames within frames.
- **One signature shot** people remember: a oner, a scale reveal, a transition made from the medium itself.
- **Design transitions inside the medium** (a page turn, a carved line growing, ink spreading) as one consistent grammar. Avoid default fades and hard cuts.
- At key moments the subject fills **at least a third of the frame height**, with clear staging and a readable silhouette.

---

## 7. Performance (Character / Animated Elements)

- **Anticipation → action → follow-through** on every meaningful move.
- Characters change emotion. They do not just slide across the screen.
- **Motion continuity**:
  - Blend every pose with keyframes and easing — never switch poses inside an `if`
  - The only exception is a deliberate one-frame comic pop
  - Check shoulders and arms on a large action test sheet before animating
  - Held props sit **between the palms**, at a depth between the two arms
  - A rolling object turns by `distance ÷ radius`
- Step through key actions at 0.2 s intervals, enlarged, before finalizing.
- Check every expression at final size. "Worried" and "angry" are one eyebrow flip apart.

---

## 8. The Review Loop (Run Before Delivery)

1. **Contact sheet**: every shot's first, middle, and last frames — one sheet
2. **Strip**: every frame of a key motion (transition, take, jump, throw) — 0.1–0.15 s step
3. **Crop**: full-resolution detail check on faces, hands, contacts, glows
4. **One full-speed viewing with sound** — watch it as the viewer will

What to check at each step:
- **Read**: is the event of each shot clear from its sheet alone?
- **Timing**: does every read have enough time to land before the next?
- **Motion**: does every move have anticipation and follow-through? Any pops or snaps?
- **Boil**: in a strip, does stable linework stay stable between frames?
- **Contacts**: do feet touch the ground? Do held objects touch the hands?
- **Transitions**: does every seam open and close with one?
- **Rules**: any text, any 3D, any dead stretch?
- **Sound**: every row of the sound design table actually in the mix?

---

## 9. Failures Seen Most Often

| Failure | Fix |
|---------|-----|
| Subject too small, too far, or pushed to frame edge | At key moments, fill ≥1/3 of frame height |
| Too dark to read, or colour on same colour | Check contrast at delivery size |
| Subtitles covering the subject | Position captions in clear negative space |
| A gag too fast to understand | Give it more frames — fast ≠ short |
| Blank frames in transitions | Verify every seam with a strip |
| Timed effect that doesn't track subject after camera moves | One world→screen projection function throughout |
| Everything at one even speed | Vary shot length by ≥4× across the film |
| Beats that replace each other instead of carrying | Something on screen must survive every section boundary |
| Full-bleed footage for the whole video | The genre is 70% white/negative space; full-bleed is the exception |

---

## 10. Delivery Checklist

```
□ final.mp4 (−14 LUFS, correct fps, no black frames, no NaN frames)
□ poster.jpg (first clear frame)
□ final.srt (when narrated — in sync, not covering key action)
□ TREATMENT.md
□ CREDITS (every third-party asset: music, fonts, images, voice engine + source + licence)
□ build.sh (one-command reproducible render)
□ Source code / project folder
```

**Tell the user** (in their language):
- Where the project folder and the film are
- That CREDITS lists third-party assets and their licences
- That they are responsible for the materials they supply

---

## 11. Copyright Red Lines

- References teach grammar only. Never copy characters, designs, melodies, shots, logos, or type designs.
- No existing works, games, brands, or events appear in the film unless the user owns them or has the right.
- Draw fictional stand-ins when rights are unclear.
