# Motion graphics style #52: Headline Backdrop

- **ID:** `headline-backdrop`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** Playfair Display (700 and 900), Inter (800 and 900)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
Commentary layout: you, cut out with a thick white sticker edge and a soft shadow, standing in front of invented article cards that scroll and tilt behind you, with a yellow marker swipe on the line that matters and a black-and-yellow reaction chip.

## How It Explains
Article cards slide in and stack behind you, the camera drifts down the top card, and the key line gets a yellow highlighter swipe as you read it. A second card swaps in for the counterpoint, and a reaction chip pops beside your head on the punchline.

## Demo
Reacting to a (made-up) headline about laundry-folding robots

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Headline Backdrop" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, ARTICLES (invented site name, headline lines, which line is highlighted), the reaction text and scoreSound(); load your clip with Load footage (shot against a plain background for the cut-out look). Keep and reuse the style's helpers (the pale background, invented article cards with grey body lines, the stack-and-scroll motion, the yellow marker swipe, the sticker-edge cut-out treatment of the footage, the drop shadow and the reaction chip).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Playfair Display (700 and 900), Inter (800 and 900).

THE STYLE
- Built for your footage: the presenter is cut out (with your clip: a centred crop in a rounded mask; with the stand-in: a real silhouette) and gets a thick white sticker outline and a soft shadow so it sits in front of the cards.
- Articles are always invented: an invented site name in Playfair Display 900, a serif headline, grey placeholder body lines. Never mock up a real outlet, a real person's quote or a real post.
- The key line gets a yellow (#ffd60a) marker swipe that grows left to right behind the text.
- Cards tilt slightly (±4°) and stack with soft shadows on a pale grey-blue background (#e6eaef).
- Reaction chips: black with yellow Inter 900 text, popping next to the head.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 40 px or more, the reaction chip at 30 px or more, and keep your face clear of the cards. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Reacting to a (made-up) headline about laundry-folding robots") unless my content asks for it.

SOUND
- No music by default (your clip leads).
- Map events to the kit: cards get SND.paper; the highlight gets "marker"; the reaction gets "pop" and a short comic sting; the card swap gets a soft "whoosh".
- Full mix (no voiceover): paper slides for cards, a marker for the highlight, a pop for the reaction.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Headline Backdrop
Family: Edit Overlay
Look: Commentary layout: you, cut out with a thick white sticker edge and a soft shadow, standing in front of invented article cards that scroll and tilt behind you, with a yellow marker swipe on the line that matters and a black-and-yellow reaction chip.
How it explains: Article cards slide in and stack behind you, the camera drifts down the top card, and the key line gets a yellow highlighter swipe as you read it. A second card swaps in for the counterpoint, and a reaction chip pops beside your head on the punchline.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Headline Backdrop" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. A card slides in as you mention it, the highlighter swipes along the line while you read it, and the reaction chip pops on the punchline.
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
- Replace the demo's story: TL, ARTICLES (invented site name, headline lines, which line is highlighted), the reaction text and scoreSound(); load your clip with Load footage (shot against a plain background for the cut-out look). Keep and reuse the style's helpers (the pale background, invented article cards with grey body lines, the stack-and-scroll motion, the yellow marker swipe, the sticker-edge cut-out treatment of the footage, the drop shadow and the reaction chip).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Playfair Display (700 and 900), Inter (800 and 900).

THE STYLE
- Built for your footage: the presenter is cut out (with your clip: a centred crop in a rounded mask; with the stand-in: a real silhouette) and gets a thick white sticker outline and a soft shadow so it sits in front of the cards.
- Articles are always invented: an invented site name in Playfair Display 900, a serif headline, grey placeholder body lines. Never mock up a real outlet, a real person's quote or a real post.
- The key line gets a yellow (#ffd60a) marker swipe that grows left to right behind the text.
- Cards tilt slightly (±4°) and stack with soft shadows on a pale grey-blue background (#e6eaef).
- Reaction chips: black with yellow Inter 900 text, popping next to the head.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 40 px or more, the reaction chip at 30 px or more, and keep your face clear of the cards. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Reacting to a (made-up) headline about laundry-folding robots") unless my content asks for it.

SOUND
- No music by default (your clip leads).
- Map events to the kit: cards get SND.paper; the highlight gets "marker"; the reaction gets "pop" and a short comic sting; the card swap gets a soft "whoosh".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark everything soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Headline Backdrop
Family: Edit Overlay
Look: Commentary layout: you, cut out with a thick white sticker edge and a soft shadow, standing in front of invented article cards that scroll and tilt behind you, with a yellow marker swipe on the line that matters and a black-and-yellow reaction chip.
How it explains: Article cards slide in and stack behind you, the camera drifts down the top card, and the key line gets a yellow highlighter swipe as you read it. A second card swaps in for the counterpoint, and a reaction chip pops beside your head on the punchline.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/headline-backdrop.html` (55.5 KB)
