# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Dev workflow runs in Docker (Node 20 Alpine, Vite dev server on port 5000). Common workflows are wrapped as slash commands in [.claude/commands/](.claude/commands/): `/dev`, `/preview`, `/shell`, `/logs`, `/kill5000`.

Direct npm scripts:

- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b --noCheck && vite build` (intentionally skips typechecking)
- `npm run lint` — ESLint
- `npm run preview` — preview built bundle

There is no test suite configured.

## Deployment

The app is deployed to **Render** as a Docker web service at `rugby-plays-editor.onrender.com` (allowlisted in [vite.config.ts](vite.config.ts)). The [Dockerfile](Dockerfile) builds the bundle and runs `npm run preview`; Render config is managed in the Render dashboard (no `render.yaml` in the repo).

This repo was originally scaffolded from a **GitHub Spark template** but is no longer deployed via Spark. Spark packages (`@github/spark/*`) remain in the dependency tree because they're still referenced by the runtime — see "Spark heritage" below.

## Architecture

Single-page React 19 + Vite + TypeScript tool for designing rugby plays as animated multi-frame sequences. There is no backend service; all state lives in the browser.

### Spark heritage (still load-bearing)

- [src/main.tsx](src/main.tsx) imports `@github/spark/spark` to bootstrap the Spark runtime.
- [vite.config.ts](vite.config.ts) registers `sparkPlugin()` and `createIconImportProxy()` from `@github/spark` — **do not remove** them; the icon proxy in particular is what makes `@phosphor-icons/react` imports resolve.
- Persistent app state uses `useKV` from `@github/spark/hooks` (see [src/App.tsx](src/App.tsx)). It behaves like `useState` but persists across reloads under a string key (e.g. `'rugby-frames'`, `'rugby-saved-frames'`). The setter accepts an updater function `(current) => next` and `current` may be `undefined` on first render — always handle that case.

### Core data model — [src/lib/types.ts](src/lib/types.ts)

A **Frame** is `{ id, players[], ball | null, emojis[] }`. Each player/ball/emoji has its own `id` and `(x, y)` in field coordinates. A **project** is `Frame[]` plus an optional `CropRegion`. Two persistence layers exist side-by-side: the live working frames (`rugby-frames`), a library of saved single frames (`rugby-saved-frames`), and saved projects (`rugby-saved-projects`). Projects can additionally be exported/imported as JSON files via [src/lib/project-utils.ts](src/lib/project-utils.ts).

### Canvas rendering

Field coordinates are fixed at `FIELD_WIDTH × FIELD_HEIGHT = 1180 × 1573` ([src/lib/canvas-utils.ts:6-7](src/lib/canvas-utils.ts#L6-L7)). The displayed `<canvas>` is scaled by CSS, and [RugbyFieldCanvas.tsx](src/components/RugbyFieldCanvas.tsx) maps mouse events back to field coords using `getBoundingClientRect()`. Object placement is constrained inside `[PLAYER_RADIUS, FIELD_WIDTH - PLAYER_RADIUS]` — keep new tools consistent with this clamping.

The same draw functions (`drawRugbyField`, `drawPlayer`, `drawBall`, `drawEmoji`) are reused both by the on-screen canvas and the offline video-export canvas, so any rendering change shows up in both places automatically.

### Video export — [src/lib/video-export.ts](src/lib/video-export.ts)

Exports run entirely in-browser via `MediaRecorder` capturing an offscreen `<canvas>` `captureStream(fps)`, output is `video/webm;codecs=vp9`. Between consecutive frames, players are matched by `${team}-${number}` (not by `id`) and linearly interpolated; emojis are matched by **array index**; the ball is interpolated when present in both frames. If a `cropRegion` is set, a second canvas crops the field before encoding.

### Tools and interaction model

`Tool = 'select' | 'player' | 'ball' | 'emoji' | 'delete' | 'crop'`. The active tool drives `handleMouseDown` in `RugbyFieldCanvas`. `select` supports multi-select with Cmd/Ctrl-click, Cmd/Ctrl-A to select all, and Cmd/Ctrl-Backspace/Delete to remove selection. Only one ball is allowed per frame.

### UI components

shadcn/ui (new-york style, neutral base, CSS variables) lives under [src/components/ui/](src/components/ui/) and is configured in [components.json](components.json). Icon libraries in use: `lucide-react` (shadcn default) and `@phosphor-icons/react` (proxied through Spark's icon plugin). The path alias `@/` maps to `src/`.

## Conventions

- Build skips type errors (`tsc --noCheck`) — rely on the editor / `npm run lint` for type signals.
- `strictNullChecks: true` is on in [tsconfig.json](tsconfig.json); other strict flags are off.
- When mutating frame state from `useKV`, always copy: clone with `JSON.parse(JSON.stringify(...))` before storing into `savedFrames`/`savedProjects`, and use the functional setter form because `current` may be `undefined`.
- When duplicating a frame, regenerate IDs for the frame and every contained object (see `duplicateFrame` in [canvas-utils.ts:43-48](src/lib/canvas-utils.ts#L43-L48)).
- When changing the deployed hostname, update the `allowedHosts` entry in [vite.config.ts](vite.config.ts) so Render's preview server accepts the request.
