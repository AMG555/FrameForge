# Motion graphics style #35: Math Canvas

- **ID:** `math-canvas`
- **Family:** Data
- **Canvas:** `720x1280`
- **Fonts:** Instrument Serif (italic, for maths), Space Grotesk (700), JetBrains Mono (500), Caveat (700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A dark slate for maths: an equation written in an elegant italic serif, a yellow box and handwritten note on the key term, and a graph whose curve plots itself to scale with a glowing dot and a live value, beside a dashed comparison line.

## How It Explains
The equation writes on term by term, the key term gets boxed and annotated, then the axes draw and the curve plots in real time with its value counting at the tip. The comparison line plots alongside, a bracket measures the gap, and a plain-language takeaway lands at the bottom.

## Demo
Compound interest: slow, then suddenly fast

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Math Canvas" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the equation pieces (EQ), the function f(x) and the comparison g(x), the axis ranges and ticks, the labels, the gap note, the takeaway and scoreSound(). Keep and reuse the style's helpers (the slate grid, the term-by-term equation write-on, the yellow key box with the Caveat note, the axes with one scale, the self-plotting curve with area fill, glowing tip and live value, the dashed comparison, the gap bracket, and the mono axis labels).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (italic, for maths), Space Grotesk (700), JetBrains Mono (500), Caveat (700).

THE STYLE
- Background: dark slate (#12141b) with a faint 20 px grid. Maths is written in Instrument Serif italic (white), never in a sans.
- Plot real functions with one scale per axis, zero-based unless the scene says otherwise, and compute every point from the function. Tick labels must name values the axes actually reach.
- Colour has meaning: teal (#4fd1c5) for the main curve and its glowing tip, grey dashed (#6b7080) for the comparison, yellow (#ffd166) only for the key term box, the handwritten note and the gap bracket.
- The curve plots left to right over a few seconds with a soft area fill under it and the live value riding at its tip.
- Type: Space Grotesk 700 for the takeaway, JetBrains Mono for axis labels and captions, Caveat 700 for handwritten notes.
- Pace: equation about 2 seconds, axes 0.5 seconds, the plot 4 to 5 seconds, then the gap and the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the equation at 60 px or more, the takeaway at 46 px or more, live values at 30 px or more and axis labels at 18 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Compound interest: slow, then suddenly fast") unless my content asks for it.

SOUND
- Bed: a calm, slow pad.
- Map events to the kit: each equation term gets a soft chalky tick; the key box gets "marker"; the plot gets a soft pluck at each tick on the x axis whose pitch climbs with the value; the gap bracket gets a low sine hit; the takeaway gets an open chord.
- Full mix (no voiceover): a calm pad, a soft pluck for every unit the curve passes (rising in pitch with the value), and a low hit when the gap bracket lands.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Math Canvas
Family: Data
Look: A dark slate for maths: an equation written in an elegant italic serif, a yellow box and handwritten note on the key term, and a graph whose curve plots itself to scale with a glowing dot and a live value, beside a dashed comparison line.
How it explains: The equation writes on term by term, the key term gets boxed and annotated, then the axes draw and the curve plots in real time with its value counting at the tip. The comparison line plots alongside, a bracket measures the gap, and a plain-language takeaway lands at the bottom.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Math Canvas" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each term writes as it is said, the box lands on the term that matters, the curve plots while the change over time is described, and the gap bracket lands on the comparison word.
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
- Replace the demo's story: TL, the equation pieces (EQ), the function f(x) and the comparison g(x), the axis ranges and ticks, the labels, the gap note, the takeaway and scoreSound(). Keep and reuse the style's helpers (the slate grid, the term-by-term equation write-on, the yellow key box with the Caveat note, the axes with one scale, the self-plotting curve with area fill, glowing tip and live value, the dashed comparison, the gap bracket, and the mono axis labels).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (italic, for maths), Space Grotesk (700), JetBrains Mono (500), Caveat (700).

THE STYLE
- Background: dark slate (#12141b) with a faint 20 px grid. Maths is written in Instrument Serif italic (white), never in a sans.
- Plot real functions with one scale per axis, zero-based unless the scene says otherwise, and compute every point from the function. Tick labels must name values the axes actually reach.
- Colour has meaning: teal (#4fd1c5) for the main curve and its glowing tip, grey dashed (#6b7080) for the comparison, yellow (#ffd166) only for the key term box, the handwritten note and the gap bracket.
- The curve plots left to right over a few seconds with a soft area fill under it and the live value riding at its tip.
- Type: Space Grotesk 700 for the takeaway, JetBrains Mono for axis labels and captions, Caveat 700 for handwritten notes.
- Pace: equation about 2 seconds, axes 0.5 seconds, the plot 4 to 5 seconds, then the gap and the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the equation at 60 px or more, the takeaway at 46 px or more, live values at 30 px or more and axis labels at 18 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Compound interest: slow, then suddenly fast") unless my content asks for it.

SOUND
- Bed: a calm, slow pad.
- Map events to the kit: each equation term gets a soft chalky tick; the key box gets "marker"; the plot gets a soft pluck at each tick on the x axis whose pitch climbs with the value; the gap bracket gets a low sine hit; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark plucks soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Math Canvas
Family: Data
Look: A dark slate for maths: an equation written in an elegant italic serif, a yellow box and handwritten note on the key term, and a graph whose curve plots itself to scale with a glowing dot and a live value, beside a dashed comparison line.
How it explains: The equation writes on term by term, the key term gets boxed and annotated, then the axes draw and the curve plots in real time with its value counting at the tip. The comparison line plots alongside, a bracket measures the gap, and a plain-language takeaway lands at the bottom.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/math-canvas.html` (58.0 KB)
