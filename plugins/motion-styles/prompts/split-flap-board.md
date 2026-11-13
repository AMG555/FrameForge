# Motion graphics style #93: Split-Flap Board

- **ID:** `split-flap-board`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Anton, JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
A mechanical airport departure board in 3D: individual flap segments cycling through letters with a satisfying clack, until the final message settles.

## How It Explains
Flaps cycle through the alphabet letter by letter with a clack sound, each row settles in turn, and the complete message lands with a final click.

## Demo
THE TRUTH ARRIVES

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Split-Flap Board" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, JetBrains Mono (500 and 700).

THE STYLE
- A mechanical airport departure board in 3D: individual flap segments cycling through letters with a satisfying clack, until the final message settles.
- Flaps cycle through the alphabet letter by letter with a clack sound, each row settles in turn, and the complete message lands with a final click.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random.
- It will be watched on phones: at 720x1280 keep headlines at 54 px or more, labels at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg.

STYLE CARD
Name: Split-Flap Board
Family: 3D
Look: A mechanical airport departure board in 3D: individual flap segments cycling through letters with a satisfying clack, until the final message settles.
How it explains: Flaps cycle through the alphabet letter by letter with a clack sound, each row settles in turn, and the complete message lands with a final click.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/split-flap-board.html`