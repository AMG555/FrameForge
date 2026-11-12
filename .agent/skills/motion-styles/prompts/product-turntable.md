# Motion graphics style #21: Product Turntable

- **ID:** `product-turntable`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Instrument Serif (italic), Inter (500 to 800), JetBrains Mono (500)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
A premium product shot in Three.js: an invented product turning on a glossy dark pedestal with a glowing amber rim, a warm key light and a cool rim light, with thin spec callouts and a big italic serif name.

## How It Explains
The camera eases in on the product as it turns, a light sweep glides across it, and spec callouts pop out one at a time on thin leader lines. It ends on a hero frame with the product name in a big italic serif.

## Demo
Meet Luma (an invented skincare bottle)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Product Turntable" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, the product shape (the lathe profile, cap, band), the label texture text, CALLOUTS (text and anchor points), the name and tagline and scoreSound(). Keep and reuse the style's helpers (makeGL(), the dark studio with spot key, rim and fill lights, the glossy pedestal with the emissive rim ring, the turning product, the light sweep pass, callouts on leader lines, the hero name card and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (italic), Inter (500 to 800), JetBrains Mono (500).

THE STYLE
- The product is built in Three.js from a LatheGeometry profile (bottles, jars, cups), cylinders and boxes, with physical materials (clearcoat, metal caps) and a label texture painted on a canvas. Always an invented product and brand; never a real logo, packaging or brand name.
- Studio: near-black (#141417) with one warm spot key from the upper left, a cool blue rim light from behind, and a glossy dark pedestal with a thin glowing amber ring.
- The product turns slowly the whole time; the camera eases in at the start and settles for the hero frame.
- Callouts: white Inter 700 titles with small mono details, on thin amber leader lines from points on the product, alternating left and right.
- Type: Instrument Serif italic for the product name (white, huge); Inter and JetBrains Mono for specs; nothing else.
- Claims must be true for the product you are showing; label invented figures as examples.
- Pace: the first callout lands by second 2, one callout every 1.5 to 2 seconds, hold the hero frame about 3 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the product name at 80 px or more, callout titles at 26 px or more and callout details at 18 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Meet Luma (an invented skincare bottle)") unless my content asks for it.

SOUND
- Bed: a soft, warm luxury pad with no drums.
- Map events to the kit: callouts get a glassy "sparkle" and a soft tick; the light sweep gets a slow airy "whoosh"; the hero card gets a deep, soft hit (a low sine boom) with an open chord.
- Full mix (no voiceover): keep the soft luxury pad, warm swells, a glassy sparkle per callout, and one deep hit for the hero card.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Product Turntable
Family: 3D
Look: A premium product shot in Three.js: an invented product turning on a glossy dark pedestal with a glowing amber rim, a warm key light and a cool rim light, with thin spec callouts and a big italic serif name.
How it explains: The camera eases in on the product as it turns, a light sweep glides across it, and spec callouts pop out one at a time on thin leader lines. It ends on a hero frame with the product name in a big italic serif.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Product Turntable" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each callout pops as its feature is named, the light sweep passes on the product name, and the hero card lands on the last line.
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
- Replace the demo's story: TL, the product shape (the lathe profile, cap, band), the label texture text, CALLOUTS (text and anchor points), the name and tagline and scoreSound(). Keep and reuse the style's helpers (makeGL(), the dark studio with spot key, rim and fill lights, the glossy pedestal with the emissive rim ring, the turning product, the light sweep pass, callouts on leader lines, the hero name card and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (italic), Inter (500 to 800), JetBrains Mono (500).

THE STYLE
- The product is built in Three.js from a LatheGeometry profile (bottles, jars, cups), cylinders and boxes, with physical materials (clearcoat, metal caps) and a label texture painted on a canvas. Always an invented product and brand; never a real logo, packaging or brand name.
- Studio: near-black (#141417) with one warm spot key from the upper left, a cool blue rim light from behind, and a glossy dark pedestal with a thin glowing amber ring.
- The product turns slowly the whole time; the camera eases in at the start and settles for the hero frame.
- Callouts: white Inter 700 titles with small mono details, on thin amber leader lines from points on the product, alternating left and right.
- Type: Instrument Serif italic for the product name (white, huge); Inter and JetBrains Mono for specs; nothing else.
- Claims must be true for the product you are showing; label invented figures as examples.
- Pace: the first callout lands by second 2, one callout every 1.5 to 2 seconds, hold the hero frame about 3 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the product name at 80 px or more, callout titles at 26 px or more and callout details at 18 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Meet Luma (an invented skincare bottle)") unless my content asks for it.

SOUND
- Bed: a soft, warm luxury pad with no drums.
- Map events to the kit: callouts get a glassy "sparkle" and a soft tick; the light sweep gets a slow airy "whoosh"; the hero card gets a deep, soft hit (a low sine boom) with an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark sparkles soft: true and keep the swells low.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Product Turntable
Family: 3D
Look: A premium product shot in Three.js: an invented product turning on a glossy dark pedestal with a glowing amber rim, a warm key light and a cool rim light, with thin spec callouts and a big italic serif name.
How it explains: The camera eases in on the product as it turns, a light sweep glides across it, and spec callouts pop out one at a time on thin leader lines. It ends on a hero frame with the product name in a big italic serif.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/product-turntable.html` (58.1 KB)
