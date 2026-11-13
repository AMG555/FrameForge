# Motion graphics style #78: Data Skyline

- **ID:** `data-skyline`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Space Grotesk (500 and 700), JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Bar chart as an architect's stone tower model in Three.js: each bar is a chunky white tower on a marble base, the tallest gets an amber spotlight.

## How It Explains
Towers rise in order with their values counting up, the camera pans along the row, and the tallest gets a spotlight and hero callout.

## Demo
The 5 Tallest Numbers

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Data Skyline" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

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
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (500 and 700).

THE STYLE
- Bar chart as an architect's stone tower model in Three.js: each bar is a chunky white tower on a marble base, the tallest gets an amber spotlight.
- Towers rise in order with their values counting up, the camera pans along the row, and the tallest gets a spotlight and hero callout.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random.
- It will be watched on phones: at 720x1280 keep headlines at 54 px or more, labels at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg.

STYLE CARD
Name: Data Skyline
Family: 3D
Look: Bar chart as an architect's stone tower model in Three.js: each bar is a chunky white tower on a marble base, the tallest gets an amber spotlight.
How it explains: Towers rise in order with their values counting up, the camera pans along the row, and the tallest gets a spotlight and hero callout.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/data-skyline.html`