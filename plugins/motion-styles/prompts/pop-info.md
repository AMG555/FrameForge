# Motion graphics style #07: Pop Info

- **ID:** `pop-info`
- **Family:** Illustrated
- **Canvas:** `1280x720`
- **Fonts:** Fredoka (500 to 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A flat-vector animated infographic, drawn entirely in code: a cosy cartoon scene (here a grocery aisle in soft perspective), one small character with a big feeling, a teal thought bubble that carries the idea, a counter, a dotted path and an iris wipe in and out. Muted room colours, warm product colours, rounded Fredoka type.

## How It Explains
The scene builds itself: an iris opens, shelves slide in from both sides, the character pops up and reacts (annoyed, looking, sighing). The idea appears as a bubble with a friendly mascot, a number counts up inside it with a little tag, a dotted path draws through the scene to a pin, and the camera slowly pushes toward the point of interest. An iris closes on the takeaway.

## Demo
Why is the milk always at the back of the store?

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Pop Info" style (Illustrated) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged.
- Replace the demo's story: TL, the scene (drawRoom, drawShelf and the product layout ROWS, or a new setting for my topic), the character (drawShopper) and its reactions, the bubble contents (drawBubble: mascot, counter and tag), drawPath, the camera move in renderAt and scoreSound(). Keep and reuse the style's helpers (the 680 x 383 design space with renderAt() scaling it to the canvas, prog(), popS(), wobble(), blink(), the easings, rr(), the dust layer, the iris wipe (drawWipe), the parallax split between background and foreground, and the explainer() compositor).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fredoka (500 to 700).

THE STYLE
- Everything is original flat vector art drawn with canvas paths: no images, no outlines, simple rounded shapes, one flat shadow tone per object, soft highlights, and a few drifting dust specks for life. Invent the setting and characters for my topic; never copy a real brand, logo, mascot or packaging.
- Draw in the 680 x 383 design space and let renderAt() scale it, so the art stays crisp at any size. Keep shapes big and readable on a phone.
- Palette: a muted, desaturated room (sage wall #D7DCCB, warm floor #C4B79D), warm accent objects (#E07A5F, #F2CC8F, #81B29A, #6C9BB8), deep teal #2F6F73 for the idea bubble, coral #E85D4A for alerts and signs, and sunny yellow #FFD86B for tags, the iris ring and sparkles. Text is white or dark teal.
- One character with a strong, simple emotion (eyebrows, mouth, blinks, a sweat drop, a sigh) is the emotional anchor. It sits in the foreground with gentle parallax while the camera pushes the background.
- The idea lives in a bubble: a friendly mascot or icon, a number that counts up with an eased curve, and a small pill tag. Numbers must be real or clearly framed as an example; if you cannot verify one, ask me.
- Motion is springy and playful: things pop in with a back-eased scale (popS), settle with a decaying wobble, the scene slides in from the sides, a dotted path draws itself and a pin drops, and the camera does one slow push. Open and close with the teal iris wipe with a yellow ring.
- Keep it to one scene per idea, with clear staging: setting, character reaction, the idea in the bubble, the visual proof (path, arrow or chart), then the iris closes.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 in the 680 x 383 design space keep the main number at 21 px or more, labels at 11 px or more and any title at 26 px or more (that is about 40, 21 and 50 px at 1280x720), and keep the character and the bubble large. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Why is the milk always at the back of the store?") unless my content asks for it.

SOUND
- Soft, toy-like and sparse: rounded pops for the bubble, tags and pin, little sine bloops for character reactions, wooden taps for landings, counter steps and path dots (thinning out as the counter lands), airy whooshes for the iris and the slides, and one breathy sigh.
- No chimes, bells, pings or sparkle sounds, even for winks and sparkles on screen. The cartoon carries the charm; the sound only gives it weight.
- Full mix (no voiceover): a light, friendly music bed (k.music at a low gain), at most about 3 sounds at once, and a short quiet moment before the pin or the payoff lands.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Pop Info
Family: Illustrated
Look: A flat-vector animated infographic, drawn entirely in code: a cosy cartoon scene (here a grocery aisle in soft perspective), one small character with a big feeling, a teal thought bubble that carries the idea, a counter, a dotted path and an iris wipe in and out. Muted room colours, warm product colours, rounded Fredoka type.
How it explains: The scene builds itself: an iris opens, shelves slide in from both sides, the character pops up and reacts (annoyed, looking, sighing). The idea appears as a bubble with a friendly mascot, a number counts up inside it with a little tag, a dotted path draws through the scene to a pin, and the camera slowly pushes toward the point of interest. An iris closes on the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Pop Info" style (Illustrated) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The character reacts on the word that carries the feeling; the bubble pops in as the idea is introduced; the counter starts as the number is spoken and locks on its last syllable; the path draws while the journey is described and the pin drops on the destination.
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
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged.
- Replace the demo's story: TL, the scene (drawRoom, drawShelf and the product layout ROWS, or a new setting for my topic), the character (drawShopper) and its reactions, the bubble contents (drawBubble: mascot, counter and tag), drawPath, the camera move in renderAt and scoreSound(). Keep and reuse the style's helpers (the 680 x 383 design space with renderAt() scaling it to the canvas, prog(), popS(), wobble(), blink(), the easings, rr(), the dust layer, the iris wipe (drawWipe), the parallax split between background and foreground, and the explainer() compositor).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fredoka (500 to 700).

THE STYLE
- Everything is original flat vector art drawn with canvas paths: no images, no outlines, simple rounded shapes, one flat shadow tone per object, soft highlights, and a few drifting dust specks for life. Invent the setting and characters for my topic; never copy a real brand, logo, mascot or packaging.
- Draw in the 680 x 383 design space and let renderAt() scale it, so the art stays crisp at any size. Keep shapes big and readable on a phone.
- Palette: a muted, desaturated room (sage wall #D7DCCB, warm floor #C4B79D), warm accent objects (#E07A5F, #F2CC8F, #81B29A, #6C9BB8), deep teal #2F6F73 for the idea bubble, coral #E85D4A for alerts and signs, and sunny yellow #FFD86B for tags, the iris ring and sparkles. Text is white or dark teal.
- One character with a strong, simple emotion (eyebrows, mouth, blinks, a sweat drop, a sigh) is the emotional anchor. It sits in the foreground with gentle parallax while the camera pushes the background.
- The idea lives in a bubble: a friendly mascot or icon, a number that counts up with an eased curve, and a small pill tag. Numbers must be real or clearly framed as an example; if you cannot verify one, ask me.
- Motion is springy and playful: things pop in with a back-eased scale (popS), settle with a decaying wobble, the scene slides in from the sides, a dotted path draws itself and a pin drops, and the camera does one slow push. Open and close with the teal iris wipe with a yellow ring.
- Keep it to one scene per idea, with clear staging: setting, character reaction, the idea in the bubble, the visual proof (path, arrow or chart), then the iris closes.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 in the 680 x 383 design space keep the main number at 21 px or more, labels at 11 px or more and any title at 26 px or more (that is about 40, 21 and 50 px at 1280x720), and keep the character and the bubble large. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Why is the milk always at the back of the store?") unless my content asks for it.

SOUND
- Soft, toy-like and sparse: rounded pops for the bubble, tags and pin, little sine bloops for character reactions, wooden taps for landings, counter steps and path dots (thinning out as the counter lands), airy whooshes for the iris and the slides, and one breathy sigh.
- No chimes, bells, pings or sparkle sounds, even for winks and sparkles on screen. The cartoon carries the charm; the sound only gives it weight.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded, which keeps the music low and plays anything marked soft at about 55%. Mark taps, counter ticks and path dots soft: true and keep pops for the bubble, the tag and the pin.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Pop Info
Family: Illustrated
Look: A flat-vector animated infographic, drawn entirely in code: a cosy cartoon scene (here a grocery aisle in soft perspective), one small character with a big feeling, a teal thought bubble that carries the idea, a counter, a dotted path and an iris wipe in and out. Muted room colours, warm product colours, rounded Fredoka type.
How it explains: The scene builds itself: an iris opens, shelves slide in from both sides, the character pops up and reacts (annoyed, looking, sighing). The idea appears as a bubble with a friendly mascot, a number counts up inside it with a little tag, a dotted path draws through the scene to a pin, and the camera slowly pushes toward the point of interest. An iris closes on the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/pop-info.html` (47.7 KB)
