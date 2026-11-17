---
name: cinematic
description: Make a short cinematic animated sequence in the style of classic Japanese feature animation (for example Studio Ghibli), with tapered ink lines, cel shading and painted watercolor or gouache backgrounds, delivered as one self-contained HTML file that plays with sound plus an MP4 rendered from the same code. Use whenever someone asks for a "cinematic animation", an "anime-style" or "Ghibli-style" animation, a hand-drawn Japanese-style film moment, or asks to redo or extend one of these. Before building, asks for the subject, setting and action (never invents the premise), plus the length and whether to plan together first; defaults are 30 seconds and straight to work. Always use this skill instead of building these animations ad hoc, because it holds the intake questions, the art direction, the hand-drawn render kit, the parallel MP4 renderer, the audio synth and the final polish checks.
---

# Cinematic

Makes a short animated sequence styled after classic Japanese feature animation (for example Studio Ghibli), as one self-contained HTML file that plays in a browser with sound, plus an MP4 rendered frame by frame from the same code. It should feel like a genuine film moment with emotional weight, not a web graphics demo.

Everything lives in this skill folder. `scripts/new_cinematic.sh` starts a project from `template/`, which holds a working 13-second example ("The Straw Hat": a straw hat on a fence post is carried off by the wind). Below, `SK` is this skill folder and `P` is the animation's project folder.

## 1. Clarify before building

Never invent the premise. Check the request for these things:

- **Subject**: who or what the scene is about.
- **Setting**: where and when it happens (place, time of day, weather, season).
- **Action**: what happens in the scene, from start to end.
- **Length**: how long it should be.
- **Plan together or just get to work**: plan the scene together first, or go straight to making it?

If the subject, setting or action is missing or vague, ask for it before writing any code. Ask only for what wasn't given, in one short message, and say the default for the rest: 30 seconds for length, and getting straight to work if there's no choice. Don't fill gaps in the premise yourself, and don't add requirements nobody asked for. When you deliver, write one line naming any choice you made on their behalf (a title, a character's colors, an extra beat), so it's easy to change.

**Fixed (don't ask):** the look in section 2, 16:9 at 1920x1080, 24 fps, music and sound effects on.

## 2. Core aesthetic and execution

Read [references/look.md](references/look.md) before designing anything. In short:

- **Output:** one standalone HTML file. Any rendering stack is fine (Canvas, WebGL, shaders) as long as the result has a convincing 2D hand-crafted look; the template uses a plain 2D canvas. All designs must be completely original. Never copy characters, creatures, places or shots from existing films.
- **Art direction:** organic, tapered ink lines; classic cel-shaded color with restrained shadows (one shadow tone, sometimes a rim of light); textured watercolor- or gouache-style painted backgrounds. Add subtle weathering and natural irregularities (chipped paint, moss, worn paths, uneven edges) so the world feels lived-in.
- **Animation and directing:** strong key poses, variable timing, anticipation, weight, and natural secondary motion (wind in hair, drifting leaves, cloth, grass) instead of rigid, mechanical tweening. Frame each shot cinematically, with a clear narrative progression from the first shot to the last rather than an aimless loop.

## 3. What to avoid

Eliminate the telltale signs of cheap digital graphics:

- uniform vector strokes (every line the same weight)
- glossy 3D shading, specular highlights, plastic surfaces
- repetitive procedural assets (the same tree, house or cloud stamped over and over)
- floaty easing curves (everything sliding on the same smooth in-out)
- flickering details (noise, grain or texture that changes every frame)
- soft airbrushed gradients (use painted strokes instead)

## 4. Plan the scene

- Find the emotional turn: what the character wants or feels at the start, and how that has changed by the end. Every shot should move toward it.
- Write a short shot list: one line per shot with rough times, the framing (wide, medium, close), the camera move, and what the shot shows. Vary the framing: an establishing wide, mediums for action, a close-up for the emotional beat, a release shot to end.

**If planning together was chosen**, get sign-off before building the scenes:

1. Share the shot list.
2. Start the project (section 5), draw just the main characters and key objects, and render a design sheet with `node render.mjs --design` (key poses and expressions for each, with a name and a one-line note).
3. Share the sheet and the shot list together, and wait for an answer. Change what's asked for and share a new sheet until it's approved. Only then build the shots.

**If getting straight to work was chosen** (or nothing was chosen), share the shot list for reference and keep building without waiting.

## 5. Start the project

- `P` is the folder the request names. Otherwise use a new subfolder named `<slug>-cinematic/` in the current working folder.
- Run `bash "$SK/scripts/new_cinematic.sh" "$P"`. It copies the template, reuses an installed Playwright (installs one only if none works), and makes sure Python has numpy and scipy (in `~/.cache/cinematic-skill/venv` if the system Python lacks them). If it reports node or ffmpeg missing, pass on the `brew install` line it prints.
- Layout: `src/beats.json` (title, length, cue times), `src/00_core.js` (math, seeded noise, color, geometry, shot list), `src/01_ink.js` (tapered ink lines and cels), `src/02_paint.js` (brush dabs, painted regions and skies, paper), `src/03_shapes.js` (cel shapes, limbs, ribbons, cloud masses), `src/04_kit.js` (foliage, trees, clouds, grass, haze, camera, plates), `src/10_example.js` (the example scene), `src/90_design.js` (design sheet), `src/99_main.js` (timeline, transitions, film finish, player), `audio/audio.py` + `audio/audiolib.py` (sound), `build.mjs`, `render.mjs`, and `build/` for outputs.
- Replace `src/10_example.js` and `src/90_design.js` entirely. Put characters and props in their own numbered files (`05_hero.js`, `06_props.js`, ...) and shots in `10_...`, `20_...` files. `build.mjs` joins `src/*.js` in name order.

## 6. Build

Read [references/craft.md](references/craft.md) before writing scene code.

1. **Beats.** Write `src/beats.json`: `title`, `duration`, `fps`, and named `cues` for every moment that needs a sound or a cut. Picture and sound both read these times, so change timing here only.
2. **Characters and props.** Design each one original: a clear silhouette, a small, limited palette, tapered ink outline, one shadow shape and an optional rim light. Draw each as a function of its pose so every shot and the design sheet use the same drawing.
3. **Backgrounds.** Paint each shot's background once into a plate in its `prep` (sky in brush strokes, painted regions, foliage, weathering, paper texture), then draw the moving parts on top every frame. Vary every repeated element (size, shape, color, spacing).
4. **Acting.** Animate characters on twos (`on2(t)`, 12 drawings a second) with held key poses and short, decisive moves between them (`kf` with `E.out3`, `E.in2`, not one ease everywhere). Show anticipation before big moves, weight on landings, and overlap and follow-through in hair, cloth and tails. Cameras move on ones so pans stay smooth.
5. **Shots.** `shot(name, t0, t1, prep, draw, { in })` for each shot, with an optional `dissolve` or `dip` transition. Shots must cover the whole duration with no gaps.
6. **Every frame depends only on `t`.** No clocks, no `Math.random`, no state carried from the last frame. Use `RNG(seed)`, `hash` and `n1`/`n2` for anything organic.
7. **Quick checks:** `node build.mjs`, then `node render.mjs --stills 1,4.5,9` (a time in each shot and on each side of every cut). Look at `build/stills/sheet.jpg` and fix problems before the full render.

## 7. Sound

Edit `audio/audio.py`: a score that carries the emotion (often a small melody on piano, strings, woodwinds or harp, with room to breathe), ambience that places the scene (wind, rain, birds, sea), and sound effects on the cues from `beats.json`. `audiolib.py` has instruments, effects and ambience beds; add new sounds there when needed. Run `./py audio/audio.py build/audio.wav`. Add a voiceover only if one is asked for.

## 8. Render and final polish

1. `node build.mjs` writes `build/<slug>.html` with the sound inside.
2. `node render.mjs` renders with parallel headless Chromium workers, adds the sound at -16 LUFS, and writes `build/<slug>.mp4` plus `build/review/contact-*.jpg` (one tile per second). Use `--scale 0.5` for a fast draft, `--from`/`--to` for a section. Heavy painted plates make the first frame of each shot slow; after that it's fast.
3. **Final polish:** inspect individual frames across every key transition (`node render.mjs --stills` just before and after each cut and each big move) and the contact sheets, against the checklist in [references/review.md](references/review.md): consistent character proportions, strong composition, visual cohesion. Every paused frame should hold up as a finished production still. Fix, rebuild and re-render until it passes.

## 9. Deliver

- Hand over the HTML (click or space to play with sound, arrow keys to step a frame) and the MP4 from `P/build/`, with the length and one line on any choice made on the requester's behalf.
- When changes are asked for, move the previous cut to `P/v1/` (then `v2/`, ...) before re-rendering.
- When a request is a fresh take on an earlier premise, start the shot list from scratch instead of reusing the earlier version's shots.
- Add new review lessons from feedback to `references/review.md`.
