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
