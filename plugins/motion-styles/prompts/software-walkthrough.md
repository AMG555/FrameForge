# Motion graphics style #04: Software Walkthrough

- **ID:** `software-walkthrough`
- **Family:** Screen and UI
- **Canvas:** `1280x720`
- **Fonts:** DM Sans (400 to 700), DM Mono (400 and 500)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A polished screen-recording tutorial built entirely in code: an app window on a soft gradient desktop, a real-feeling cursor with click ripples, a camera that zooms into what matters, yellow-edged spotlights, numbered step callouts and a calm pad underneath.

## How It Explains
It shows the clicks, not just the idea: a title card, then the cursor moves through the real flow while the camera follows it in and out, modals and menus open, fields get typed, toggles flip, and a dark step pill at the bottom left counts you through. It ends on the result actually happening and a short lower third.

## Demo
Your first automation in an invented app called Flowdesk

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Software Walkthrough" style (Screen and UI) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged.
- Replace the demo's story: TL, CAM, CURSOR, STEP_NAMES, the app pieces (sidebar, header, homePage, emptyState, modal, editor), the spotlight calls in explainer(), titleCard(), notification(), outroCard() and scoreSound(). Keep and reuse the style's helpers (the ui-kit helpers (rr, track, rise, riseLine, typed, softCard, cursorArrow, checkMark, padBed), wallpaper(), appWindow() as the frame, spotlight(), cursor(), stepCallout() and the camera transform in explainer()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: DM Sans (400 to 700), DM Mono (400 and 500).

THE STYLE
- Surface: a desktop with a soft indigo to teal gradient wallpaper and two slow light blooms. On it, one app window (rounded, deep shadow) with a title bar, a sidebar and a main area. The whole UI is drawn in code, crisp and believable, for an invented app with an invented name. Never copy a real product’s UI, name or logo.
- Type: DM Sans for all UI and titles (700 for headings and selected items, 400 to 500 for body), DM Mono in caps for tiny labels (WHEN, THEN, LIVE). Ink #14161c, muted #6a6f7c, one accent (#5b5bf6) for buttons, selection and the cursor ripple, green #1fb46e for live and success, yellow #ffd60a only for spotlight edges.
- Cursor: a classic arrow that moves along eased waypoints (CURSOR keys), dips slightly on each click, and leaves an accent ripple. Every click has a visible result within 0.1 s: a pressed button, a selected row, an opened menu.
- Camera: one continuous screen recording. Zoom in (1.2x to 1.6x) toward the area being used, hold, and ease back out to the full window between steps (CAM keys). The camera leads the cursor slightly.
- Emphasis: a spotlight dims everything except a rounded cutout with a yellow edge around the one control that matters. Toasts, notifications and a side panel slide in to prove the result.
- Chrome: a title card first (small mono tag, a big two-line title, a pill with the step count and time), a dark numbered step pill at the bottom left that swaps as each step starts, and a dark lower third with a green check at the end.
- Flow: real UI behaviour in order: navigate, empty state, modal with choices, dropdown, continue, editor with connected nodes, typed fields, chips, a toggle that turns on, and the outcome happening (a new row, a message, a file).
- Pace: 3 to 5 seconds per step, never more than one new action at a time, and a 1.5 second hold on the result.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 keep the title card at 90 px or more, step callouts at 28 px, app text at 18 px or more (the camera zooms in on anything smaller), and the lower third at 40 px. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Your first automation in an invented app called Flowdesk") unless my content asks for it.

SOUND
- Bed: a warm, slow pad (padBed) with soft hats while the steps run, no kick. It drops away under the title card for a moment.
- Map events to the kit: every cursor click gets "click"; modals, menus, nodes and chips get "pop" (higher pitch for smaller things); typing gets "keys"; every camera zoom in or out gets a soft pink-noise swell; step pills get a two-note chime that climbs a little with each step; the toggle gets a short bright swish; a toast or the result gets a chime; an incoming notification gets "ping"; panels sliding in get a soft "whoosh".
- Full mix (no voiceover): keep the warm pad and soft hats, crisp clicks on every click, and a quiet moment before the result appears.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Software Walkthrough
Family: Screen and UI
Look: A polished screen-recording tutorial built entirely in code: an app window on a soft gradient desktop, a real-feeling cursor with click ripples, a camera that zooms into what matters, yellow-edged spotlights, numbered step callouts and a calm pad underneath.
How it explains: It shows the clicks, not just the idea: a title card, then the cursor moves through the real flow while the camera follows it in and out, modals and menus open, fields get typed, toggles flip, and a dark step pill at the bottom left counts you through. It ends on the result actually happening and a short lower third.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Software Walkthrough" style (Screen and UI) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each click lands on the spoken word that names it, the camera starts moving about 0.3 s before the thing it shows is mentioned, and each step pill appears as its step is introduced.
- Cut between scenes only at idea boundaries (a new step, a new claim, a reveal), never mid-word, and finish each cut just before the next idea's first spoken word.
- Put the emphasis moves on stressed words. A counter lands at the exact moment its number is spoken.
- Keep the player's "Load voiceover" button working so I can drop in my audio and hear it in sync.

STORYBOARD FIRST
Before building, show me a storyboard and wait for my OK:
- One HTML page (an artifact if you can) with a grid of 6 to 10 panels, one per beat. Draw each panel on a canvas with the reference's own helpers, scene drawing and finishing pass, so the stills already look like the finished piece. No animation or sound yet.
- Under each panel: the beat number, its start and end time, the exact on-screen words, the camera move or emphasis, how it gets there from the previous beat (the same scene continuing, or a cut and which kind), and its key sounds.
- Below the grid, list any facts or numbers you had to assume.
When I approve it (or after my changes), build the full animation and reuse the storyboard's drawing code.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged.
- Replace the demo's story: TL, CAM, CURSOR, STEP_NAMES, the app pieces (sidebar, header, homePage, emptyState, modal, editor), the spotlight calls in explainer(), titleCard(), notification(), outroCard() and scoreSound(). Keep and reuse the style's helpers (the ui-kit helpers (rr, track, rise, riseLine, typed, softCard, cursorArrow, checkMark, padBed), wallpaper(), appWindow() as the frame, spotlight(), cursor(), stepCallout() and the camera transform in explainer()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: DM Sans (400 to 700), DM Mono (400 and 500).

THE STYLE
- Surface: a desktop with a soft indigo to teal gradient wallpaper and two slow light blooms. On it, one app window (rounded, deep shadow) with a title bar, a sidebar and a main area. The whole UI is drawn in code, crisp and believable, for an invented app with an invented name. Never copy a real product’s UI, name or logo.
- Type: DM Sans for all UI and titles (700 for headings and selected items, 400 to 500 for body), DM Mono in caps for tiny labels (WHEN, THEN, LIVE). Ink #14161c, muted #6a6f7c, one accent (#5b5bf6) for buttons, selection and the cursor ripple, green #1fb46e for live and success, yellow #ffd60a only for spotlight edges.
- Cursor: a classic arrow that moves along eased waypoints (CURSOR keys), dips slightly on each click, and leaves an accent ripple. Every click has a visible result within 0.1 s: a pressed button, a selected row, an opened menu.
- Camera: one continuous screen recording. Zoom in (1.2x to 1.6x) toward the area being used, hold, and ease back out to the full window between steps (CAM keys). The camera leads the cursor slightly.
- Emphasis: a spotlight dims everything except a rounded cutout with a yellow edge around the one control that matters. Toasts, notifications and a side panel slide in to prove the result.
- Chrome: a title card first (small mono tag, a big two-line title, a pill with the step count and time), a dark numbered step pill at the bottom left that swaps as each step starts, and a dark lower third with a green check at the end.
- Flow: real UI behaviour in order: navigate, empty state, modal with choices, dropdown, continue, editor with connected nodes, typed fields, chips, a toggle that turns on, and the outcome happening (a new row, a message, a file).
- Pace: 3 to 5 seconds per step, never more than one new action at a time, and a 1.5 second hold on the result.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 keep the title card at 90 px or more, step callouts at 28 px, app text at 18 px or more (the camera zooms in on anything smaller), and the lower third at 40 px. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Your first automation in an invented app called Flowdesk") unless my content asks for it.

SOUND
- Bed: a warm, slow pad (padBed) with soft hats while the steps run, no kick. It drops away under the title card for a moment.
- Map events to the kit: every cursor click gets "click"; modals, menus, nodes and chips get "pop" (higher pitch for smaller things); typing gets "keys"; every camera zoom in or out gets a soft pink-noise swell; step pills get a two-note chime that climbs a little with each step; the toggle gets a short bright swish; a toast or the result gets a chime; an incoming notification gets "ping"; panels sliding in get a soft "whoosh".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded, which keeps the pad low and plays anything marked soft at about 55%. Keep clicks at full level (they are the proof), mark camera whooshes and ticks soft: true, and keep chimes for the step pills and the final result only.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Software Walkthrough
Family: Screen and UI
Look: A polished screen-recording tutorial built entirely in code: an app window on a soft gradient desktop, a real-feeling cursor with click ripples, a camera that zooms into what matters, yellow-edged spotlights, numbered step callouts and a calm pad underneath.
How it explains: It shows the clicks, not just the idea: a title card, then the cursor moves through the real flow while the camera follows it in and out, modals and menus open, fields get typed, toggles flip, and a dark step pill at the bottom left counts you through. It ends on the result actually happening and a short lower third.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/software-walkthrough.html` (56.5 KB)
