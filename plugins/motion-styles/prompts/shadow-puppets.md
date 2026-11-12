# Motion graphics style #58: Shadow Puppets

- **ID:** `shadow-puppets`
- **Family:** Character Story
- **Canvas:** `720x1280`
- **Fonts:** Cormorant Garamond (600, italic), Inter (600)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A shadow-puppet theatre: jointed black silhouette puppets on visible rods, pressed against a warm backlit paper screen that glows and flickers like a flame, with cut-out scenery, a wooden stage frame and fable lines in an elegant serif.

## How It Explains
Puppets slide in on their rods and act with simple jointed moves (a beak that opens, a jaw that talks, a head that tilts, legs that step). Scenery pieces slide behind them, the light flickers and breathes, and each beat of the story is narrated in a serif line at the bottom before the moral closes the curtain.

## Demo
The Fox and the Crow (an Aesop fable)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Shadow Puppets" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the puppets (crowPuppet and foxPuppet: their shapes, joints and rod points), the scenery pieces, the story LINES and the moral, and scoreSound(). Keep and reuse the style's helpers (the backlit screen with flame flicker and paper grain, the wooden frame and curtains, solid black silhouettes with thin rods to the bottom edge, jointed parts that rotate around pivots, the slide-in of puppets and scenery, the serif narration lines and the curtain close).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Cormorant Garamond (600, italic), Inter (600).

THE STYLE
- Every character and prop is a solid black silhouette (#120c08) drawn in code with clean, readable outlines and a few cut-out holes (an eye, a pattern), held by thin rods running to the bottom of the screen.
- Puppets are jointed: each moving part rotates around a pivot (jaw, beak, head, wing, legs). Animate with simple, slightly stiff motion, like hands working the rods.
- The screen is warm backlit paper (radial glow #ffcf8a to #c4743a) that flickers gently (a noise-driven brightness change) with a faint paper grain; a dark wooden frame and red curtains surround it.
- Scenery (trees, hills, houses) is also silhouette, sliding in from the sides behind the puppets.
- Type: Cormorant Garamond 600 for narration in a dark band at the bottom, italic for the moral.
- Use public-domain fables and folk tales, or original stories.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep narration at 44 px or more, the moral at 56 px or more, and puppets at least a third of the frame height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The Fox and the Crow (an Aesop fable)") unless my content asks for it.

SOUND
- Music: a gentle folk melody on plucked strings (triangle plucks) with a soft drone.
- Map events to the kit: puppets entering get a wooden creak (a low filtered noise sweep) and SND.tap; talking gets soft clicks; the key action gets a small drum hit (SND.thud); the curtain gets a long soft "whoosh"; the moral gets an open chord. A low flame crackle runs under everything.
- Full mix (no voiceover): a gentle folk melody (plucked strings), a soft crackle of flame, wooden creaks when puppets enter, and a little drum for the key action.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Shadow Puppets
Family: Character Story
Look: A shadow-puppet theatre: jointed black silhouette puppets on visible rods, pressed against a warm backlit paper screen that glows and flickers like a flame, with cut-out scenery, a wooden stage frame and fable lines in an elegant serif.
How it explains: Puppets slide in on their rods and act with simple jointed moves (a beak that opens, a jaw that talks, a head that tilts, legs that step). Scenery pieces slide behind them, the light flickers and breathes, and each beat of the story is narrated in a serif line at the bottom before the moral closes the curtain.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Shadow Puppets" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each puppet slides in as it is introduced, a jaw or beak moves while that character speaks, actions (drop, catch, bow) land on their verbs, and each narration line fades in on its first word.
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
- Replace the demo's story: TL, the puppets (crowPuppet and foxPuppet: their shapes, joints and rod points), the scenery pieces, the story LINES and the moral, and scoreSound(). Keep and reuse the style's helpers (the backlit screen with flame flicker and paper grain, the wooden frame and curtains, solid black silhouettes with thin rods to the bottom edge, jointed parts that rotate around pivots, the slide-in of puppets and scenery, the serif narration lines and the curtain close).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Cormorant Garamond (600, italic), Inter (600).

THE STYLE
- Every character and prop is a solid black silhouette (#120c08) drawn in code with clean, readable outlines and a few cut-out holes (an eye, a pattern), held by thin rods running to the bottom of the screen.
- Puppets are jointed: each moving part rotates around a pivot (jaw, beak, head, wing, legs). Animate with simple, slightly stiff motion, like hands working the rods.
- The screen is warm backlit paper (radial glow #ffcf8a to #c4743a) that flickers gently (a noise-driven brightness change) with a faint paper grain; a dark wooden frame and red curtains surround it.
- Scenery (trees, hills, houses) is also silhouette, sliding in from the sides behind the puppets.
- Type: Cormorant Garamond 600 for narration in a dark band at the bottom, italic for the moral.
- Use public-domain fables and folk tales, or original stories.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep narration at 44 px or more, the moral at 56 px or more, and puppets at least a third of the frame height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The Fox and the Crow (an Aesop fable)") unless my content asks for it.

SOUND
- Music: a gentle folk melody on plucked strings (triangle plucks) with a soft drone.
- Map events to the kit: puppets entering get a wooden creak (a low filtered noise sweep) and SND.tap; talking gets soft clicks; the key action gets a small drum hit (SND.thud); the curtain gets a long soft "whoosh"; the moral gets an open chord. A low flame crackle runs under everything.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the melody very low and mark creaks soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Shadow Puppets
Family: Character Story
Look: A shadow-puppet theatre: jointed black silhouette puppets on visible rods, pressed against a warm backlit paper screen that glows and flickers like a flame, with cut-out scenery, a wooden stage frame and fable lines in an elegant serif.
How it explains: Puppets slide in on their rods and act with simple jointed moves (a beak that opens, a jaw that talks, a head that tilts, legs that step). Scenery pieces slide behind them, the light flickers and breathes, and each beat of the story is narrated in a serif line at the bottom before the moral closes the curtain.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/shadow-puppets.html` (60.5 KB)
