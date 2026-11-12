# Motion graphics style #24: Blueprint

- **ID:** `blueprint`
- **Family:** Hand-Drawn
- **Canvas:** `720x1280`
- **Fonts:** Space Grotesk (700), JetBrains Mono (500 and 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A technical drawing on blueprint blue: pale line work on a fine grid, dimension lines with arrowheads, a dashed yellow reference line, mono callouts and a title block in the corner, with the mechanism actually moving.

## How It Explains
The drawing inks itself in, then the mechanism runs: a part slides in and every other part reacts the way it really would. A yellow line or highlight shows the moment it works, a wrong version shows why it fails, and the title block holds the takeaway.

## Demo
How a pin tumbler lock works

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Blueprint" style (Hand-Drawn) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the mechanism geometry (PINS, CUTS, the housing and key profile in keyY()), the callouts, the wrong-version beat, the takeaway in the title block and scoreSound(). Keep and reuse the style's helpers (the blueprint grid, line(), the ink-in reveal, dim() dimension lines, the dashed yellow reference line, callout() mono labels on leaders, the corner title block, the moving-mechanism approach (positions computed from the driving part)).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (700), JetBrains Mono (500 and 700).

THE STYLE
- Background: blueprint blue (#0d3a6e) with a fine 12 px grid and a 60 px major grid. All line work is pale (#d8eeff), 2 px, with no fills except faint hatching.
- Draw the real mechanism with correct proportions and part names. Compute every moving part from the part that drives it (here each pin height comes from the key profile under it), so the motion is physically right.
- Yellow (#ffd75e) is only for the critical reference (a dashed line or a highlight) and the success state; red (#ff6b6b) only for a failure.
- Dimension lines with arrowheads and mono measurements; callouts in JetBrains Mono on thin leader lines; a title block in the bottom-right corner with sheet number and scale.
- Type: Space Grotesk 700 headline at the top (white, second line pale blue).
- Pace: ink-in about 2 seconds, then the mechanism in 2 to 3 seconds, the success beat, the failure beat, and the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, callouts at 22 px or more and dimension text at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How a pin tumbler lock works") unless my content asks for it.

SOUND
- Bed: a soft, steady pad with a slow pulse.
- Map events to the kit: line work gets drafting-pen scratches (SND.scratch); each part that lifts or drops gets a small metallic click; success gets a two-note chime and "click"; failure gets a dull thud; the takeaway gets an open chord.
- Full mix (no voiceover): drafting-pen scratches during the ink-in, a metallic click for every part that moves, and a soft pad.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Blueprint
Family: Hand-Drawn
Look: A technical drawing on blueprint blue: pale line work on a fine grid, dimension lines with arrowheads, a dashed yellow reference line, mono callouts and a title block in the corner, with the mechanism actually moving.
How it explains: The drawing inks itself in, then the mechanism runs: a part slides in and every other part reacts the way it really would. A yellow line or highlight shows the moment it works, a wrong version shows why it fails, and the title block holds the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Blueprint" style (Hand-Drawn) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The drawing inks in during the intro sentence, the driving part moves while its action is described, the highlight lands on the word that says it works, and the wrong version appears on "but" or "if".
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
- Replace the demo's story: TL, the mechanism geometry (PINS, CUTS, the housing and key profile in keyY()), the callouts, the wrong-version beat, the takeaway in the title block and scoreSound(). Keep and reuse the style's helpers (the blueprint grid, line(), the ink-in reveal, dim() dimension lines, the dashed yellow reference line, callout() mono labels on leaders, the corner title block, the moving-mechanism approach (positions computed from the driving part)).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (700), JetBrains Mono (500 and 700).

THE STYLE
- Background: blueprint blue (#0d3a6e) with a fine 12 px grid and a 60 px major grid. All line work is pale (#d8eeff), 2 px, with no fills except faint hatching.
- Draw the real mechanism with correct proportions and part names. Compute every moving part from the part that drives it (here each pin height comes from the key profile under it), so the motion is physically right.
- Yellow (#ffd75e) is only for the critical reference (a dashed line or a highlight) and the success state; red (#ff6b6b) only for a failure.
- Dimension lines with arrowheads and mono measurements; callouts in JetBrains Mono on thin leader lines; a title block in the bottom-right corner with sheet number and scale.
- Type: Space Grotesk 700 headline at the top (white, second line pale blue).
- Pace: ink-in about 2 seconds, then the mechanism in 2 to 3 seconds, the success beat, the failure beat, and the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, callouts at 22 px or more and dimension text at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How a pin tumbler lock works") unless my content asks for it.

SOUND
- Bed: a soft, steady pad with a slow pulse.
- Map events to the kit: line work gets drafting-pen scratches (SND.scratch); each part that lifts or drops gets a small metallic click; success gets a two-note chime and "click"; failure gets a dull thud; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark scratches and clicks soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Blueprint
Family: Hand-Drawn
Look: A technical drawing on blueprint blue: pale line work on a fine grid, dimension lines with arrowheads, a dashed yellow reference line, mono callouts and a title block in the corner, with the mechanism actually moving.
How it explains: The drawing inks itself in, then the mechanism runs: a part slides in and every other part reacts the way it really would. A yellow line or highlight shows the moment it works, a wrong version shows why it fails, and the title block holds the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/blueprint.html` (61.0 KB)
