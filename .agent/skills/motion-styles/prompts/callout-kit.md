# Motion graphics style #50: Callout Kit

- **ID:** `callout-kit`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** Permanent Marker, JetBrains Mono (700), Inter (800)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
Hand-drawn annotation tools over your footage: red marker circles that draw themselves, arrows with marker labels, a magnifier box that zooms into a detail with connector lines, a pixelate blur for anything private, and a pulsing spotlight.

## How It Explains
Each callout draws itself on the beat: the marker circle loops around the thing, an arrow swings in with a label, the zoom box pops open with lines back to the source, a blur mask pixelates a private area, and a spotlight darkens everything except the point. They clear before the next one.

## Demo
Pointing out an app on your phone in a review

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Callout Kit" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL and the callout list (positions, sizes, labels, what the zoom box shows), and scoreSound(); load your clip with Load footage and set the coordinates to your shot. Keep and reuse the style's helpers (footage(), the hand-drawn marker circle (hdEllipse-style), marker arrows with labels, the zoom box with connector lines and border, the pixelate blur mask, the spotlight cut-out and the draw-on timing).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Permanent Marker, JetBrains Mono (700), Inter (800).

THE STYLE
- Built for your footage: callouts are placed in frame coordinates on top of footage(); set them to where things sit in your shot.
- Marker red (#ff3b3b) for circles, arrows and labels (Permanent Marker), with a subtle dark shadow so they read on any footage.
- The zoom box: a white-bordered rounded rectangle showing the detail at 2× (or a drawn stand-in), a small "2× ZOOM" tag, and two thin connector lines back to the source area.
- Blur masks pixelate (blocky mosaic) anything private: faces of strangers, emails, plates. Always cover before it appears.
- Spotlight: everything darkens to 60% except a soft circle on the point.
- One callout at a time; each draws on in 0.4 to 0.8 seconds and clears before the next.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep marker labels at 44 px or more, mono tags at 20 px or more, and line widths at 6 px or more so they read on a phone. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Pointing out an app on your phone in a review") unless my content asks for it.

SOUND
- No music by default (your clip leads); effects only.
- Map events to the kit: circles and underlines get "marker"; arrows get a soft "whoosh"; the zoom box gets "pop"; the blur gets a "click" (shutter); the spotlight gets a soft low swell.
- Full mix (no voiceover): marker squeaks while drawing, a pop for the zoom box, a soft whoosh for the arrow, a camera-shutter click for the blur.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Callout Kit
Family: Edit Overlay
Look: Hand-drawn annotation tools over your footage: red marker circles that draw themselves, arrows with marker labels, a magnifier box that zooms into a detail with connector lines, a pixelate blur for anything private, and a pulsing spotlight.
How it explains: Each callout draws itself on the beat: the marker circle loops around the thing, an arrow swings in with a label, the zoom box pops open with lines back to the source, a blur mask pixelates a private area, and a spotlight darkens everything except the point. They clear before the next one.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Callout Kit" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each circle starts drawing on the word that names the thing, arrows land on "this" or "here", the zoom box opens on the detail word, and the blur appears before anything private is visible.
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
- Replace the demo's story: TL and the callout list (positions, sizes, labels, what the zoom box shows), and scoreSound(); load your clip with Load footage and set the coordinates to your shot. Keep and reuse the style's helpers (footage(), the hand-drawn marker circle (hdEllipse-style), marker arrows with labels, the zoom box with connector lines and border, the pixelate blur mask, the spotlight cut-out and the draw-on timing).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Permanent Marker, JetBrains Mono (700), Inter (800).

THE STYLE
- Built for your footage: callouts are placed in frame coordinates on top of footage(); set them to where things sit in your shot.
- Marker red (#ff3b3b) for circles, arrows and labels (Permanent Marker), with a subtle dark shadow so they read on any footage.
- The zoom box: a white-bordered rounded rectangle showing the detail at 2× (or a drawn stand-in), a small "2× ZOOM" tag, and two thin connector lines back to the source area.
- Blur masks pixelate (blocky mosaic) anything private: faces of strangers, emails, plates. Always cover before it appears.
- Spotlight: everything darkens to 60% except a soft circle on the point.
- One callout at a time; each draws on in 0.4 to 0.8 seconds and clears before the next.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep marker labels at 44 px or more, mono tags at 20 px or more, and line widths at 6 px or more so they read on a phone. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Pointing out an app on your phone in a review") unless my content asks for it.

SOUND
- No music by default (your clip leads); effects only.
- Map events to the kit: circles and underlines get "marker"; arrows get a soft "whoosh"; the zoom box gets "pop"; the blur gets a "click" (shutter); the spotlight gets a soft low swell.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark every sound soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Callout Kit
Family: Edit Overlay
Look: Hand-drawn annotation tools over your footage: red marker circles that draw themselves, arrows with marker labels, a magnifier box that zooms into a detail with connector lines, a pixelate blur for anything private, and a pulsing spotlight.
How it explains: Each callout draws itself on the beat: the marker circle loops around the thing, an arrow swings in with a label, the zoom box pops open with lines back to the source, a blur mask pixelates a private area, and a spotlight darkens everything except the point. They clear before the next one.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/callout-kit.html` (56.8 KB)
