# Motion graphics style #100: Product Launch UI

- **ID:** `product-launch-ui`
- **Family:** Screen and UI
- **Canvas:** `1280x720`
- **Fonts:** Inter, Inter Tight, JetBrains Mono
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Fast-paced modern SaaS product launch: floating smartphone mockups with cascading lockscreen push notification cards, interactive chat bubbles popping into view, expressive mascot eye acting (blink, look left/right, wink), and 3D rotating gold coin particle bursts.

## How It Explains
Smooth app-flow storytelling: cold open text bubble pulls back into mobile chat, mascot character drops in with squash and stretch, invoice/task status cards slide in, lockscreen zooms into full app, and spinning 3D coins celebrate conversions.

## Demo
Introducing FlowBot: Invoices on Autopilot

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Product Launch UI" style (Screen and UI) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers, synthesized sound kit, scenes, sound score, and canvas compositor. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- Keep the page player (play/pause, scrub, time, sound toggle, loop) and core motion helpers unchanged.
- Replace the demo story: TL, CUTS, app screens, notification badges, mascot cues, status chips, and sound triggers. Keep and reuse the style's core mechanics: phone frame mockup, push notification cascade, mascot squash-and-stretch eye acting, 3D rotating coin spin, typing indicator bubbles.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Inter, Inter Tight, JetBrains Mono.

THE STYLE
- Surface: ultra-clean off-white or soft lavender gradient with floating rounded smartphone hardware frame and subtle drop shadows.
- Type: Inter Tight for bold product headlines, Inter for mobile app UI elements, JetBrains Mono for transaction IDs and monetary figures.
- How things appear: phone mockup glides up from bottom; lockscreen notification cards slide in with bouncy spring physics; chat bubbles pop with typing dots.
- Emphasis: mascot character with squash-and-stretch landings and expressive eye animation (blinking, tracking objects, winking); 3D gold coins spinning with radial particle bursts.
- Pace: high-energy startup launch tempo — hook within 1.5s, rapid-fire feature demonstrations, and triumphant CTA hold.

RULES THAT KEEP IT IN STYLE
- Change the story, words and props; do not change the medium. Draw every subject accurately for my topic.
- Every frame is a pure function of time t. Use seeded PRNG and deterministic sine/spring curves for all randomness, never unseeded Math.random.
- It will be watched on phones and monitors: keep headline statements at 76 px or more, notification card text at 28 px or more, status pills at 22 px or more. Fill the frame.
- Keep each frame render fast, well under 30 ms.

SOUND
- UI foley: mobile notification dings, chat bubble pops, haptic click sounds, coin spin shimmers, and punchy synth drops.
- Music: energetic, upbeat SaaS electronic beat with driving hi-hats and warm synth chords.
- Voiceover mix: message dings and coin clinks hit on audio pauses; background synth bed ducked 65% during speech.

STYLE CARD
Name: Product Launch UI
Family: Screen and UI
Look: Fast-paced modern SaaS product launch: floating smartphone mockups with cascading lockscreen push notification cards, interactive chat bubbles popping into view, expressive mascot eye acting (blink, look left/right, wink), and 3D rotating gold coin particle bursts.
How it explains: Smooth app-flow storytelling: cold open text bubble pulls back into mobile chat, mascot character drops in with squash and stretch, invoice/task status cards slide in, lockscreen zooms into full app, and spinning 3D coins celebrate conversions.
```
