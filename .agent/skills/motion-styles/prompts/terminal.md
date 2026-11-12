# Motion graphics style #33: Terminal

- **ID:** `terminal`
- **Family:** Retro
- **Canvas:** `720x1280`
- **Fonts:** JetBrains Mono (500 and 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A glowing green-on-black terminal: typed commands with a block cursor, dim grey output, red and amber warnings, an ASCII progress bar and ASCII box diagrams, with scanlines, a soft phosphor glow and a dark vignette.

## How It Explains
The story is a terminal session: a command types itself, output scrolls out line by line, a progress bar or counter runs, and the result lands in red or amber. A second command shows the contrast, and an ASCII comparison box sums it up.

## Demo
Why 'password123' fails in 0.02 seconds

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Terminal" style (Retro) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL and SESSION (each line: its time, whether it is typed or printed, its text and its colour), the progress bar or counter, the ASCII box and the takeaway, and scoreSound(). Keep and reuse the style's helpers (the black screen with phosphor glow, the line-by-line session renderer with typed commands and printed output, the block cursor, the ASCII progress bar, scanlines and vignette, and the colour rules).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: JetBrains Mono (500 and 700).

THE STYLE
- Black screen (#040805), JetBrains Mono everywhere. Commands are bright green (#3dff7f) with a "$" prompt; output is dim green (#1f8f47); warnings amber (#ffcf4d); failures red (#ff5f56); white only for the takeaway.
- Text glows softly (a green shadow blur). Scanlines every 3 px and a dark vignette sit on top.
- Commands type at about 28 characters a second; output lines print instantly one after another; a blinking block cursor sits after the last character.
- Progress and comparisons are ASCII: [#####.....] bars, box-drawing tables. No icons or images.
- Teach safely: show how to defend (stronger passwords, updates, two-factor), never step-by-step instructions for attacking real systems.
- Pace: a command every 2 to 3 seconds; the result line holds at least 1 second.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep command text at 24 px or more, the headline at 36 px or more and the takeaway at 34 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Why 'password123' fails in 0.02 seconds") unless my content asks for it.

SOUND
- Bed: a low electrical hum and a quiet dark pad.
- Map events to the kit: typed commands get "keys"; each printed line gets a soft short beep (SND.beep); a bad result gets a two-tone alarm; a good result gets a rising confirm beep; the takeaway gets a low swell.
- Full mix (no voiceover): keyboard typing, a hum, short beeps for output, an alarm tone for the bad result and a confirm tone for the good one.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Terminal
Family: Retro
Look: A glowing green-on-black terminal: typed commands with a block cursor, dim grey output, red and amber warnings, an ASCII progress bar and ASCII box diagrams, with scanlines, a soft phosphor glow and a dark vignette.
How it explains: The story is a terminal session: a command types itself, output scrolls out line by line, a progress bar or counter runs, and the result lands in red or amber. A second command shows the contrast, and an ASCII comparison box sums it up.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Terminal" style (Retro) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each command types while it is described, output prints on the word it reports, and the result line lands on the stressed word.
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
- Replace the demo's story: TL and SESSION (each line: its time, whether it is typed or printed, its text and its colour), the progress bar or counter, the ASCII box and the takeaway, and scoreSound(). Keep and reuse the style's helpers (the black screen with phosphor glow, the line-by-line session renderer with typed commands and printed output, the block cursor, the ASCII progress bar, scanlines and vignette, and the colour rules).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: JetBrains Mono (500 and 700).

THE STYLE
- Black screen (#040805), JetBrains Mono everywhere. Commands are bright green (#3dff7f) with a "$" prompt; output is dim green (#1f8f47); warnings amber (#ffcf4d); failures red (#ff5f56); white only for the takeaway.
- Text glows softly (a green shadow blur). Scanlines every 3 px and a dark vignette sit on top.
- Commands type at about 28 characters a second; output lines print instantly one after another; a blinking block cursor sits after the last character.
- Progress and comparisons are ASCII: [#####.....] bars, box-drawing tables. No icons or images.
- Teach safely: show how to defend (stronger passwords, updates, two-factor), never step-by-step instructions for attacking real systems.
- Pace: a command every 2 to 3 seconds; the result line holds at least 1 second.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep command text at 24 px or more, the headline at 36 px or more and the takeaway at 34 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Why 'password123' fails in 0.02 seconds") unless my content asks for it.

SOUND
- Bed: a low electrical hum and a quiet dark pad.
- Map events to the kit: typed commands get "keys"; each printed line gets a soft short beep (SND.beep); a bad result gets a two-tone alarm; a good result gets a rising confirm beep; the takeaway gets a low swell.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep keys soft: true and the hum very low.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Terminal
Family: Retro
Look: A glowing green-on-black terminal: typed commands with a block cursor, dim grey output, red and amber warnings, an ASCII progress bar and ASCII box diagrams, with scanlines, a soft phosphor glow and a dark vignette.
How it explains: The story is a terminal session: a command types itself, output scrolls out line by line, a progress bar or counter runs, and the result lands in red or amber. A second command shows the contrast, and an ASCII comparison box sums it up.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/terminal.html` (55.9 KB)
