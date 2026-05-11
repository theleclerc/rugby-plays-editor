# Rugby Play Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a project-level Claude Code skill at `.claude/skills/rugby-play/` that captures the rugby vocabulary, JSON schema conventions, and conversation rhythm proven out while building the 22m touch lineout example, plus a headless `render-play.mjs` tool so Claude can self-verify per-frame output before showing it to the user.

**Architecture:** Self-contained skill directory with `SKILL.md` (main entry), two reference files (vocabulary, schema), and a Node render script that uses `@napi-rs/canvas` (prebuilt binaries, no Cairo install needed) to produce one PNG per frame. The render script reimplements the minimal drawing needed in plain JS rather than importing `src/lib/canvas-utils.ts` (which has Vite-only path aliases + SVG asset imports).

**Tech Stack:** Markdown for skill docs, Node ESM + `@napi-rs/canvas` for the render script.

**Spec:** [2026-05-11-rugby-play-skill-design.md](../specs/2026-05-11-rugby-play-skill-design.md)

---

## Task 1: Skill directory and devDependency

**Files:**
- Create: `.claude/skills/rugby-play/` (directory)
- Create: `.claude/skills/rugby-play/references/` (directory)
- Create: `.claude/skills/rugby-play/scripts/` (directory)
- Modify: `package.json` (add `@napi-rs/canvas` to devDependencies)

- [ ] **Step 1: Create the skill directories**

```bash
mkdir -p .claude/skills/rugby-play/references .claude/skills/rugby-play/scripts
```

- [ ] **Step 2: Install `@napi-rs/canvas` as devDep**

Run: `npm install --save-dev @napi-rs/canvas`

Expected: package.json `devDependencies` gains `"@napi-rs/canvas"`, `package-lock.json` updates. No native compile (prebuilt binary).

If install fails (network/registry), abort the task and surface the error to the user — don't proceed without the rendering library.

- [ ] **Step 3: Verify import works**

Run: `node -e "import('@napi-rs/canvas').then(m => console.log(typeof m.createCanvas))"`

Expected output: `function`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add @napi-rs/canvas devDep for rugby-play skill render tool

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(The empty skill directories aren't committed yet — git won't track empty dirs. They'll get committed in subsequent tasks as files land in them.)

---

## Task 2: Render script

**Files:**
- Create: `.claude/skills/rugby-play/scripts/render-play.mjs`

- [ ] **Step 1: Write the script**

Create `.claude/skills/rugby-play/scripts/render-play.mjs` with this content:

```javascript
#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, basename, join, extname, resolve } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'

const FIELD_WIDTH = 1180
const FIELD_HEIGHT = 1573
const PLAYER_RADIUS = 18 * 0.7
const BALL_RADIUS = 12 * 0.7
const EMOJI_SIZE = 24 * 0.7

const TEAM_COLORS = { red: '#dc2626', blue: '#2563eb' }
const FIELD_COLOR = '#3d7a40'
const LINE_COLOR = '#ffffff'

const LINES = [
  { yFrac: 0.05 }, { yFrac: 0.235 }, { yFrac: 0.5 },
  { yFrac: 0.765 }, { yFrac: 0.95 },
]

function drawPosts(ctx, x, y) {
  const postHeight = 56, postSpacing = 24, crossbarOffset = 28
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(x - postSpacing / 2, y); ctx.lineTo(x - postSpacing / 2, y - postHeight); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + postSpacing / 2, y); ctx.lineTo(x + postSpacing / 2, y - postHeight); ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x - postSpacing / 2, y - crossbarOffset); ctx.lineTo(x + postSpacing / 2, y - crossbarOffset); ctx.stroke()
}

function drawField(ctx, w, h) {
  ctx.fillStyle = FIELD_COLOR
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, w, h)
  for (const line of LINES) {
    const y = line.yFrac * h
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
  drawPosts(ctx, w / 2, h * 0.07)
  drawPosts(ctx, w / 2, h * 0.93)
}

function drawPlayer(ctx, p) {
  ctx.fillStyle = TEAM_COLORS[p.team] || '#888'
  ctx.beginPath()
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 16px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(p.number), p.x, p.y)
}

function drawBall(ctx, b) {
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#222222'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawEmoji(ctx, e) {
  ctx.font = `${EMOJI_SIZE}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(e.emoji, e.x, e.y)
}

function renderFrame(frame, scale) {
  const w = FIELD_WIDTH * scale
  const h = FIELD_HEIGHT * scale
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  drawField(ctx, FIELD_WIDTH, FIELD_HEIGHT)
  for (const p of frame.players) drawPlayer(ctx, p)
  if (frame.ball) drawBall(ctx, frame.ball)
  for (const e of frame.emojis || []) drawEmoji(ctx, e)
  return canvas.toBuffer('image/png')
}

function parseArgs(argv) {
  const args = { input: null, out: null, scale: 0.5 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out') args.out = argv[++i]
    else if (a === '--scale') args.scale = parseFloat(argv[++i])
    else if (!args.input) args.input = a
  }
  return args
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    console.error('Usage: render-play.mjs <play.json> [--out <dir>] [--scale <n>]')
    process.exit(1)
  }
  const { input, out, scale } = parseArgs(argv)
  const inputPath = resolve(input)
  const inputDir = dirname(inputPath)
  const inputBase = basename(inputPath, extname(inputPath))
  const outDir = out || join(inputDir, `${inputBase}-renders`)

  const data = JSON.parse(readFileSync(inputPath, 'utf-8'))
  const frames = data.frames || (Array.isArray(data) ? data : [data])

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  for (let i = 0; i < frames.length; i++) {
    const png = renderFrame(frames[i], scale)
    const fp = join(outDir, `${inputBase}-frame-${i + 1}.png`)
    writeFileSync(fp, png)
    console.log(`Wrote ${fp}`)
  }
}

main()
```

- [ ] **Step 2: Run the script against the existing example**

Run: `node .claude/skills/rugby-play/scripts/render-play.mjs src/examples/22m-touch-setup-options.json`

Expected:
- 5 lines of `Wrote ...22m-touch-setup-options-frame-N.png`
- Directory `src/examples/22m-touch-setup-options-renders/` created with 5 PNGs

- [ ] **Step 3: Verify PNGs are non-empty and look like rugby plays**

Run: `ls -la src/examples/22m-touch-setup-options-renders/`

Expected: 5 files, each > 5 KB (real image, not an error blank).

Then visually inspect one of the PNGs (e.g. read frame 1 with the Read tool — it accepts PNG). Confirm:
- Green field background visible
- White field lines visible (5m, 22m, halfway)
- Red and blue circles with numbers in positions matching the JSON
- No players outside the field
- Red 5 stacked in front of red 12 at x=440 (per the last commit on the example)

- [ ] **Step 4: Add the render output dir to .gitignore**

Render outputs are local artefacts. Append to `.gitignore`:

```
# rugby-play skill render outputs
src/examples/*-renders/
```

Use the Edit tool to add this; do NOT use `echo >>`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/rugby-play/scripts/render-play.mjs .gitignore
git commit -m "$(cat <<'EOF'
Add render-play.mjs preview tool for rugby-play skill

Headless Node script using @napi-rs/canvas that renders each frame
of a rugby play JSON to a PNG. Used by Claude to self-verify
positional layout before showing generated plays to the user.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: references/schema.md

**Files:**
- Create: `.claude/skills/rugby-play/references/schema.md`

- [ ] **Step 1: Write the schema reference**

Create `.claude/skills/rugby-play/references/schema.md` with this content:

```markdown
# JSON schema and coordinates

Source of truth for constants and types: [src/lib/canvas-utils.ts](../../../../src/lib/canvas-utils.ts) and [src/lib/types.ts](../../../../src/lib/types.ts).

## Field constants

| Constant | Value |
|---|---|
| `FIELD_WIDTH` | 1180 |
| `FIELD_HEIGHT` | 1573 |
| `PLAYER_RADIUS` | 12.6 (= 18 × 0.7) |
| `BALL_RADIUS` | 8.4 (= 12 × 0.7) |
| `EMOJI_SIZE` | 16.8 (= 24 × 0.7) |

## Coordinate system

- Origin: top-left
- x grows right, y grows down
- Attacking team conventionally attacks toward smaller y (top of canvas = opposing try line)
- Goal posts are drawn at `(width/2, height*0.07)` and `(width/2, height*0.93)` — these mark the in-goal areas

### Approximate y-values for reference lines

| Line | y |
|---|---|
| Top try line | 0 |
| 5m (top) | ~79 |
| 22m (top) | ~370 |
| Halfway | ~787 |
| 22m (bottom) | ~1203 |
| 5m (bottom) | ~1494 |
| Bottom try line | 1573 |

These are fractions of FIELD_HEIGHT used by the render script: 5m ≈ 0.05, 22m ≈ 0.235, halfway = 0.5, and mirrored.

## Document shape

```ts
{
  frames: Frame[],
  cropRegion?: { x: number, y: number, width: number, height: number }
}
```

### Frame

```ts
{
  id: string,
  players: Player[],
  ball: Ball | null,
  emojis: Emoji[]
}
```

### Player

```ts
{
  id: string,                  // convention: "<team-prefix><number>-f<frame#>"
  number: number,              // 1-15 typical
  team: 'red' | 'blue',
  x: number,
  y: number
}
```

**ID convention:** `r` for red, `b` for blue, followed by jersey number, `-f`, then 1-based frame index. Example: `r5-f3` = red #5 in frame 3.

Per-frame IDs let the app track players across frames. The video export matches players between consecutive frames by `${team}-${number}` (not by id), so jersey numbers must stay consistent across frames for the same logical player.

### Ball

```ts
{ id: string, x: number, y: number }
```

At most one ball per frame.

### Emoji

```ts
{ id: string, emoji: string, x: number, y: number }
```

## Persistence keys (in-app)

| Key | Holds |
|---|---|
| `rugby-frames` | Current working session |
| `rugby-saved-frames` | Library of single saved frames |
| `rugby-saved-projects` | Saved multi-frame projects |

## Examples directory

`src/examples/` — JSON files in this directory are loaded as starter projects from the app's example picker. New plays land here.

## Player constraints

- `x` ∈ `[PLAYER_RADIUS, FIELD_WIDTH - PLAYER_RADIUS]` ≈ `[12.6, 1167.4]`
- `y` ∈ `[PLAYER_RADIUS, FIELD_HEIGHT - PLAYER_RADIUS]` ≈ `[12.6, 1560.4]`
- Two players closer than `2 × PLAYER_RADIUS` (≈ 25) will visually overlap

## Duplicating frames

When duplicating a frame in JSON-land, regenerate every contained `id` (frame, players, ball, emojis). See `duplicateFrame` in [canvas-utils.ts](../../../../src/lib/canvas-utils.ts). The renaming convention is `<original-id>-fN` → `<original-id>-f(N+1)`, but uniqueness is what matters.
```

- [ ] **Step 2: Verify file exists and renders correctly**

Run: `wc -l .claude/skills/rugby-play/references/schema.md`

Expected: > 80 lines.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/rugby-play/references/schema.md
git commit -m "$(cat <<'EOF'
Document rugby-play JSON schema and field coordinates

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: references/vocabulary.md

**Files:**
- Create: `.claude/skills/rugby-play/references/vocabulary.md`

- [ ] **Step 1: Write the vocabulary reference**

Create `.claude/skills/rugby-play/references/vocabulary.md` with this content:

```markdown
# Rugby vocabulary (EN / FR)

Glossary for translating user descriptions into JSON. FR aliases marked `[FR?]` are best-effort — confirm with the user if used in a title or commit message.

## Set-pieces & field positions

| English | French | Notes |
|---|---|---|
| Lineout | Touche | Throw-in from touch |
| Scrum | Mêlée | |
| Kickoff | Coup d'envoi | Halfway, restart of half |
| Drop-out | Renvoi aux 22 | Defensive restart from 22 |
| Restart | Remise en jeu | Generic restart |
| 22m line | Ligne des 22 | |
| 5m line | Ligne des 5 | |
| 10m line | Ligne des 10 | |
| Halfway | Ligne médiane | |
| Try line | Ligne d'en-but | |
| Touch | Touche | Sideline |
| In-goal | En-but | |
| Dead-ball line | Ligne de ballon mort | |
| Goal line | Ligne de but | Same as try line |

## Player roles (1–15)

| # | English | French |
|---|---|---|
| 1 | Loosehead prop | Pilier gauche |
| 2 | Hooker | Talonneur |
| 3 | Tighthead prop | Pilier droit |
| 4 | Lock | Deuxième ligne |
| 5 | Lock | Deuxième ligne |
| 6 | Blindside flanker | Troisième ligne aile (fermée) |
| 7 | Openside flanker | Troisième ligne aile (ouverte) |
| 8 | Number 8 | Numéro 8 |
| 9 | Scrum-half | Demi de mêlée |
| 10 | Fly-half | Demi d'ouverture (ouvreur) |
| 11 | Left wing | Ailier gauche |
| 12 | Inside centre | Premier centre |
| 13 | Outside centre | Deuxième centre |
| 14 | Right wing | Ailier droit |
| 15 | Fullback | Arrière |

## Attacking moves

| English | French | Meaning |
|---|---|---|
| Cut | Coupe | Forward-running line cutting through the back line, usually a short pass |
| Switch | Croisé | Two runners exchanging lines |
| Loop | Saute-mouton `[FR?]` | Passer runs around the receiver to re-enter on the outside |
| Miss-pass | Passe sautée | Pass that skips a receiver |
| Dummy | Feinte de passe | Faked pass to draw a defender |
| Decoy / Dummy runner | Leurre | Runner who doesn't get the ball but draws defenders |
| +1 | +1 | Extra runner inserting into the line (commonly 11 or 15 from depth) |
| Hit-up | Charge / pénétration | Forward carry into the defensive line |
| Pod | Pod | Tight group (usually 3 forwards) working a phase |
| Screen | Écran | Runner crossing in front to obscure the receiver |
| Pull-back | Passe en retrait | Pass back to a trailing runner |
| Wraparound | Wraparound `[FR?]` | Similar to loop |
| Line of running | Course | Angle a runner takes |
| Out the back | Passe par-derrière `[FR?]` | Pass thrown behind a decoy to a deeper receiver |
| Crash ball | Ballon porté `[FR?]` / charge centrale | Hard carry from a centre |
| Tip-on / Tip pass | Passe courte | Short flat pass while running flat |

## Defensive

| English | French | Meaning |
|---|---|---|
| Drift | Glissée | Line slides outward as ball goes wide |
| Blitz / Rush | Montée agressive (umbrella) | Line comes up fast and flat |
| Jam | Jam `[FR?]` | Outside defender cuts in hard |
| Pillar | Pilier (défensif) | Defender stationed next to the breakdown |
| Post | Poste | Second defender out from the breakdown |
| Sweeper | Couvreur arrière | Back-field defender behind the line |
| 13-defence | Défense à 13 | Standard line defence: 13 in line, two back |
| Edge defender | Défenseur extérieur | Outermost defender in the line |
| Inside shoulder | Épaule intérieure | Direction of tackle/marking |
| Outside shoulder | Épaule extérieure | |

## Lineout combos

| English | French | Meaning |
|---|---|---|
| Pod numbering (front / middle / tail) | Devant / milieu / queue | Jumping positions in the lineout |
| Dummy jump | Fausse levée | Jumper lifts without the ball going there |
| Peel | Peel | Forward breaks off the back and runs around |
| Maul off the top | Maul rapide | Ball is tapped down, maul forms immediately |
| Quick throw | Remise rapide | Throw before the lineout forms |
| Lift | Soulèvement | Two supporters lifting a jumper |
| Movement / combination | Combinaison | The pre-throw shuffling sequence |
| Receiver | Sauteur principal `[FR?]` | The targeted jumper |

## Tactical kicks (rarely diagrammed in this app)

| English | French |
|---|---|
| Box kick | Chandelle de poche |
| Grubber | Grubber `[FR?]` |
| Cross-field kick | Coup de pied diagonal |
| Drop goal | Drop |
| Up-and-under | Chandelle |
| Touch finder | Coup de pied en touche |
```

- [ ] **Step 2: Verify file exists**

Run: `wc -l .claude/skills/rugby-play/references/vocabulary.md`

Expected: > 100 lines.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/rugby-play/references/vocabulary.md
git commit -m "$(cat <<'EOF'
Add rugby vocabulary reference (EN/FR) for rugby-play skill

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: SKILL.md

**Files:**
- Create: `.claude/skills/rugby-play/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Create `.claude/skills/rugby-play/SKILL.md` with this content:

````markdown
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
````

- [ ] **Step 2: Verify SKILL.md frontmatter is valid YAML and < 1024 chars total**

Run:

```bash
head -5 .claude/skills/rugby-play/SKILL.md && head -5 .claude/skills/rugby-play/SKILL.md | wc -c
```

Expected: the first 5 lines contain `---`, `name:`, `description:`, `---`, blank line. Total chars < 1024.

- [ ] **Step 3: Verify all cross-referenced files exist**

Run:

```bash
ls .claude/skills/rugby-play/references/vocabulary.md \
   .claude/skills/rugby-play/references/schema.md \
   src/examples/22m-touch-setup-options.json \
   src/lib/canvas-utils.ts \
   .claude/skills/rugby-play/scripts/render-play.mjs
```

Expected: all 5 files listed, no errors.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/rugby-play/SKILL.md
git commit -m "$(cat <<'EOF'
Add rugby-play skill main document

SKILL.md captures the pre-generation checklist, positioning
conventions, generation workflow, iteration patterns, and preview
tool usage for designing rugby plays in the rugby-plays-editor
JSON format.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: End-to-end sanity check

The spec explicitly skips formal RED-GREEN-REFACTOR testing. This task is a one-shot sanity verification: ensure the skill produces useful output on a fresh prompt.

**Files:**
- No file creation; this is a verification + bug-fix task

- [ ] **Step 1: Dispatch a subagent with the skill**

Spawn an Explore agent (read-only — it can search and verify but won't mutate the repo) with this prompt:

> "Read `.claude/skills/rugby-play/SKILL.md` and its referenced files. Then describe how you would design a JSON play for the following: a 5m attacking scrum (red attacking), 8 forwards each side packed in the scrum, red 9 ready to pick and pass, red 10 standing flat with 12 and 13 in a stepped line, blue defending with two flankers detached marking 9 and 10. Don't write the JSON — just enumerate the (x, y) positions for every player and explain your reasoning. Report under 300 words."

Use the Agent tool with `subagent_type: Explore`.

- [ ] **Step 2: Review the subagent's report**

Check:
- Did it correctly use the field coordinate system (smaller y = attacking direction)?
- Did it apply the positioning conventions (lateral spacing, clamping, no overlaps)?
- Did it use rugby vocabulary correctly?
- Did it reference the schema constants accurately (FIELD_WIDTH = 1180 etc.)?

- [ ] **Step 3: If issues found, fix the skill**

Common fixes:
- If subagent got the "front" direction wrong → tighten the wording in the "Positioning conventions" section
- If subagent didn't find the example file → add a more prominent link near the top of SKILL.md
- If subagent invented its own coordinate values → reinforce the field constants by promoting them earlier in schema.md

Apply targeted edits via the Edit tool.

- [ ] **Step 4: Render the existing example one more time to confirm the tool still works after any edits**

Run: `node .claude/skills/rugby-play/scripts/render-play.mjs src/examples/22m-touch-setup-options.json`

Expected: 5 PNGs generated without errors. (No-op if no edits were needed.)

- [ ] **Step 5: If any fix was made, commit**

```bash
git add .claude/skills/rugby-play/
git commit -m "$(cat <<'EOF'
Tighten rugby-play skill based on sanity-check feedback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(Skip this step if no edits were needed.)

- [ ] **Step 6: Final verification**

Run: `git log --oneline -8`

Expected: commit history shows the 5–6 commits from this plan on top of `549bcae Spec rugby-play skill design`.

---

## Notes for the executor

- **Branch:** Stay on `feat/base-examples`. The skill is the tooling that produced the example already on this branch — natural fit.
- **No worktree:** The work is additive (new files), so an isolated worktree isn't required. Keep changes on the current branch.
- **Auto mode is on** in this session — the user expects autonomous execution. Don't pause for confirmation between tasks unless something fails unexpectedly.
- **If `npm install --save-dev @napi-rs/canvas` fails** — stop and surface the error. Don't fall back silently to a different library; the skill docs reference `@napi-rs/canvas` by name.
