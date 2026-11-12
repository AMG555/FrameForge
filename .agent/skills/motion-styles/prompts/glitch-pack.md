# Motion graphics style #55: Glitch Pack

- **ID:** `glitch-pack`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** Anton, JetBrains Mono (700)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
A digital-glitch toolkit: RGB-split titles in Anton, horizontal slice displacement, block noise in red and cyan, scanlines, a "SYSTEM REBOOT" terminal tag and glitch transitions that tear your footage apart and put it back together.

## How It Explains
The intro title glitches on (RGB split, slices, noise) and resolves crisp, then a glitch transition tears into your clip. Short glitch hits punctuate key words over the footage, and an outro glitch closes it with a version tag.

## Demo
A tech-channel intro and transitions ("NEW UPDATE")

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Glitch Pack" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, the title words, HITS (glitch accents over the footage), the tags and scoreSound(); load your clip with Load footage. Keep and reuse the style's helpers (footage(), the RGB split title, slice displacement from the canvas itself, block noise, scanlines and vignette, the glitch transition (tear in, tear out), the intensity curve glitchAt(t) and the mono tags).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, JetBrains Mono (700).

THE STYLE
- Glitch is a seasoning: intense for the intro, transitions and 2 to 4 accent words, otherwise your footage plays clean.
- RGB split: draw the title three times (red #ff0040, cyan #00ffd5 with lighter blending, then white) with offsets that follow glitchAt(t).
- Slices: copy horizontal bands of the canvas onto itself shifted left or right; block noise: small red, cyan and white rectangles.
- Scanlines every 3 px and a dark vignette on top; a small mono tag ("> SYSTEM REBOOT", "v2.0") in a corner.
- Respect photosensitivity: no full-frame white flashes faster than 3 a second.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the title at 140 px or more, accent words at 90 px or more and tags at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A tech-channel intro and transitions ("NEW UPDATE")") unless my content asks for it.

SOUND
- No music bed needed; the glitches are the sound.
- Map events to the kit: glitch moments get "glitch" plus bit-crushed square zaps; the title resolve gets "slam" and a low sub drop (a falling sine); transitions get "whoosh" with a "glitch"; tags get small beeps.
- Full mix (no voiceover): digital stutters, bit-crushed zaps and a low sub drop on the title and transitions.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Glitch Pack
Family: Edit Overlay
Look: A digital-glitch toolkit: RGB-split titles in Anton, horizontal slice displacement, block noise in red and cyan, scanlines, a "SYSTEM REBOOT" terminal tag and glitch transitions that tear your footage apart and put it back together.
How it explains: The intro title glitches on (RGB split, slices, noise) and resolves crisp, then a glitch transition tears into your clip. Short glitch hits punctuate key words over the footage, and an outro glitch closes it with a version tag.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Glitch Pack" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The title resolves on the first word, transitions hit on cuts, and each accent glitch lands on its stressed word for 0.2 to 0.4 seconds.
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
- Replace the demo's story: TL, the title words, HITS (glitch accents over the footage), the tags and scoreSound(); load your clip with Load footage. Keep and reuse the style's helpers (footage(), the RGB split title, slice displacement from the canvas itself, block noise, scanlines and vignette, the glitch transition (tear in, tear out), the intensity curve glitchAt(t) and the mono tags).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, JetBrains Mono (700).

THE STYLE
- Glitch is a seasoning: intense for the intro, transitions and 2 to 4 accent words, otherwise your footage plays clean.
- RGB split: draw the title three times (red #ff0040, cyan #00ffd5 with lighter blending, then white) with offsets that follow glitchAt(t).
- Slices: copy horizontal bands of the canvas onto itself shifted left or right; block noise: small red, cyan and white rectangles.
- Scanlines every 3 px and a dark vignette on top; a small mono tag ("> SYSTEM REBOOT", "v2.0") in a corner.
- Respect photosensitivity: no full-frame white flashes faster than 3 a second.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the title at 140 px or more, accent words at 90 px or more and tags at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A tech-channel intro and transitions ("NEW UPDATE")") unless my content asks for it.

SOUND
- No music bed needed; the glitches are the sound.
- Map events to the kit: glitch moments get "glitch" plus bit-crushed square zaps; the title resolve gets "slam" and a low sub drop (a falling sine); transitions get "whoosh" with a "glitch"; tags get small beeps.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep glitch sounds short and soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Glitch Pack
Family: Edit Overlay
Look: A digital-glitch toolkit: RGB-split titles in Anton, horizontal slice displacement, block noise in red and cyan, scanlines, a "SYSTEM REBOOT" terminal tag and glitch transitions that tear your footage apart and put it back together.
How it explains: The intro title glitches on (RGB split, slices, noise) and resolves crisp, then a glitch transition tears into your clip. Short glitch hits punctuate key words over the footage, and an outro glitch closes it with a version tag.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/glitch-pack.html` (55.5 KB)
