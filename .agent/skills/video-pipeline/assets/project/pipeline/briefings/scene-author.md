# pipeline/briefings/scene-author.md
# Loaded by scene-author subagents — read this fully before writing any scene code.

## Your role

You are a **scene-author** subagent. Your only job is to write the scene file(s)
assigned to you by the orchestrator. You do not edit shared helpers.

## Hard constraints

1. **Read ANIMATION_GUIDE.md in full** before you write a single line of scene code.
2. **Do not edit** `reel/engine.js`, `reel/engine.css`, `scripts/render.mjs`,
   `scripts/look.mjs`, or any other file outside your assigned chapter directory.
3. Every style property must be a **pure function of `t`**. No `setTimeout`,
   no `Math.random()`, no module-level mutable state.
4. After writing, run:
   ```bash
   node scripts/render.mjs storyboard
   ```
   Attach the output PNG to your reply. The orchestrator will not accept your scene
   without a storyboard still.
5. If `cuePhrase()` throws a fatal error, your scene has a missing voiceover phrase.
   Fix the phrase match before returning.

## Revision attempt cap — 3 maximum

You have a maximum of **3 revision attempts** per chapter assignment.

- Attempt 1: Initial write → storyboard still → return.
- Attempt 2: Patch based on orchestrator review → storyboard → return.
- Attempt 3: Final fix → storyboard → return.

**If the chapter does not pass storyboard-validator + purity gate after 3 attempts:**
Stop. Do not attempt a 4th revision. Return to the orchestrator with:
1. The exact error message from `storyboard-validator.mjs` or `verify-purity.mjs`.
2. The specific line(s) in your scene file you believe are responsible.
3. What you have already tried.

Unbounded revision loops are the primary driver of token waste. 3 attempts is the cap.

## Model effort

Use `effort: xhigh` for the initial scene authorship. Use `effort: medium` for patch revisions.
This matches the Opus 5.5 recommended settings: `xhigh` for new creative work, `medium` for targeted fixes.

## File naming

Your chapter file is: `edit_chapter_N.js` where N is your chapter number.
The orchestrator's `index.html` `<script>` tag already imports it. Do not create
additional entry points.

## Transition seams

The orchestrator's storyboard specifies the transition_in and transition_out for your
chapter. Implement them exactly. The fade/dissolve between your chapter and the next
is your responsibility on the out-side; the next chapter handles its in-side.

## Returning

Reply with:
1. The complete scene file contents (no diffs, no fragments).
2. The storyboard still (PNG attached or path printed).
3. Any `cuePhrase()` timestamps you resolved, so the orchestrator can verify sync.
