# Export All Examples / Scratch (Dev) — Design

**Date:** 2026-06-03
**Status:** Approved (pending spec review)
**Builds on:** [2026-06-03-batch-library-video-export-design.md](2026-06-03-batch-library-video-export-design.md)

## Problem

The library tab has an "Export all videos" button (batch video export). The dev-only
tabs in the Load Project dialog — **Examples** (`src/examples/*.json`) and **Scratch**
(dev-server scratch saves) — have no equivalent. A developer regenerating example
videos has to load and export each one by hand.

## Decisions (locked during brainstorming)

- **Where:** Both the Examples and Scratch dev tabs get an "Export all videos" button.
  Because both tabs render the shared `DevTab` component, the button is added once to
  `DevTab` and appears in both.
- **Settings:** Identical to the library export — fixed `frameDuration: 1`,
  `interpolationFrames: 30`, `fps: 30`, reusing `BatchExportProgressDialog` and the
  existing batch state/toasts.
- **Extraction:** Factor the sequential render-and-download loop out of
  `handleExportLibrary` into a shared, reusable runner so both the library and dev
  paths use one implementation.

## Scope

### In scope

- A reusable `runBatchExport` that renders + downloads a list of items sequentially,
  cancellably, tolerating per-item failure.
- Refactor the existing `handleExportLibrary` to use it (no behavior change).
- A dev-tab "Export all videos" button that exports every entry in the current dev
  tab (Examples or Scratch), reading each file's frames on demand.

### Out of scope (YAGNI)

- Changing dev-server endpoints or adding a server-side/disk export.
- Per-example or per-tab export settings.
- Any production (non-dev) exposure — the dev tabs only render under `isDev`.
- ZIP bundling (the library export already declined this).

## Architecture

### New: `src/lib/batch-export.ts` — generic batch runner

One responsibility: run a sequential, cancellable batch of video exports. It knows
nothing about React, the library, or the dev server — items provide their own async
loader, which is what lets dev items lazily read a file before rendering.

```ts
import { Frame, CropRegion } from './types'
import { generateVideo } from './video-export'
import { downloadBlob } from './download-utils'

export interface BatchExportItem {
  /** Display name; used as the download filename stem. */
  name: string
  /** Lazily produce the frames (and optional crop) to render. */
  load: () => Promise<{ frames: Frame[]; cropRegion?: CropRegion }>
}

export interface BatchExportCallbacks {
  /** Polled at the top of each item; return true to stop after the current item. */
  isCancelled: () => boolean
  /** Called when item `index` (0-based) named `name` starts. */
  onItemStart: (index: number, name: string) => void
  /** Render progress of the current item, 0..1. */
  onItemProgress: (progress: number) => void
}

export interface BatchExportResult {
  exported: number
  failed: number
  cancelled: boolean
}

export async function runBatchExport(
  items: BatchExportItem[],
  callbacks: BatchExportCallbacks,
): Promise<BatchExportResult> {
  let exported = 0
  let failed = 0

  for (let i = 0; i < items.length; i++) {
    if (callbacks.isCancelled()) break
    const item = items[i]
    callbacks.onItemStart(i, item.name)
    try {
      const { frames, cropRegion } = await item.load()
      const blob = await generateVideo(frames, 1, 30, 30, cropRegion, callbacks.onItemProgress)
      downloadBlob(blob, item.name)
      exported++
    } catch (error) {
      console.error(`Failed to export "${item.name}":`, error)
      failed++
    }
  }

  return { exported, failed, cancelled: callbacks.isCancelled() }
}
```

A failed `load()` (e.g. dev server unreachable mid-batch) is caught by the same
`try/catch` as a failed render, so it counts as a failure and the batch continues.

### `src/App.tsx` — one wrapper, two callers

Extract the dialog-state + toast orchestration into a single private `runBatch(items)`
that both paths call:

```ts
const runBatch = async (items: BatchExportItem[]) => {
  if (items.length === 0) return
  setLoadProjectDialogOpen(false)
  batchCancelRef.current = false
  setBatchProgress({ total: items.length, completed: 0, currentName: items[0].name, currentProgress: 0 })
  setBatchExportOpen(true)

  const { exported, failed, cancelled } = await runBatchExport(items, {
    isCancelled: () => batchCancelRef.current,
    onItemStart: (i, name) =>
      setBatchProgress((prev) => ({ ...prev, completed: i, currentName: name, currentProgress: 0 })),
    onItemProgress: (progress) =>
      setBatchProgress((prev) => ({ ...prev, currentProgress: progress })),
  })

  setBatchProgress((prev) => ({ ...prev, completed: exported + failed, currentProgress: 0 }))
  setBatchExportOpen(false)

  const total = items.length
  if (cancelled) {
    toast.message(`Cancelled — exported ${exported} of ${total} videos`)
  } else if (failed > 0) {
    toast.error(`Exported ${exported} of ${total} — ${failed} failed`)
  } else {
    toast.success(`Exported ${exported} video${exported !== 1 ? 's' : ''}`)
  }
}
```

- `handleExportLibrary` becomes: `runBatch((savedProjects || []).map(p => ({ name: p.name, load: async () => ({ frames: p.frames, cropRegion: p.cropRegion }) })))`. Same observable behavior as today.
- New `handleExportDevEntries(entries, reader)`:
  ```ts
  const handleExportDevEntries = (
    entries: DevEntry[],
    reader: (name: string) => Promise<SavedProject>,
  ) =>
    runBatch(
      entries.map((entry) => ({
        name: entry.name.replace(/\.json$/, ''),
        load: async () => {
          const project = await reader(entry.name)
          return { frames: project.frames, cropRegion: project.cropRegion }
        },
      })),
    )
  ```
  The `.json` strip matches how `DevTab.handleLoad` already derives a project name from a file entry, so downloaded videos are named e.g. `g-maison.mp4`, not `g-maison.json.mp4`.

This makes the post-loop `completed` correction and toasts identical for both paths
(the library-export end-state fix from the prior feature is preserved by living in
`runBatch`).

### `src/components/LoadProjectDialog.tsx` — wire the dev tabs

- Add prop `onExportDevEntries?: (entries: DevEntry[], reader: (name: string) => Promise<SavedProject>) => void`.
- Pass an `onExportAll` to each `DevTab`, binding the correct reader:
  - Scratch tab: `onExportAll={(entries) => onExportDevEntries?.(entries, readScratch)}`
  - Examples tab: `onExportAll={(entries) => onExportDevEntries?.(entries, readExample)}`

### `src/components/LoadProjectDialog.tsx` — `DevTab` button

`DevTab` already owns the fetched `entries` and renders a header row with a Refresh
button. Add:

- Prop `onExportAll?: (entries: DevEntry[]) => void`.
- An "Export all videos" button to the left of Refresh, shown only when
  `onExportAll` is provided and `entries` has length > 0. On click:
  `onExportAll(entries ?? [])`. Disabled while `loading`.

`DevTab` passes its own `entries` up; the parent already bound the correct reader, so
`DevTab` does not need to know about readers.

## Data flow

```
DevTab ("Export all videos" click, passes its fetched entries)
   -> LoadProjectDialog onExportAll (binds readExample / readScratch)
       -> App.handleExportDevEntries(entries, reader)
           -> App.runBatch(items)  // items[i].load = () => reader(name) -> {frames, cropRegion}
               -> runBatchExport(items, callbacks)
                     per item: load() -> generateVideo(1/30/30) -> downloadBlob
               -> summary toast

Library ("Export all videos" click)
   -> App.handleExportLibrary
       -> App.runBatch(items)  // items[i].load = async () => ({frames, cropRegion}) from in-memory project
           -> runBatchExport(...)  // same path
```

## Error handling

- Per-item `try/catch` in `runBatchExport` covers both `load()` and render failures;
  one failure never aborts the batch and is reflected in the summary toast.
- Empty list: `runBatch` returns immediately; the dev button is disabled when there
  are no entries, and the library button is disabled when the library is empty.
- Dev server down before export: `listExamples`/`listScratch` already fail and
  `DevTab` shows its error state with no entries, so the button is disabled.

## Testing

No automated suite / no test runner (browser-only `MediaRecorder`). Verify with
`npm run lint` + `npm run build`, plus a manual dev-mode browser check:

- In dev mode, open Load Project → Examples tab → "Export all videos" downloads one
  correctly named video per example file (`<example>.mp4`/`.webm`); success toast.
- Same on the Scratch tab.
- Cancel mid-batch stops after the current item; summary reflects the partial count.
- Stop the dev server, then trigger export: failures are counted, batch continues,
  and the summary toast reports the failures (or the button is disabled if the list
  never loaded).
- Regression: library "Export all videos" still works unchanged.
- `npm run build` succeeds; `npm run lint` shows no new errors.

## Risks

- **Browser multi-download prompt / wall-clock time:** same as the library export
  (accepted tradeoffs). Examples can be numerous, so the batch may run a while; the
  progress dialog + Cancel mitigate this.
- **Dev-only surface:** the dev tabs and dev-storage calls are gated by `isDev`; this
  feature adds no production code path.
