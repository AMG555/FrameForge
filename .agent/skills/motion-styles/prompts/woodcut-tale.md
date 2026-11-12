# Motion graphics style #61: Woodcut Tale

- **ID:** `woodcut-tale`
- **Family:** Character Story
- **Canvas:** `720x1280`
- **Fonts:** IM Fell English (regular and italic), IM Fell English SC
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A two-colour woodcut print come to life: cream paper, bold black ink shapes with white carved hatching inside them, a red second colour slightly out of register, ink speckle and paper grain, with old-style serif captions in a carved border.

## How It Explains
Each scene is a print: the hills, sun and characters are inked shapes with carved lines, moving at a stiff 8 frames a second like a printed flipbook. Scenes change with a quick paper wipe, captions sit in a carved panel, and the moral is printed in red at the end.

## Demo
The Tortoise and the Hare (an Aesop fable)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Woodcut Tale" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the characters (hare() and tortoise(): silhouettes, carve lines and walk cycles), the SCENES (landscape and staging), the captions and moral, and scoreSound(). Keep and reuse the style's helpers (the cream paper with speckle, black ink shapes with carve() hatching, the red layer with a small registration offset, the 8 fps stepped motion, the carved border panel for captions, the paper wipe between scenes and the IM Fell type).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: IM Fell English (regular and italic), IM Fell English SC.

THE STYLE
- Two inks only: black (#1a1410) and red (#b8322a) on cream paper (#efe6d2). The red layer is printed 3 px off register.
- Every inked shape is solid with white carved lines inside it (carve(): parallel or contour hatching clipped to the shape), and hills and skies use bands of carved lines, like a block print.
- Characters are strong silhouettes with a few carved details (fur lines, shell plates) and simple 2-pose walk or run cycles.
- Motion runs on an 8 fps clock with a tiny jitter, never smooth; scenes change with a paper wipe.
- Captions sit in a carved double-line border panel at the bottom in IM Fell English; the moral is printed in red small caps.
- Use public-domain fables and folk tales, or original stories.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep captions at 46 px or more, the moral at 60 px or more and characters at least 20% of the frame height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The Tortoise and the Hare (an Aesop fable)") unless my content asks for it.

SOUND
- Music: a simple folk tune on a plucked string (triangle plucks) with a drone.
- Map events to the kit: the tortoise's steps get soft wooden taps (SND.tap); the hare's run gets a fast scurry (quick soft ticks) and a "whoosh"; sleep gets a snore (a slow filtered noise swell); scene wipes get SND.paper; the finish gets a small fanfare (triangle arpeggio) and "shimmer".
- Full mix (no voiceover): a simple folk tune on a plucked instrument, wooden taps for steps, a fast scurry for the hare, a snore, and a fanfare at the finish.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Woodcut Tale
Family: Character Story
Look: A two-colour woodcut print come to life: cream paper, bold black ink shapes with white carved hatching inside them, a red second colour slightly out of register, ink speckle and paper grain, with old-style serif captions in a carved border.
How it explains: Each scene is a print: the hills, sun and characters are inked shapes with carved lines, moving at a stiff 8 frames a second like a printed flipbook. Scenes change with a quick paper wipe, captions sit in a carved panel, and the moral is printed in red at the end.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Woodcut Tale" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each scene starts on the first word of its sentence, character actions (dash, sleep, wake, cross the line) land on their verbs, and the moral prints on the last line.
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
- Replace the demo's story: TL, the characters (hare() and tortoise(): silhouettes, carve lines and walk cycles), the SCENES (landscape and staging), the captions and moral, and scoreSound(). Keep and reuse the style's helpers (the cream paper with speckle, black ink shapes with carve() hatching, the red layer with a small registration offset, the 8 fps stepped motion, the carved border panel for captions, the paper wipe between scenes and the IM Fell type).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: IM Fell English (regular and italic), IM Fell English SC.

THE STYLE
- Two inks only: black (#1a1410) and red (#b8322a) on cream paper (#efe6d2). The red layer is printed 3 px off register.
- Every inked shape is solid with white carved lines inside it (carve(): parallel or contour hatching clipped to the shape), and hills and skies use bands of carved lines, like a block print.
- Characters are strong silhouettes with a few carved details (fur lines, shell plates) and simple 2-pose walk or run cycles.
- Motion runs on an 8 fps clock with a tiny jitter, never smooth; scenes change with a paper wipe.
- Captions sit in a carved double-line border panel at the bottom in IM Fell English; the moral is printed in red small caps.
- Use public-domain fables and folk tales, or original stories.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep captions at 46 px or more, the moral at 60 px or more and characters at least 20% of the frame height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The Tortoise and the Hare (an Aesop fable)") unless my content asks for it.

SOUND
- Music: a simple folk tune on a plucked string (triangle plucks) with a drone.
- Map events to the kit: the tortoise's steps get soft wooden taps (SND.tap); the hare's run gets a fast scurry (quick soft ticks) and a "whoosh"; sleep gets a snore (a slow filtered noise swell); scene wipes get SND.paper; the finish gets a small fanfare (triangle arpeggio) and "shimmer".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the tune low and mark taps soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Woodcut Tale
Family: Character Story
Look: A two-colour woodcut print come to life: cream paper, bold black ink shapes with white carved hatching inside them, a red second colour slightly out of register, ink speckle and paper grain, with old-style serif captions in a carved border.
How it explains: Each scene is a print: the hills, sun and characters are inked shapes with carved lines, moving at a stiff 8 frames a second like a printed flipbook. Scenes change with a quick paper wipe, captions sit in a carved panel, and the moral is printed in red at the end.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/woodcut-tale.html` (60.6 KB)
