# Motion graphics style #59: Visual Novel

- **ID:** `visual-novel`
- **Family:** Character Story
- **Canvas:** `720x1280`
- **Fonts:** M PLUS Rounded 1c (500 and 800)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A visual-novel scene: a soft, blurred painted background, a large original anime-style character bust drawn in code with big glossy eyes, swapping expressions (smile, nervous sweat, shocked, laughing with blush), and a translucent dialogue box with a name tag and typewriter text.

## How It Explains
The story is told as dialogue: the character slides in, each line types out in the box with a blinking arrow, and her expression, pose bounce and little effects (sweat drop, sparkles, shock lines, blush) change with what she says. It ends on a two-option choice menu where a cursor picks one.

## Demo
Mika's first day at a new job (original character)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Visual Novel" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the character design in drawMika() (hair, colours, outfit), the background painter, DIALOGUE (speaker, line, expression, effect, time), the CHOICES and scoreSound(). Keep and reuse the style's helpers (the blurred background layer, the bust rig (head, hair, eyes with highlights, brows, mouth shapes, blush) with expression presets, the slide-in and bounce, the effects (sweat, sparkle, shock lines), the dialogue box with name tag, typewriter and blinking arrow, and the choice menu with cursor).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: M PLUS Rounded 1c (500 and 800).

THE STYLE
- One original character drawn entirely in code: a big rounded head, layered hair with a shine streak, large eyes with two white highlights, simple nose and mouth shapes, a collar and shoulders. Never draw an existing anime character.
- Expressions are presets (smile, nervous, shocked, laugh, thinking) built from eyebrow angle, eye shape, mouth shape and blush; effects (sweat drop, sparkles, shock lines, a question mark) pop around the head.
- The background is a soft painted scene (an office, a classroom, a street) drawn in code and blurred, with a gentle bloom.
- Dialogue box: rounded, dark translucent (#1b1530 at 82%) with a soft pink border, a name tag pill (#ff8fb8), text typed at about 28 characters a second and a bouncing ▼ when done.
- Choices: two stacked pill buttons in the centre; a cursor moves to one and it lights up.
- Type: M PLUS Rounded 1c everywhere.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep dialogue at 34 px or more, the name tag at 30 px or more, choices at 32 px or more, and the character filling at least half the frame height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Mika's first day at a new job (original character)") unless my content asks for it.

SOUND
- Music: a light slice-of-life loop (soft triangle piano chords and a simple melody).
- Map events to the kit: typing gets soft short blips per character pair; the character entering gets a soft "whoosh"; shock gets a boing (bending sine); happy lines get "sparkle"; sweat gets a small falling tone; the choice menu gets "pop" and the pick gets a chime.
- Full mix (no voiceover): a light, slice-of-life piano loop, soft blips while text types, a "boing" for shock, a sparkle for happy moments and a select chime on the choice.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Visual Novel
Family: Character Story
Look: A visual-novel scene: a soft, blurred painted background, a large original anime-style character bust drawn in code with big glossy eyes, swapping expressions (smile, nervous sweat, shocked, laughing with blush), and a translucent dialogue box with a name tag and typewriter text.
How it explains: The story is told as dialogue: the character slides in, each line types out in the box with a blinking arrow, and her expression, pose bounce and little effects (sweat drop, sparkles, shock lines, blush) change with what she says. It ends on a two-option choice menu where a cursor picks one.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Visual Novel" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each line starts typing on its first spoken word and finishes as the line ends; the expression changes on the word that carries the feeling.
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
- Replace the demo's story: TL, the character design in drawMika() (hair, colours, outfit), the background painter, DIALOGUE (speaker, line, expression, effect, time), the CHOICES and scoreSound(). Keep and reuse the style's helpers (the blurred background layer, the bust rig (head, hair, eyes with highlights, brows, mouth shapes, blush) with expression presets, the slide-in and bounce, the effects (sweat, sparkle, shock lines), the dialogue box with name tag, typewriter and blinking arrow, and the choice menu with cursor).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: M PLUS Rounded 1c (500 and 800).

THE STYLE
- One original character drawn entirely in code: a big rounded head, layered hair with a shine streak, large eyes with two white highlights, simple nose and mouth shapes, a collar and shoulders. Never draw an existing anime character.
- Expressions are presets (smile, nervous, shocked, laugh, thinking) built from eyebrow angle, eye shape, mouth shape and blush; effects (sweat drop, sparkles, shock lines, a question mark) pop around the head.
- The background is a soft painted scene (an office, a classroom, a street) drawn in code and blurred, with a gentle bloom.
- Dialogue box: rounded, dark translucent (#1b1530 at 82%) with a soft pink border, a name tag pill (#ff8fb8), text typed at about 28 characters a second and a bouncing ▼ when done.
- Choices: two stacked pill buttons in the centre; a cursor moves to one and it lights up.
- Type: M PLUS Rounded 1c everywhere.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep dialogue at 34 px or more, the name tag at 30 px or more, choices at 32 px or more, and the character filling at least half the frame height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Mika's first day at a new job (original character)") unless my content asks for it.

SOUND
- Music: a light slice-of-life loop (soft triangle piano chords and a simple melody).
- Map events to the kit: typing gets soft short blips per character pair; the character entering gets a soft "whoosh"; shock gets a boing (bending sine); happy lines get "sparkle"; sweat gets a small falling tone; the choice menu gets "pop" and the pick gets a chime.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the loop low and mark blips soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Visual Novel
Family: Character Story
Look: A visual-novel scene: a soft, blurred painted background, a large original anime-style character bust drawn in code with big glossy eyes, swapping expressions (smile, nervous sweat, shocked, laughing with blush), and a translucent dialogue box with a name tag and typewriter text.
How it explains: The story is told as dialogue: the character slides in, each line types out in the box with a blinking arrow, and her expression, pose bounce and little effects (sweat drop, sparkles, shock lines, blush) change with what she says. It ends on a two-option choice menu where a cursor picks one.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/visual-novel.html` (61.7 KB)
