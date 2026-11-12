# Motion graphics style #25: Zine Collage

- **ID:** `zine-collage`
- **Family:** Illustrated
- **Canvas:** `720x1280`
- **Fonts:** Anton, Archivo Black, Bangers, Playfair Display 900, Special Elite, Caveat 700 (mixed like ransom-note letters)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A DIY zine on kraft paper: torn pink and black paper, halftone cutouts drawn in code, ransom-note letters each in a different font and colour, translucent tape strips and handwritten notes, all slapped on at a jittery 8 frames a second.

## How It Explains
Pieces are slapped onto the page one after another like someone building a collage live: torn paper, a halftone object, tape, then the title drops in letter by letter. Each fact arrives as a new torn scrap or sticker with a slap and a little shake.

## Demo
The rise of vinyl

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Zine Collage" style (Illustrated) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the halftone subject (drawRecord or your own halftoneShape), the ransom title text, SCRAPS (fact cards and their text), the takeaway and scoreSound(). Keep and reuse the style's helpers (the kraft paper texture, torn() edges, the halftone dot renderer, ransom() letter boxes, tape(), the 8 fps slap timing (slapT) with jitter, the shadows and the Caveat handwriting).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Archivo Black, Bangers, Playfair Display 900, Special Elite, Caveat 700 (mixed like ransom-note letters).

THE STYLE
- Background: kraft paper (#e2d2b2) with speckles. Pieces are torn shapes (jagged edges from torn()) in hot pink (#ff5c8a), black, white and yellow, each with a short drop shadow.
- The subject is drawn as a halftone: a dot grid whose dot size follows a brightness function of your shape (here a record with grooves and a red label). No photos.
- Ransom-note titles: each letter in its own box with a random font (Anton, Playfair Display, Special Elite, Archivo Black, Bangers), colour pair and small rotation, all seeded so it never changes between frames.
- Timing is stop-motion: pieces appear on an 8 fps clock (slapT) with a 1 to 2 px jitter, and each slap lands with a tiny overshoot.
- Use real, checked facts on the scraps, and handwriting (Caveat) for the personal aside.
- Pace: a new piece every 0.3 to 0.8 seconds, a fact scrap every 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep ransom letters at 48 px or more, scrap text at 30 px or more and handwriting at 38 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The rise of vinyl") unless my content asks for it.

SOUND
- Music: a lo-fi hip-hop beat (soft kick, dusty snare, closed hats) with constant vinyl crackle on top.
- Map events to the kit: every piece gets a paper slap (a short noise burst plus SND.tap); tape gets a rip (a rising band-pass noise sweep); letters get tiny ticks; the record gets a needle drop (a soft thud and crackle swell).
- Full mix (no voiceover): keep the lo-fi beat with vinyl crackle, a paper slap for every piece and a tape rip for every tape strip.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Zine Collage
Family: Illustrated
Look: A DIY zine on kraft paper: torn pink and black paper, halftone cutouts drawn in code, ransom-note letters each in a different font and colour, translucent tape strips and handwritten notes, all slapped on at a jittery 8 frames a second.
How it explains: Pieces are slapped onto the page one after another like someone building a collage live: torn paper, a halftone object, tape, then the title drops in letter by letter. Each fact arrives as a new torn scrap or sticker with a slap and a little shake.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Zine Collage" style (Illustrated) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each scrap slaps down on the first word of its fact, the title letters drop while the title is said, and the halftone subject lands on its name.
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
- Replace the demo's story: TL, the halftone subject (drawRecord or your own halftoneShape), the ransom title text, SCRAPS (fact cards and their text), the takeaway and scoreSound(). Keep and reuse the style's helpers (the kraft paper texture, torn() edges, the halftone dot renderer, ransom() letter boxes, tape(), the 8 fps slap timing (slapT) with jitter, the shadows and the Caveat handwriting).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Archivo Black, Bangers, Playfair Display 900, Special Elite, Caveat 700 (mixed like ransom-note letters).

THE STYLE
- Background: kraft paper (#e2d2b2) with speckles. Pieces are torn shapes (jagged edges from torn()) in hot pink (#ff5c8a), black, white and yellow, each with a short drop shadow.
- The subject is drawn as a halftone: a dot grid whose dot size follows a brightness function of your shape (here a record with grooves and a red label). No photos.
- Ransom-note titles: each letter in its own box with a random font (Anton, Playfair Display, Special Elite, Archivo Black, Bangers), colour pair and small rotation, all seeded so it never changes between frames.
- Timing is stop-motion: pieces appear on an 8 fps clock (slapT) with a 1 to 2 px jitter, and each slap lands with a tiny overshoot.
- Use real, checked facts on the scraps, and handwriting (Caveat) for the personal aside.
- Pace: a new piece every 0.3 to 0.8 seconds, a fact scrap every 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep ransom letters at 48 px or more, scrap text at 30 px or more and handwriting at 38 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The rise of vinyl") unless my content asks for it.

SOUND
- Music: a lo-fi hip-hop beat (soft kick, dusty snare, closed hats) with constant vinyl crackle on top.
- Map events to the kit: every piece gets a paper slap (a short noise burst plus SND.tap); tape gets a rip (a rising band-pass noise sweep); letters get tiny ticks; the record gets a needle drop (a soft thud and crackle swell).
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded, which keeps the beat low. Mark slaps and rips soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Zine Collage
Family: Illustrated
Look: A DIY zine on kraft paper: torn pink and black paper, halftone cutouts drawn in code, ransom-note letters each in a different font and colour, translucent tape strips and handwritten notes, all slapped on at a jittery 8 frames a second.
How it explains: Pieces are slapped onto the page one after another like someone building a collage live: torn paper, a halftone object, tape, then the title drops in letter by letter. Each fact arrives as a new torn scrap or sticker with a slap and a little shake.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/zine-collage.html` (59.7 KB)
