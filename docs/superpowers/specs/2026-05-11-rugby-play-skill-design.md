# Rugby play skill — design

**Date:** 2026-05-11
**Status:** Pending user review

## Goal

A project-level Claude Code skill that helps generate and edit rugby play JSON files for the rugby-plays-editor app. Captures the rugby vocabulary, JSON schema conventions, and conversation rhythm proven out while building [src/examples/22m-touch-setup-options.json](src/examples/22m-touch-setup-options.json), plus a headless render tool so Claude can self-verify per-frame output before showing it to the user.

## Files

```
.claude/skills/rugby-play/
  SKILL.md
  references/
    vocabulary.md
    schema.md
  scripts/
    render-play.mjs
```

Plus `canvas` added to `devDependencies` for the render script.

## SKILL.md outline

**Frontmatter:**
- `name: rugby-play`
- `description: Use when designing, creating, or editing a rugby play JSON file for the rugby-plays-editor app — set-pieces (lineout, scrum, kickoff, restart), structured backs plays, or any positional rugby diagram. Covers union vocabulary translation (EN/FR), the field coordinate system, and per-frame PNG preview verification.`

**Sections in order:**

1. **Overview** — one paragraph: what this skill is, when to use, terminal output is a JSON file in `src/examples/`.
2. **Pre-generation checklist** — capture before producing JSON:
   - Set-piece type and field location (5m, 22m, halfway…)
   - Players per side, lineout/scrum composition
   - Attacking shape: pods, cuts, options, decision points
   - Defending shape: alignment, sweepers, who marks whom
   - Number of frames and what changes between each
3. **Positioning conventions** (extracted from the session):
   - Attacking team attacks toward smaller y → "in front of" = smaller y
   - Stacked cuts: same x, deeper y, cut runner staged ahead of the receiver they cut on
   - Equal lateral spacing across the back line (`10→12 = 12→15 = 15→13`, `13→14 ≈ 1.3×D`)
   - Defenders share the offside line at fixed y unless explicitly staggered for cover roles
   - Lateral offset ≥30 px shows pod pairings visibly (player diameter ≈ 25)
   - Clamp x to `[PLAYER_RADIUS, FIELD_WIDTH - PLAYER_RADIUS]`
4. **Generation workflow**:
   - Capture description → write JSON to `src/examples/<slug>.json`
   - Run render script → review PNG per frame → fix overlaps, off-field, inconsistencies
   - Present to user with a position summary
5. **Iteration patterns**:
   - Same `(x, y)` across all frames → `Edit` with `replace_all` on a unique `"number": N,  "team": "red|blue",  "x": X,  "y": Y` substring
   - Single-frame change → per-frame `Edit` keyed by the frame-specific id (`r5-f3`)
6. **Preview tool** — invocation, output location, how to read the frames.
7. **Common mistakes** — overlapping players, wrong "front" direction, ID collisions after duplicating frames (must regenerate per `duplicateFrame` in [src/lib/canvas-utils.ts](src/lib/canvas-utils.ts)), forgetting that `useKV` `current` may be `undefined`.
8. **Example reference** — pointer to [src/examples/22m-touch-setup-options.json](src/examples/22m-touch-setup-options.json).
9. **References** — link to `references/vocabulary.md` and `references/schema.md`.

## references/vocabulary.md

Glossary table organized by category. Each entry has the canonical English term, FR alias (when one exists and is confident), and a one-line gloss when non-obvious. Uncertain FR aliases marked `[FR?]`.

**Categories:**

- **Set-pieces & field positions** — lineout / touche, scrum / mêlée, kickoff / coup d'envoi, drop-out / renvoi (aux 22), 22m / ligne des 22, 5m / ligne des 5, halfway / ligne médiane, try line / ligne d'en-but, touch / touche (latéral), in-goal / en-but, dead-ball line / ligne de ballon mort
- **Player roles (1–15)** — full position names and FR aliases (talonneur, ouvreur, premier centre, deuxième centre, ailier, arrière, etc.)
- **Attacking moves** — cut / coupe, switch / croisé, loop / saut de saute-mouton, miss-pass / passe sautée, dummy / fixation feinte, decoy / leurre, +1 / +1, hit-up / charge (or pénétration), pod / pod, screen / écran, pull-back / passe en retrait, wraparound / wraparound, line of running / course
- **Defensive** — drift / glissée, blitz / montée agressive (or "umbrella"), jam / jam, pillar / pilier (défensif), post / poste, sweeper / couvreur arrière, 13-defence / défense à 13, edge defender / défenseur extérieur
- **Lineout combos** — pod numbering (front/middle/tail = devant/milieu/queue), dummy jump / fausse levée, peel / peel, maul off the top / maul rapide, quick throw / remise rapide, lift / soulèvement
- **Tactical kicks** (for completeness; not commonly diagrammed in this app) — box kick / chandelle de poche, grubber / grubber, cross-field / coup de pied diagonal, drop goal / drop, up-and-under / chandelle

## references/schema.md

- Field constants: `FIELD_WIDTH = 1180`, `FIELD_HEIGHT = 1573`, `PLAYER_RADIUS` (≈12.6)
- Coordinate origin: top-left; attacking team typically attacks toward smaller y
- Key landmark y-values (approximate, to confirm against `canvas-utils.ts`): try line ~0, 5m ~83, 22m ~370, halfway ~786, opposing 22m ~1203, opposing 5m ~1490
- Frame shape:
  ```ts
  { id: string, players: Player[], ball: Ball | null, emojis: Emoji[] }
  ```
- Player: `{ id, number, team: 'red' | 'blue', x, y }` — id convention `r5-f1` = red #5, frame 1
- Ball: `{ id, x, y }`
- Emoji: `{ id, emoji, x, y }`
- Persistence keys: `rugby-frames` (live), `rugby-saved-frames` (library), `rugby-saved-projects` (projects)
- Examples directory: `src/examples/`

## scripts/render-play.mjs

**Approach:** Self-contained Node script. Does NOT import from `src/lib/canvas-utils.ts` because that file uses Vite path aliases and SVG asset imports (`@/assets/images/rugby-field.svg`) that don't resolve in Node. Instead, the render script implements a minimal field drawing in plain JS:

- Green background
- White lines for try lines (top + bottom), 5m, 22m, halfway, touch lines
- Red/blue circles for players with number labels
- Yellow/white circle for ball; emojis rendered with `fillText`

This is intentionally simpler than the in-app canvas — the goal is positional verification, not visual parity.

**Dependencies:** `canvas` npm package (added as devDep). Has native bindings (Cairo); install notes go in SKILL.md.

**CLI:**
```
node .claude/skills/rugby-play/scripts/render-play.mjs <play.json> [--out <dir>] [--scale 0.5]
```

Output: `<basename>-frame-1.png`, `-frame-2.png`, … in the chosen output directory (default: same dir as input, in a `<basename>-renders/` subfolder).

Default scale: 0.5 (output 590×787 per frame) — readable but small enough to view at a glance.

## Decisions made

| Decision | Choice | Reason |
|---|---|---|
| Reuse vs reimplement draw fns | Reimplement (minimal) in script | `canvas-utils.ts` has Vite-only imports; reimplementing only the parts needed is cleaner than fighting the bundler |
| Inline vs split references | Split into `references/` | Vocab + schema are substantial; keeps SKILL.md scannable |
| `canvas` devDep | Add | Required for headless rendering |
| Output format | One PNG per frame | Per user request; no video |
| FR aliases | All categories where confident; mark uncertain `[FR?]` | User explicitly asked for FR aliases throughout |
| TDD testing methodology | Skip formal RED-GREEN-REFACTOR | This skill is reference + tool, not discipline-enforcer. Verification loop is: render PNGs + user iteration on the JSON. Sanity check after build: have a subagent generate a play from a description and visually verify. |

## Acceptance criteria

- [ ] `.claude/skills/rugby-play/SKILL.md` exists with all listed sections; FR aliases referenced via the vocabulary file
- [ ] `references/vocabulary.md` covers all five categories above, with FR aliases where confident
- [ ] `references/schema.md` documents Frame/Player/Ball/Emoji shapes and field constants
- [ ] `scripts/render-play.mjs` runs on `src/examples/22m-touch-setup-options.json` and produces 5 readable frame PNGs in which each player can be identified and positional issues (overlaps, off-field) are visible
- [ ] `canvas` added to `devDependencies`
- [ ] Post-build sanity check: spawn a subagent with the skill and a short play description; confirm it produces a valid JSON file that loads in the app
