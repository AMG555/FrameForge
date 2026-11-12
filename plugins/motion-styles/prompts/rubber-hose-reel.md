# Motion graphics style #60: Rubber Hose Reel

- **ID:** `rubber-hose-reel`
- **Family:** Character Story
- **Canvas:** `720x1280`
- **Fonts:** Limelight, Special Elite
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A 1930s black-and-white cartoon: an original rubber-hose character with noodle limbs, pie-cut eyes and white gloves bouncing on the beat, on a grey painted set, with film flicker, dust, scratches, a gate weave and art-deco title cards.

## How It Explains
The whole short bounces to the music: the character and even the props squash and stretch on every beat. Title cards in an art-deco frame open each act, the gag builds in three beats with exaggerated takes (eyes pop, jaw drops), and an iris closes on THE END.

## Demo
The cat who hated Mondays (original character)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Rubber Hose Reel" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the character (drawCat: body, head shape, face), the props and set, the gag beats (ACTS and their poses), the title card text and scoreSound(). Keep and reuse the style's helpers (the rubber-hose limb renderer (bezier noodle limbs with white gloves and big shoes), the pie-cut eyes, the on-beat bounce (BEAT), squash and stretch, the grey painted set, film flicker, dust, scratches and gate weave, the art-deco title card and the THE END iris).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Limelight, Special Elite.

THE STYLE
- An original character only (never Mickey, Felix, Bimbo, Cuphead or any studio character): a round body, noodle limbs drawn as thick bezier hoses with white four-finger gloves and big round shoes, and pie-cut eyes.
- Everything bounces on the beat (BEAT seconds): characters, props, even the furniture squash and stretch in time.
- Black, white and greys only, painted with soft gradients; on top: flicker (frame-to-frame brightness), dust specks, vertical scratches, a gentle gate weave and a strong vignette.
- Title cards: an art-deco double frame with corner fans, Limelight lettering, on black.
- Takes are big: eyes pop out on stalks, jaw drops, hat flies off, motion lines and impact stars.
- End with a black iris closing on the character and a THE END card.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep title cards at 70 px or more and caption cards at 36 px or more; keep the character at least 40% of the frame height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The cat who hated Mondays (original character)") unless my content asks for it.

SOUND
- Music: a ragtime loop: oom-pah bass on 1 and 3, stride chords on 2 and 4 (square or triangle), and a simple honky melody.
- Map events to the kit: jumps get a slide whistle (a rising then falling sine); bonks get a boing; the big gag gets a cymbal crash (bright noise) and "boom"; title cards get a projector clatter; the iris gets a short descending run.
- Full mix (no voiceover): a ragtime loop (oom-pah bass, stride chords, a honky melody), slide whistle, boings, a cymbal crash for the big gag, and projector clatter underneath.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Rubber Hose Reel
Family: Character Story
Look: A 1930s black-and-white cartoon: an original rubber-hose character with noodle limbs, pie-cut eyes and white gloves bouncing on the beat, on a grey painted set, with film flicker, dust, scratches, a gate weave and art-deco title cards.
How it explains: The whole short bounces to the music: the character and even the props squash and stretch on every beat. Title cards in an art-deco frame open each act, the gag builds in three beats with exaggerated takes (eyes pop, jaw drops), and an iris closes on THE END.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Rubber Hose Reel" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Every bounce sits on the music beat; the takes (eyes popping, jaw drop) land on the punch words, and title cards appear in pauses.
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
- Replace the demo's story: TL, the character (drawCat: body, head shape, face), the props and set, the gag beats (ACTS and their poses), the title card text and scoreSound(). Keep and reuse the style's helpers (the rubber-hose limb renderer (bezier noodle limbs with white gloves and big shoes), the pie-cut eyes, the on-beat bounce (BEAT), squash and stretch, the grey painted set, film flicker, dust, scratches and gate weave, the art-deco title card and the THE END iris).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Limelight, Special Elite.

THE STYLE
- An original character only (never Mickey, Felix, Bimbo, Cuphead or any studio character): a round body, noodle limbs drawn as thick bezier hoses with white four-finger gloves and big round shoes, and pie-cut eyes.
- Everything bounces on the beat (BEAT seconds): characters, props, even the furniture squash and stretch in time.
- Black, white and greys only, painted with soft gradients; on top: flicker (frame-to-frame brightness), dust specks, vertical scratches, a gentle gate weave and a strong vignette.
- Title cards: an art-deco double frame with corner fans, Limelight lettering, on black.
- Takes are big: eyes pop out on stalks, jaw drops, hat flies off, motion lines and impact stars.
- End with a black iris closing on the character and a THE END card.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep title cards at 70 px or more and caption cards at 36 px or more; keep the character at least 40% of the frame height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The cat who hated Mondays (original character)") unless my content asks for it.

SOUND
- Music: a ragtime loop: oom-pah bass on 1 and 3, stride chords on 2 and 4 (square or triangle), and a simple honky melody.
- Map events to the kit: jumps get a slide whistle (a rising then falling sine); bonks get a boing; the big gag gets a cymbal crash (bright noise) and "boom"; title cards get a projector clatter; the iris gets a short descending run.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the ragtime low; keep the slide whistle and boings.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Rubber Hose Reel
Family: Character Story
Look: A 1930s black-and-white cartoon: an original rubber-hose character with noodle limbs, pie-cut eyes and white gloves bouncing on the beat, on a grey painted set, with film flicker, dust, scratches, a gate weave and art-deco title cards.
How it explains: The whole short bounces to the music: the character and even the props squash and stretch on every beat. Title cards in an art-deco frame open each act, the gag builds in three beats with exaggerated takes (eyes pop, jaw drops), and an iris closes on THE END.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/rubber-hose-reel.html` (63.8 KB)
