# Export All Examples / Scratch (Dev) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add an "Export all videos" button to the dev-only Examples and Scratch tabs, reusing the batch export machinery, by extracting a shared batch runner.

**Architecture:** A new framework-agnostic `runBatchExport(items, callbacks)` runs the sequential, cancellable render+download loop. `App` keeps one `runBatch` wrapper (dialog state + toast) with two callers: the refactored `handleExportLibrary` and a new `handleExportDevEntries(entries, reader)`. The shared `DevTab` component gets an `onExportAll` prop + button, so both dev tabs get it.

**Tech Stack:** React 19 + TS, shadcn/ui, `@phosphor-icons/react`, sonner, browser `MediaRecorder` (via existing `generateVideo`).

---

## Context for the implementer

- **No test suite / no test runner.** Verify with `npx eslint <files>` (and `npm run build` in the final task). Build skips typecheck; eslint is the type signal. Pre-existing lint issues live only in `src/lib/storage.ts` and a `react-hooks/set-state-in-effect` warning in `LoadProjectDialog.tsx`'s `DevTab` (line ~199) — both predate this work; ignore them, but introduce no NEW errors/warnings.
- Branch: `feat/batch-library-video-export`. Work from `/app`. Do not switch branches. End every commit message with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Existing pieces this builds on (already on the branch): `src/lib/download-utils.ts` (`downloadBlob`), `src/lib/video-export.ts` (`generateVideo(frames, frameDuration, interpolationFrames, fps, cropRegion?, onProgress?)`), `src/components/BatchExportProgressDialog.tsx` (`BatchExportProgress` type), and `handleExportLibrary` in `src/App.tsx`.
- `DevEntry` is `{ name: string; savedAt: number; frameCount: number }` exported from `src/lib/dev-storage.ts`. `name` is a filename like `"g-maison.json"`. `readExample`/`readScratch` (also in dev-storage) take that filename and return a full `SavedProject` (`{ id, name, frames, cropRegion?, viewPreset?, createdAt }`).

---

## File structure

- **Create** `src/lib/batch-export.ts` — generic sequential batch runner (no React, no app/dev specifics).
- **Modify** `src/App.tsx` — extract `runBatch`, refactor `handleExportLibrary` to use the runner, add `handleExportDevEntries`, wire `onExportDevEntries` into `LoadProjectDialog`, drop the now-unused `downloadBlob` import.
- **Modify** `src/components/LoadProjectDialog.tsx` — `onExportDevEntries` prop; `DevTab` gains `onExportAll` + button; wire both `DevTab` instances.

---

## Task 1: Shared batch runner

**Files:**
- Create: `src/lib/batch-export.ts`

- [ ] **Step 1: Create the file** with EXACTLY:

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

/**
 * Render and download each item sequentially. Cancellable between items
 * (the current item always finishes). A failed load() or render is caught,
 * counted as a failure, and does not abort the batch. Fixed export settings
 * match the single/library export: 1s per frame, 30 transition frames, 30fps.
 */
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

- [ ] **Step 2: Lint.** Run `npx eslint src/lib/batch-export.ts` — expect clean.

- [ ] **Step 3: Commit.**
```bash
git add src/lib/batch-export.ts
git commit -m "feat: extract shared runBatchExport runner

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: App.tsx — use the runner, add dev-entries export

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Imports.**
  - Add: `import { runBatchExport, type BatchExportItem } from '@/lib/batch-export'` near the other `@/lib` imports.
  - The dev-storage import line currently reads `import { writeScratch, writeExample, slugify } from '@/lib/dev-storage'`. Change it to also import the `DevEntry` type:
    `import { writeScratch, writeExample, slugify, type DevEntry } from '@/lib/dev-storage'`
  - Remove the now-unused line `import { downloadBlob } from '@/lib/download-utils'` (after this task `downloadBlob` is no longer referenced in App.tsx — confirm with eslint in Step 5). Keep the `generateVideo` import (still used by `handleExport`).

- [ ] **Step 2: Replace `handleExportLibrary` with `runBatch` + two callers.**

Replace the ENTIRE existing `handleExportLibrary` function (it currently starts with `const handleExportLibrary = async () => {` and ends at the matching `}` after the toast block — the full current body is reproduced here so you can match it exactly):

```ts
  const handleExportLibrary = async () => {
    const projects = savedProjects || []
    if (projects.length === 0) return

    setLoadProjectDialogOpen(false)
    batchCancelRef.current = false
    setBatchProgress({
      total: projects.length,
      completed: 0,
      currentName: projects[0].name,
      currentProgress: 0,
    })
    setBatchExportOpen(true)

    let exported = 0
    let failed = 0

    for (let i = 0; i < projects.length; i++) {
      if (batchCancelRef.current) break
      const project = projects[i]
      setBatchProgress((prev) => ({
        ...prev,
        completed: i,
        currentName: project.name,
        currentProgress: 0,
      }))

      try {
        const blob = await generateVideo(
          project.frames,
          1,
          30,
          30,
          project.cropRegion,
          (progress) =>
            setBatchProgress((prev) => ({ ...prev, currentProgress: progress }))
        )
        downloadBlob(blob, project.name)
        exported++
      } catch (error) {
        console.error(`Failed to export "${project.name}":`, error)
        failed++
      }
    }

    const cancelled = batchCancelRef.current
    setBatchProgress((prev) => ({
      ...prev,
      completed: exported + failed,
      currentProgress: 0,
    }))
    setBatchExportOpen(false)

    if (cancelled) {
      toast.message(`Cancelled — exported ${exported} of ${projects.length} videos`)
    } else if (failed > 0) {
      toast.error(`Exported ${exported} of ${projects.length} — ${failed} failed`)
    } else {
      toast.success(`Exported ${exported} video${exported !== 1 ? 's' : ''}`)
    }
  }
```

with these three functions:

```ts
  const runBatch = async (items: BatchExportItem[]) => {
    if (items.length === 0) return

    setLoadProjectDialogOpen(false)
    batchCancelRef.current = false
    setBatchProgress({
      total: items.length,
      completed: 0,
      currentName: items[0].name,
      currentProgress: 0,
    })
    setBatchExportOpen(true)

    const { exported, failed, cancelled } = await runBatchExport(items, {
      isCancelled: () => batchCancelRef.current,
      onItemStart: (i, name) =>
        setBatchProgress((prev) => ({
          ...prev,
          completed: i,
          currentName: name,
          currentProgress: 0,
        })),
      onItemProgress: (progress) =>
        setBatchProgress((prev) => ({ ...prev, currentProgress: progress })),
    })

    const total = items.length
    setBatchProgress((prev) => ({
      ...prev,
      completed: exported + failed,
      currentProgress: 0,
    }))
    setBatchExportOpen(false)

    if (cancelled) {
      toast.message(`Cancelled — exported ${exported} of ${total} videos`)
    } else if (failed > 0) {
      toast.error(`Exported ${exported} of ${total} — ${failed} failed`)
    } else {
      toast.success(`Exported ${exported} video${exported !== 1 ? 's' : ''}`)
    }
  }

  const handleExportLibrary = () =>
    runBatch(
      (savedProjects || []).map((project) => ({
        name: project.name,
        load: async () => ({ frames: project.frames, cropRegion: project.cropRegion }),
      })),
    )

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

Notes: `SavedProject` is already imported in App.tsx (from `@/lib/types`). The `setLoadProjectDialogOpen(false)` now lives inside `runBatch`, so both callers close the load dialog before the batch starts — same as the old behavior for the library path.

- [ ] **Step 3: Pass the new prop to `LoadProjectDialog`.**
In the existing `<LoadProjectDialog ... />` JSX (which already has `onExportLibrary={handleExportLibrary}`), add:
```tsx
          onExportDevEntries={handleExportDevEntries}
```

- [ ] **Step 4: Lint.** Run `npx eslint src/App.tsx` — expect clean (no unused-import error for `downloadBlob`; if eslint reports `downloadBlob` is unused you forgot to remove its import in Step 1; if it reports `runBatchExport`/`BatchExportItem`/`DevEntry` unused you missed Step 2).

- [ ] **Step 5: Commit.**
```bash
git add src/App.tsx
git commit -m "feat: reuse batch runner for library and add dev-entries export

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: LoadProjectDialog — dev-tab export button

**Files:**
- Modify: `src/components/LoadProjectDialog.tsx`

Anchors (verify by reading the file before editing):
- `interface LoadProjectDialogProps { ... }` with an existing `onExportLibrary?: () => void`.
- The component destructure `export function LoadProjectDialog({ ..., onExportLibrary }: LoadProjectDialogProps) {`.
- Two `<DevTab ... />` usages: the Scratch one passes `reader={readScratch}`, the Examples one passes `reader={readExample}`.
- `interface DevTabProps { active; fetcher; reader; deleter; onLoad; emptyText }` and `function DevTab({ active, fetcher, reader, deleter, onLoad, emptyText }: DevTabProps) {`.
- Inside `DevTab`'s return: a header `<div className="flex justify-end">` containing a single Refresh `<Button>`.
- `Download` is already imported from `@phosphor-icons/react` (added for the library button). `DevEntry` and `SavedProject` are already imported.

- [ ] **Step 1: Add `onExportDevEntries` to `LoadProjectDialogProps`.** After the existing `onExportLibrary?: () => void` line, add:
```ts
  onExportDevEntries?: (
    entries: DevEntry[],
    reader: (name: string) => Promise<SavedProject>,
  ) => void
```

- [ ] **Step 2: Destructure it.** In the component signature, after `onExportLibrary,` add `onExportDevEntries,`.

- [ ] **Step 3: Wire both `DevTab` instances.**
  - On the Scratch `<DevTab ...>` (the one with `reader={readScratch}`), add prop:
    ```tsx
                onExportAll={(entries) => onExportDevEntries?.(entries, readScratch)}
    ```
  - On the Examples `<DevTab ...>` (the one with `reader={readExample}`), add prop:
    ```tsx
                onExportAll={(entries) => onExportDevEntries?.(entries, readExample)}
    ```

- [ ] **Step 4: Add `onExportAll` to `DevTabProps` and destructure it.**
  - In `interface DevTabProps`, after `onLoad: (project: SavedProject) => void`, add:
    ```ts
      onExportAll?: (entries: DevEntry[]) => void
    ```
  - Change the destructure to: `function DevTab({ active, fetcher, reader, deleter, onLoad, onExportAll, emptyText }: DevTabProps) {`

- [ ] **Step 5: Add the button to `DevTab`'s header row.**
Replace the header div. It currently is:
```tsx
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <ArrowsClockwise size={14} className="mr-1" />
          Refresh
        </Button>
      </div>
```
with:
```tsx
      <div className="flex justify-end gap-2">
        {onExportAll && entries && entries.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onExportAll(entries)}
            className="gap-2"
          >
            <Download weight="bold" className="w-4 h-4" />
            Export all videos
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <ArrowsClockwise size={14} className="mr-1" />
          Refresh
        </Button>
      </div>
```
(`entries` is `DevTab`'s existing state variable, `DevEntry[] | null`; the `entries && entries.length > 0` guard hides the button while loading or empty.)

- [ ] **Step 6: Lint.** Run `npx eslint src/components/LoadProjectDialog.tsx` — expect only the PRE-EXISTING `react-hooks/set-state-in-effect` warning in `DevTab` (line ~199). No new errors/warnings.

- [ ] **Step 7: Commit.**
```bash
git add src/components/LoadProjectDialog.tsx
git commit -m "feat: add Export all videos button to dev tabs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Build + verification

**Files:** none (verification only)

- [ ] **Step 1: Full lint.** Run `npm run lint`. Expect only pre-existing issues (`src/lib/storage.ts` errors; the one `DevTab` set-state-in-effect warning). No new problems in `batch-export.ts`, `App.tsx`, or `LoadProjectDialog.tsx`.

- [ ] **Step 2: Build.** Run `npm run build`. Expect success (chunk-size advisory is pre-existing and fine).

- [ ] **Step 3: Manual dev-mode browser checklist (record results; needs a real browser + running dev server).**
  1. `npm run dev`; open Load Project → **Examples** tab → "Export all videos" appears; click it → load dialog closes, batch progress dialog runs, one correctly named video downloads per example (`<example>.mp4`/`.webm`), success toast.
  2. **Scratch** tab → same behavior (export all scratch saves).
  3. Cancel mid-batch → stops after current item; toast shows partial count.
  4. Stop the dev server, then trigger export → failures counted, batch continues, toast reports failures (or button hidden if list never loaded).
  5. Regression: library **My library** "Export all videos" still works unchanged.

- [ ] **Step 4: Final confirmation.** Confirm Steps 1–2 pass and all task commits are in place. If a fix was needed, commit it with the `Co-Authored-By` trailer.

---

## Self-review notes

- **Spec coverage:** shared runner (Task 1) ✓; library refactored to use it, no behavior change (Task 2) ✓; dev-entries export reading each file via reader, `.json` stripped from filename (Task 2) ✓; button on both dev tabs via shared `DevTab` (Task 3) ✓; fixed 1/30/30 + reused dialog/toasts (Task 1 + `runBatch`) ✓; per-item failure tolerance incl. failed `load()` (Task 1) ✓; dev-only (button only in `isDev` tabs) ✓.
- **Type consistency:** `BatchExportItem` (`name`, `load`) defined in Task 1, consumed in Task 2; `runBatchExport(items, {isCancelled,onItemStart,onItemProgress})` signature matches between Task 1 and the call in Task 2; `onExportDevEntries(entries, reader)` and `onExportAll(entries)` signatures consistent across Tasks 2–3; `DevEntry`/`SavedProject` already imported where used.
- **No placeholders.**
