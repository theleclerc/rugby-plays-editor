---
name: rugby-play
description: Use when designing, creating, or editing a rugby play JSON file for the rugby-plays-editor app — set-pieces (lineout, scrum, kickoff, restart), structured backs plays, or any positional rugby diagram. Covers union vocabulary translation (EN/FR), the field coordinate system, and per-frame PNG preview verification.
---

# Rugby Play

Generate or edit rugby play JSON files for the rugby-plays-editor app. Output goes to `src/examples/<slug>.json`. Each play is a `{ frames: Frame[] }` document where players move between consecutive frames; the app interpolates motion.

See [references/schema.md](references/schema.md) for the full JSON shape and [references/vocabulary.md](references/vocabulary.md) for the EN/FR rugby glossary.

## Pre-generation checklist

Capture these before writing JSON. Don't ask everything in order — note what the user already volunteered, then ask only for the gaps.

- **Set-piece type or open-play phase** — lineout, scrum, kickoff, restart, phase play
- **Field location** — 5m, 22m, halfway, attacking 22, defending 22…
- **Players per side** and which are in the lineout / scrum / starting alignment
- **Attacking shape** — pods, cuts, options, decision points (who has the ball at which phase, what alternatives they have)
- **Defending shape** — alignment, sweepers, who marks whom
- **Number of frames** and what changes between each

## ALWAYS propose the frame plan first

Before writing any JSON, reply with a frame-by-frame plan and wait for user approval. Format:

> Suggested frame plan: N frames
> 1. [one-line description of what frame 1 captures]
> 2. [...]
> ...
> N. [...]
> Want to proceed?

Only write JSON after the user approves the plan.

## Use enough frames for realistic motion

The app interpolates positions between consecutive frames, so each distinct phase of motion needs its own keyframe. Treat these as separate phases that get their own frame:

- **Each pass** — one frame per "ball at receiver X". Don't combine "9 has ball" and "12 has ball" into one transition if there's an intermediate pass.
- **Contact moments** — pod hits the line, ruck forms, tackle made.
- **Reshape moments** — line shifts right, a player inserts into the line, defenders pinch in.
- **Pick-up moments** — 9 arrives at ruck base, picks up, gets ready to pass.

Rule of thumb: if a frame transition has >2 simultaneously moving players AND a ball-handoff, you probably need an intermediate frame. Compressing too many phases into one transition produces nonsense interpolation (players sliding through each other, ball teleporting across the field). It's better to have 8 clean keyframes than 5 frames where the in-between motion is physically impossible.

## Ruck pick-up geometry

The player picking up the ball behind a ruck (typically red 9 / scrum-half) must be:

- **Directly behind the ruck on the same vertical axis** — same x as the ruck centre
- **Close to the ruck** — small y offset (~50 px ≈ 4 m) on the attacker's side

So if the ruck is at `(480, 605)`, red 9 picking up belongs at `(480, ~655)` — not offset to either side. The defender (blue 9) typically mirrors on the blue side, slightly inside or outside per the play's defensive shape.

## Positioning conventions

The field is 1180 × 1573. Attacking team conventionally attacks toward smaller y.

- **"In front of"** = smaller y (toward the try line being attacked)
- **Stacked cuts**: same x, deeper y. Place the cutting runner ahead of the receiver they cut on (e.g. red 5 in front of red 12 when 5 cuts on 10's pass that would otherwise go back to 12)
- **Equal lateral spacing** for the back line: `10→12 = 12→15 = 15→13`, with `13→14 ≈ 1.3×D`. Confirm with the user when uncertain
- **Defenders** share the offside line at fixed y unless explicitly staggered for cover roles
- **Lateral offset ≥30 px** is needed to make pod pairings visible (player diameter ≈ 25)
- **Clamp** x to `[PLAYER_RADIUS, FIELD_WIDTH − PLAYER_RADIUS]` ≈ `[12.6, 1167.4]`

## Generation workflow

1. Capture the play per the checklist above
2. Write the JSON to `src/examples/<slug>.json`. Mirror the structure of [src/examples/22m-touch-setup-options.json](../../../src/examples/22m-touch-setup-options.json)
3. **Render to PNG** with the preview tool:
   ```bash
   node .claude/skills/rugby-play/scripts/render-play.mjs src/examples/<slug>.json
   ```
4. Inspect each frame PNG (use the Read tool — it accepts PNG). Check for: overlapping players, off-field positions, inconsistent positions between frames, wrong "front" direction
5. Fix issues before showing the user. Present a position summary so they can spot wrong assumptions quickly

## Iteration patterns

The same player typically has the same `(x, y)` across all frames in a setup piece (only lineout pods or specific runners change frame-by-frame). Two cases:

**All frames change identically** — same player at same `(x, y)` everywhere → use `Edit` with `replace_all` on a unique substring containing number, team, x and y:

```
Old: "number": 5,  "team": "red",  "x": 265,  "y": 620 }
New: "number": 5,  "team": "red",  "x": 440,  "y": 620 }
```

The combination of number + team + x + y is unique enough; the surrounding `"id": "r5-fN"` differs per frame but isn't part of the match string.

**Single frame changes** — only one frame is different (e.g. lineout combination frame-by-frame) → per-frame `Edit` keyed on the frame-id like `r5-f3`.

## Preview tool

```bash
node .claude/skills/rugby-play/scripts/render-play.mjs <play.json> [--out <dir>] [--scale 0.5]
```

Default output: `<basename>-renders/<basename>-frame-N.png` next to the input file. Default scale 0.5 → 590×787 per frame.

Always render and review before presenting to the user. The render is intentionally simplified (no field SVG, just lines + circles) — it's a self-check, not a deliverable.

If `@napi-rs/canvas` isn't installed (`Cannot find module '@napi-rs/canvas'`), run `npm install --save-dev @napi-rs/canvas`.

## Common mistakes

- **Players overlap** — distance between two players' `(x, y)` < 25 (`2 × PLAYER_RADIUS`). The render makes this obvious.
- **Wrong "front" direction** — remember the attacking team faces toward smaller y. "Place X in front of Y" means smaller y for X.
- **Inconsistent IDs after duplicating a frame** — `duplicateFrame` in [src/lib/canvas-utils.ts](../../../src/lib/canvas-utils.ts) regenerates every id. If you copy a frame manually in JSON, regenerate every id inside it.
- **Forgetting that consecutive frames track by `${team}-${number}`** — video export will interpolate the wrong player if you change a player's number between frames.

## Example reference

[src/examples/22m-touch-setup-options.json](../../../src/examples/22m-touch-setup-options.json) — 22m touch lineout setup with stacked cuts (5 in front of 12, 8 in front of 15), looping 11, equal back-line spacing, and the lineout combination across 5 frames. Use this as a structural template.
