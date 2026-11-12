# Motion graphics style #15: Glass Icons

- **ID:** `glass-icons`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Inter (500 to 900), JetBrains Mono (700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Glossy translucent 3D app icons in Three.js, floating on a soft mint, sky and peach gradient, each with a white symbol on its face, frosted labels and a crisp black headline.

## How It Explains
The icons float in from depth into a loose stack, then one at a time an icon swings forward to the centre, turns to face you and gets a frosted card with its number, name and one-line benefit while the others dim back. The takeaway lines them all up in a row.

## Demo
5 AI tools that save hours (tool types, not brands)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Glass Icons" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, ICONS (colours, symbols, names, one-liners), the focus order, the headline and takeaway text and scoreSound(). Keep and reuse the style's helpers (makeGL(), the rounded-square extruded icon geometry with clearcoat glass, the coloured point lights, the float/focus/line-up motion in pose(), the frosted info card, the gradient background, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (500 to 900), JetBrains Mono (700).

THE STYLE
- Icons are real 3D: rounded squares extruded with a bevel, MeshPhysicalMaterial with clearcoat and slight transparency, each a different soft colour, with a simple white 3D symbol on the face. Never use a real app logo or brand; describe tool types.
- Background: a soft three-colour gradient (mint #c7f0e4, sky #c8dcff, peach #ffd9c7) painted in 2D behind a transparent WebGL canvas, lit by two coloured point lights for glassy highlights.
- One icon is in focus at a time: it swings to the centre, grows and faces the camera; the rest float smaller and dimmer behind it.
- Info card: frosted white (rgba white 0.7, white border) under the focused icon with a mono number, an Inter 800 name and one plain benefit line.
- Type: Inter 900 headline in near-black (#0f1a2a), second line blue (#2d5bff); JetBrains Mono for numbers and tags.
- Pace: icons arrive in the first 1.5 seconds, then one focus every 2 seconds, and the line-up holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 64 px or more, the card title at 48 px or more and card text at 28 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("5 AI tools that save hours (tool types, not brands)") unless my content asks for it.

SOUND
- Bed: a bright, airy pad with light hats.
- Map events to the kit: icons arriving get soft glassy pings; each focus gets a soft "whoosh" and a two-note glass chime (SND.chime) that climbs; card text gets a soft tick; the line-up gets a rising arpeggio and "shimmer".
- Full mix (no voiceover): keep the bright pad, at most about 3 sounds at once, and a clean glass chime on each focus.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Glass Icons
Family: 3D
Look: Glossy translucent 3D app icons in Three.js, floating on a soft mint, sky and peach gradient, each with a white symbol on its face, frosted labels and a crisp black headline.
How it explains: The icons float in from depth into a loose stack, then one at a time an icon swings forward to the centre, turns to face you and gets a frosted card with its number, name and one-line benefit while the others dim back. The takeaway lines them all up in a row.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Glass Icons" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. An icon swings forward on the first word of its item, its name lands on that word, and the line-up lands on the first word of the takeaway.
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
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, ICONS (colours, symbols, names, one-liners), the focus order, the headline and takeaway text and scoreSound(). Keep and reuse the style's helpers (makeGL(), the rounded-square extruded icon geometry with clearcoat glass, the coloured point lights, the float/focus/line-up motion in pose(), the frosted info card, the gradient background, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (500 to 900), JetBrains Mono (700).

THE STYLE
- Icons are real 3D: rounded squares extruded with a bevel, MeshPhysicalMaterial with clearcoat and slight transparency, each a different soft colour, with a simple white 3D symbol on the face. Never use a real app logo or brand; describe tool types.
- Background: a soft three-colour gradient (mint #c7f0e4, sky #c8dcff, peach #ffd9c7) painted in 2D behind a transparent WebGL canvas, lit by two coloured point lights for glassy highlights.
- One icon is in focus at a time: it swings to the centre, grows and faces the camera; the rest float smaller and dimmer behind it.
- Info card: frosted white (rgba white 0.7, white border) under the focused icon with a mono number, an Inter 800 name and one plain benefit line.
- Type: Inter 900 headline in near-black (#0f1a2a), second line blue (#2d5bff); JetBrains Mono for numbers and tags.
- Pace: icons arrive in the first 1.5 seconds, then one focus every 2 seconds, and the line-up holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 64 px or more, the card title at 48 px or more and card text at 28 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("5 AI tools that save hours (tool types, not brands)") unless my content asks for it.

SOUND
- Bed: a bright, airy pad with light hats.
- Map events to the kit: icons arriving get soft glassy pings; each focus gets a soft "whoosh" and a two-note glass chime (SND.chime) that climbs; card text gets a soft tick; the line-up gets a rising arpeggio and "shimmer".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark chimes and ticks soft: true and keep the whoosh quiet.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Glass Icons
Family: 3D
Look: Glossy translucent 3D app icons in Three.js, floating on a soft mint, sky and peach gradient, each with a white symbol on its face, frosted labels and a crisp black headline.
How it explains: The icons float in from depth into a loose stack, then one at a time an icon swings forward to the centre, turns to face you and gets a frosted card with its number, name and one-line benefit while the others dim back. The takeaway lines them all up in a row.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/glass-icons.html` (58.3 KB)
