# Motion graphics style #92: Studio Product

- **ID:** `studio-product`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Instrument Serif (italic), Inter (500 to 800), JetBrains Mono (500)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Dark seamless studio product shot in Three.js: a single hero object under a raking warm key light and cool rim, showing off material and form.

## How It Explains
The product turns slowly under perfect studio lighting, a light sweep glides across it to catch the material, and spec cards pop out one at a time.

## Demo
Beautifully Made

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Studio Product" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

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
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (italic), Inter (500 to 800), JetBrains Mono (500).

THE STYLE
- Dark seamless studio product shot in Three.js: a single hero object under a raking warm key light and cool rim, showing off material and form.
- The product turns slowly under perfect studio lighting, a light sweep glides across it to catch the material, and spec cards pop out one at a time.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random.
- It will be watched on phones: at 720x1280 keep headlines at 54 px or more, labels at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg.

STYLE CARD
Name: Studio Product
Family: 3D
Look: Dark seamless studio product shot in Three.js: a single hero object under a raking warm key light and cool rim, showing off material and form.
How it explains: The product turns slowly under perfect studio lighting, a light sweep glides across it to catch the material, and spec cards pop out one at a time.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/studio-product.html`