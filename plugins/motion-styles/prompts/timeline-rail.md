# Motion graphics style #28: Timeline Rail

- **ID:** `timeline-rail`
- **Family:** Data
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Space Grotesk (700), Inter (600 and 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A deep green page with a cream vertical rail: glowing year nodes, cream event cards with a big gold year and a small drawn icon, and a running year odometer in the corner, as the camera scrolls down through time.

## How It Explains
The camera scrolls down the rail like a feed. As it reaches each year the node lights up, the odometer rolls to that year and the card drops in with its icon. The last card is the present, and the takeaway closes the story.

## Demo
The phone in 150 years

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Timeline Rail" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, EVENTS (year, text, icon painter), the scroll keys, the headline, the takeaway and scoreSound(). Keep and reuse the style's helpers (the long content layer with the rail, nodes and cards, the scroll camera, the drop-in card motion, the year odometer, the icon painter approach (small flat icons in the page colour), wordLine() and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Space Grotesk (700), Inter (600 and 700).

THE STYLE
- One long vertical page (a content layer taller than the screen) in deep green (#0f2a24) with a cream rail (#e8dcc0) down the left. The camera scrolls down it; no cuts.
- Each event is a cream card (#f3ead7) with rounded corners, a big gold year (#e8b04b) in Space Grotesk, one short line of text and a small flat icon drawn in code in the page colour.
- The current node glows gold; past nodes stay filled, future nodes stay hollow.
- A year odometer in the top-right rolls between events (digits slide), always showing the year the camera is at.
- Use real dates and real firsts; keep each card to one line of fact.
- Pace: about 2 seconds per card, including the scroll.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep years at 52 px or more, card text at 26 px or more and the headline at 64 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The phone in 150 years") unless my content asks for it.

SOUND
- Bed: a warm pad with a soft clock-like pulse.
- Map events to the kit: each scroll gets a soft "whoosh"; the odometer gets fast ticks while it rolls; each card gets a soft thud as it lands and a chime; the takeaway gets an open chord.
- Full mix (no voiceover): a ticking pad, a soft whoosh for each scroll, a tick for the odometer and a chime per card.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Timeline Rail
Family: Data
Look: A deep green page with a cream vertical rail: glowing year nodes, cream event cards with a big gold year and a small drawn icon, and a running year odometer in the corner, as the camera scrolls down through time.
How it explains: The camera scrolls down the rail like a feed. As it reaches each year the node lights up, the odometer rolls to that year and the card drops in with its icon. The last card is the present, and the takeaway closes the story.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Timeline Rail" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The camera reaches each card and its year as the year is said; the card text lands on the event.
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
- Replace the demo's story: TL, EVENTS (year, text, icon painter), the scroll keys, the headline, the takeaway and scoreSound(). Keep and reuse the style's helpers (the long content layer with the rail, nodes and cards, the scroll camera, the drop-in card motion, the year odometer, the icon painter approach (small flat icons in the page colour), wordLine() and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Space Grotesk (700), Inter (600 and 700).

THE STYLE
- One long vertical page (a content layer taller than the screen) in deep green (#0f2a24) with a cream rail (#e8dcc0) down the left. The camera scrolls down it; no cuts.
- Each event is a cream card (#f3ead7) with rounded corners, a big gold year (#e8b04b) in Space Grotesk, one short line of text and a small flat icon drawn in code in the page colour.
- The current node glows gold; past nodes stay filled, future nodes stay hollow.
- A year odometer in the top-right rolls between events (digits slide), always showing the year the camera is at.
- Use real dates and real firsts; keep each card to one line of fact.
- Pace: about 2 seconds per card, including the scroll.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep years at 52 px or more, card text at 26 px or more and the headline at 64 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The phone in 150 years") unless my content asks for it.

SOUND
- Bed: a warm pad with a soft clock-like pulse.
- Map events to the kit: each scroll gets a soft "whoosh"; the odometer gets fast ticks while it rolls; each card gets a soft thud as it lands and a chime; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark ticks and chimes soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Timeline Rail
Family: Data
Look: A deep green page with a cream vertical rail: glowing year nodes, cream event cards with a big gold year and a small drawn icon, and a running year odometer in the corner, as the camera scrolls down through time.
How it explains: The camera scrolls down the rail like a feed. As it reaches each year the node lights up, the odometer rolls to that year and the card drops in with its icon. The last card is the present, and the takeaway closes the story.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/timeline-rail.html` (57.5 KB)
