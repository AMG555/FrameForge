# Motion graphics style #56: Doc Cinema

- **ID:** `doc-cinema`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** Instrument Serif (regular and italic), Inter (600), JetBrains Mono (500)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
Mini-documentary finishing: letterbox bars, heavy film grain, a warm-cool grade, slow Ken Burns push-ins, big serif chapter titles centred in the frame, and a small mono location and date stamp in the corner.

## How It Explains
Each chapter opens with a slow push-in and the title fading up letter-spaced in the centre, a location stamp types in at the bottom, then the title clears for the story. A soft cross-dissolve leads to the next chapter, and the end card holds in silence.

## Demo
The last lighthouse keeper (an invented short doc)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Doc Cinema" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, CHAPTERS (label, title lines, location and date, the still or shot used), the end card and scoreSound(); load your clip or stills with Load footage. Keep and reuse the style's helpers (the letterbox bars, grain and vignette, the grade pass, the Ken Burns push on every shot, the centred chapter title fade with a tracked label, the typed location stamp and the cross-dissolve between chapters).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (regular and italic), Inter (600), JetBrains Mono (500).

THE STYLE
- Built for your footage or stills: footage() fills the frame behind the bars (your clip when loaded; an illustrated stand-in scene until then). Every shot gets a slow push-in of 4 to 8%.
- Letterbox bars top and bottom (about 6% of the height each), heavy grain (stepped at 24 fps), a vignette and a slight warm highlight / cool shadow grade.
- Chapter cards: a tracked Inter 600 label ("CHAPTER ONE") and a centred Instrument Serif title, the second line in italic, fading up with a slow rise; they clear before the story continues.
- Location stamps: JetBrains Mono, small, bottom left, typed on.
- For real stories use real places and dates; invented stories must not look like real archive footage.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep chapter titles at 64 px or more, the chapter label at 20 px or more and the stamp at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The last lighthouse keeper (an invented short doc)") unless my content asks for it.

SOUND
- Bed: a slow, low drone with room tone; long silences are part of the style.
- Map events to the kit: each chapter title gets one soft piano-like note with long reverb; stamps get very soft typewriter "keys"; dissolves get a slow airy swell; the end card gets a low final note.
- Full mix (no voiceover): a slow, low drone and a soft piano note for each chapter title, plus room tone; leave plenty of silence.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Doc Cinema
Family: Edit Overlay
Look: Mini-documentary finishing: letterbox bars, heavy film grain, a warm-cool grade, slow Ken Burns push-ins, big serif chapter titles centred in the frame, and a small mono location and date stamp in the corner.
How it explains: Each chapter opens with a slow push-in and the title fading up letter-spaced in the centre, a location stamp types in at the bottom, then the title clears for the story. A soft cross-dissolve leads to the next chapter, and the end card holds in silence.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Doc Cinema" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each chapter title fades in during the pause before the narration starts that chapter, and the location stamp types on the first mention of the place.
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
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, CHAPTERS (label, title lines, location and date, the still or shot used), the end card and scoreSound(); load your clip or stills with Load footage. Keep and reuse the style's helpers (the letterbox bars, grain and vignette, the grade pass, the Ken Burns push on every shot, the centred chapter title fade with a tracked label, the typed location stamp and the cross-dissolve between chapters).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (regular and italic), Inter (600), JetBrains Mono (500).

THE STYLE
- Built for your footage or stills: footage() fills the frame behind the bars (your clip when loaded; an illustrated stand-in scene until then). Every shot gets a slow push-in of 4 to 8%.
- Letterbox bars top and bottom (about 6% of the height each), heavy grain (stepped at 24 fps), a vignette and a slight warm highlight / cool shadow grade.
- Chapter cards: a tracked Inter 600 label ("CHAPTER ONE") and a centred Instrument Serif title, the second line in italic, fading up with a slow rise; they clear before the story continues.
- Location stamps: JetBrains Mono, small, bottom left, typed on.
- For real stories use real places and dates; invented stories must not look like real archive footage.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep chapter titles at 64 px or more, the chapter label at 20 px or more and the stamp at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The last lighthouse keeper (an invented short doc)") unless my content asks for it.

SOUND
- Bed: a slow, low drone with room tone; long silences are part of the style.
- Map events to the kit: each chapter title gets one soft piano-like note with long reverb; stamps get very soft typewriter "keys"; dissolves get a slow airy swell; the end card gets a low final note.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the drone very low.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Doc Cinema
Family: Edit Overlay
Look: Mini-documentary finishing: letterbox bars, heavy film grain, a warm-cool grade, slow Ken Burns push-ins, big serif chapter titles centred in the frame, and a small mono location and date stamp in the corner.
How it explains: Each chapter opens with a slow push-in and the title fading up letter-spaced in the centre, a location stamp types in at the bottom, then the title clears for the story. A soft cross-dissolve leads to the next chapter, and the end card holds in silence.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/doc-cinema.html` (56.7 KB)
