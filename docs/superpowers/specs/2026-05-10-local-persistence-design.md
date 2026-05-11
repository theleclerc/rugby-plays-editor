# Local persistence for projects and frames

Date: 2026-05-10
Status: Draft

## Goal

Replace the current Spark-coupled persistence layer with a small, self-owned mechanism that:

1. Persists each user's saved frames and projects in their own browser (deployed on Render).
2. Lets dev save personal scratch work to a gitignored folder on disk.
3. Lets dev curate example projects that ship with the app and load by default for new visitors.

Audience for the deployed app: many anonymous users, each isolated to their own browser. No accounts, no cross-device sync, no backend service.

## Background

Today the app uses `useKV` from `@github/spark/hooks` for persistent state under four keys: `rugby-frames`, `rugby-saved-frames`, `rugby-saved-projects`, `rugby-crop-region`. The repo was scaffolded from a GitHub Spark template but is now deployed to Render, so persistence relies on whatever fallback `useKV` does off Spark hosting — opaque and tied to a deprecated package. Existing JSON export/import via [src/lib/project-utils.ts](../../../src/lib/project-utils.ts) remains as an escape hatch and is not changed by this design.

## Approach

A custom `useKV`-shaped hook backed by `localStorage`, plus a Vite dev-only middleware for disk reads/writes, plus a build-time bundle of example projects seeded into the user's library on first visit.

Three approaches were considered: keep `useKV` as-is (rejected: storage semantics tied to Spark internals); IndexedDB-backed hook (rejected: async refactor not justified by data sizes here); localStorage-backed drop-in hook (chosen: ~5 MB cap is comfortable for hundreds of projects, sync API matches existing call sites).

## Architecture

### Storage layer

New module `src/lib/storage.ts`. Exports:

```ts
export function useKV<T>(
  key: string,
  initial: T
): [T | undefined, (next: T | ((current: T | undefined) => T)) => void]
```

Contract — deliberately matches the existing `@github/spark/hooks::useKV` so call sites in [src/App.tsx](../../../src/App.tsx) only change at the import path:

- Returns `[value, setValue]`. `value` is `undefined` on the first render; resolves to the persisted value or `initial` on the next render via a `useEffect`.
- `setValue` accepts a value or an updater function `(current: T | undefined) => T`.
- Writes are JSON-serialised under the literal `key` to `window.localStorage`.
- A `storage` event listener keeps two open tabs of the app coherent; last write wins.
- All errors are caught inside the hook. Parse errors fall back to `initial` with a `console.warn`. Write errors (notably `QuotaExceededError`) trigger a `toast.error` via `sonner` (already a project dep) — the hook owns this so call sites stay clean — and the in-memory state rolls back to the last persisted value.

Quota: localStorage caps at ~5–10 MB per origin. We do nothing automatic. On `QuotaExceededError`, the user sees *"Storage full — export and delete old projects"* and the write is dropped.

No schema versioning, no encryption, no compression — none earn their keep at the data sizes here.

### Examples bundle

New module `src/lib/examples-seed.ts`. Examples live as one JSON file each in `src/examples/`.

File shape:

```json
{
  "name": "Lineout Classic",
  "frames": [ /* Frame[] */ ],
  "cropRegion": null
}
```

This is `ProjectData` (from [project-utils.ts](../../../src/lib/project-utils.ts)) plus a `name`. No `id` or `createdAt` — those are generated at seed time so seeded items are indistinguishable from user-created ones.

Bundling: `import.meta.glob('../examples/*.json', { eager: true, import: 'default' })`. Inlined at build, no runtime fetch.

First-visit seeding: a sentinel key `rugby-seeded-v1` in localStorage. On app mount, after persisted state loads, `seedExamplesIfNeeded()` runs:

- If the sentinel is missing AND `rugby-saved-projects` is empty/undefined → assign new `id` + `createdAt = Date.now()` per example, push them into `rugby-saved-projects`, set sentinel = `'1'`.
- Otherwise do nothing.

The `-v1` suffix is the only versioning hook. Bumping to `-v2` re-seeds everyone once; we accept duplicates in libraries that still contain the originals.

### Dev disk middleware

New file `vite-plugins/dev-storage-plugin.ts`, registered in [vite.config.ts](../../../vite.config.ts) with `apply: 'serve'` so it ships zero bytes to production.

Folders:
- `dev-scratch/` at repo root — gitignored, personal scratch
- `src/examples/` — committed examples folder, dev can write here

Endpoints under `/__dev__`:

```
GET    /__dev__/scratch                  → [{ name, savedAt, frameCount }, ...]
GET    /__dev__/scratch/:name            → SavedProject JSON
PUT    /__dev__/scratch/:name            → body: SavedProject JSON
DELETE /__dev__/scratch/:name            → 204
```

Same four endpoints under `/__dev__/examples/*` for the committed examples folder.

Implementation: `configureServer(server) { server.middlewares.use('/__dev__', handler) }`. Handler is ~100 LOC of `node:fs/promises`:
- Filenames must match `/^[a-z0-9-_]+\.json$/i`.
- Resolved paths must remain inside the target folder (path traversal guard via `path.resolve` + `startsWith`).
- 404 / 400 with `{ error }` JSON for everything that goes wrong.

Frontend gateway: `src/lib/dev-storage.ts`:

```ts
export const isDev = import.meta.env.DEV
export async function listScratch(): Promise<DevEntry[]>
export async function readScratch(name: string): Promise<SavedProject>
export async function writeScratch(name: string, project: SavedProject): Promise<void>
export async function deleteScratch(name: string): Promise<void>
// + listExamples / readExample / writeExample / deleteExample
```

Each function short-circuits to an empty/no-op result when `!isDev`. Errors propagate; toasts happen at the call site.

Hot reload: when dev writes an example via the middleware, Vite's file watcher picks it up and `import.meta.glob` re-evaluates. Newly saved examples show up in the `Examples` tab of the load dialog without a manual reload. Already-seeded users' libraries do not auto-update; that's intentional.

### UI changes

**Toolbar:** unchanged.

**`SaveProjectDialog`** ([src/components/SaveProjectDialog.tsx](../../../src/components/SaveProjectDialog.tsx)): adds a destination radio group above the name input, visible only when `isDev`:

```
Save to:  ( ) My library      <- always shown, default
          ( ) Scratch          <- dev only
          ( ) Examples (repo)  <- dev only
```

In production, the radio is hidden; the dialog behaves exactly as today. Submit dispatches:
- `My library` → existing `setSavedProjects` path
- `Scratch` → `writeScratch(slugify(name), project)`
- `Examples (repo)` → `writeExample(slugify(name), project)`, plus a toast hint: *"Commit `src/examples/{slug}.json` to ship this with the app."*

`slugify(name)` lowercases, replaces non-alphanumerics with `-`, trims leading/trailing dashes. Resulting slug is rendered under the input as a preview. If the slug would clobber an existing scratch/example file, the dev middleware overwrites without confirmation — git is the safety net.

**`LoadProjectDialog`** ([src/components/LoadProjectDialog.tsx](../../../src/components/LoadProjectDialog.tsx)): adds a tab strip at the top — single "My library" tab in production, three tabs in dev:

```
[ My library ] [ Scratch ] [ Examples ]
```

Each dev tab fetches its list on first open. Same row UI per item: name, frame count, "Load" and "Delete" buttons. Loading any tab ends in `handleLoadSavedProject` — they all become `SavedProject` once loaded.

Loading state: an inline spinner row while a dev fetch is in flight. Failures show *"Dev server not reachable — retry?"* without blocking the dialog.

**Frame-level dialogs** ([SaveFrameDialog](../../../src/components/SaveFrameDialog.tsx) / [LoadFrameDialog](../../../src/components/LoadFrameDialog.tsx)): out of scope. Frames stay browser-only. Mirror the project flow if needed later.

### .gitignore

Add `dev-scratch/`.

## Migration

No migration code. The app isn't yet widely deployed, the JSON export/import escape hatch exists, and any rescue of Spark-internal storage shapes would be guesswork. Anyone with irreplaceable saves exports JSON before the deploy and re-imports after.

## Edge cases

| Case | Behavior |
|---|---|
| `localStorage` blocked (e.g. Safari private mode) | Falls back to in-memory state for the session. One `console.warn` on first use; no toast. |
| `QuotaExceededError` on write | Hook surfaces a toast directly via `sonner`; the write is dropped; in-memory state rolls back. |
| Corrupted JSON in storage | Parse error caught; falls back to `initial` with a `console.warn`. |
| Two open tabs | `storage` event handler updates the hook; last write wins. |
| Dev middleware unreachable | Dev-only tabs show a retry message; rest of the app unaffected. |

## Out of scope

- Cross-device sync, accounts, sharing.
- IndexedDB / large-data storage.
- Per-frame disk persistence.
- Schema versioning beyond the seeding sentinel.
- A "restore default examples" button.
- Auth on the dev middleware (binds to dev server only).
- Drag-and-drop import.

## Verification

No test suite is configured (per [CLAUDE.md](../../../CLAUDE.md)) and we are not adding one for this work. Manual verification checklist:

1. Fresh browser profile → reload → seeded examples appear in "My library".
2. Save a project → hard reload → still there.
3. Two open tabs → save in tab A → tab B's library reflects the save.
4. `localStorage.clear(); location.reload()` → re-seeds once; subsequent reloads do not double-seed.
5. In dev: Save → Scratch → file appears in `dev-scratch/`. Delete from UI → file gone.
6. In dev: Save → Examples → file appears in `src/examples/`. Reload → shows in the `Examples` tab.
7. Production parity: `npm run build && npm run preview` → no `Scratch` / `Examples` tabs visible; `/__dev__/*` endpoints not reachable.
8. Quota: stuff localStorage near the cap and confirm the toast surfaces and state rolls back.
