# Batch Library Video Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-facing "Export all videos" action that renders every project in the library to video sequentially and downloads each file.

**Architecture:** A new pure download helper (`downloadBlob`) is shared by the existing single export and the new batch path. `App` orchestrates a sequential, cancellable loop over `savedProjects` calling the existing `generateVideo`, driving a dedicated progress dialog. The entry-point button lives in the "My library" tab of `LoadProjectDialog`.

**Tech Stack:** React 19 + TypeScript, shadcn/ui (Dialog, Button, Progress), `@phosphor-icons/react`, `sonner` toasts, browser `MediaRecorder`/canvas (via existing `src/lib/video-export.ts`).

---

## Context for the implementer

- There is **no test suite** (`npm test` does not exist). Verify each task with `npm run lint` and the manual browser checklist in the final task. Do not add a test runner.
- Build intentionally skips type errors, so lint is the type-signal. Run `npx eslint <files>` on the files you touched and confirm they are clean (the repo has pre-existing lint errors only in `src/lib/storage.ts` — ignore those).
- This branch (`feat/batch-library-video-export`) already contains the MIME-detection fix in `src/lib/video-export.ts` (`getSupportedMimeType`, MP4-first). The blob's `.type` is therefore `video/mp4` or `video/webm` depending on browser — the download helper derives the extension from it.
- `generateVideo` signature (do not change it):
  `generateVideo(frames: Frame[], frameDuration: number, interpolationFrames: number, fps: number, cropRegion?: CropRegion, onProgress?: (progress: number) => void): Promise<Blob>`
- `SavedProject` shape: `{ id, name, frames, cropRegion?, viewPreset?, createdAt }`.
- Fixed batch defaults (match current `ExportDialog` defaults): `frameDuration = 1`, `interpolationFrames = 30`, `fps = 30`.
- End every commit message with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File structure

- **Create** `src/lib/download-utils.ts` — pure-ish download helpers (`sanitizeFilename`, `extensionForBlob`, `downloadBlob`). One responsibility: turning a blob + name into a browser download.
- **Modify** `src/components/ExportDialog.tsx` — replace inline download with `downloadBlob` (dedupe).
- **Create** `src/components/BatchExportProgressDialog.tsx` — presentational progress overlay + exported `BatchExportProgress` type.
- **Modify** `src/App.tsx` — `handleExportLibrary` orchestration, batch state, wiring.
- **Modify** `src/components/LoadProjectDialog.tsx` — "Export all videos" button + `onExportLibrary` prop.

---

## Task 1: Download helper

**Files:**
- Create: `src/lib/download-utils.ts`

- [ ] **Step 1: Create the helper file**

Create `src/lib/download-utils.ts` with exactly:

```ts
/**
 * Turn an arbitrary display name into a safe download filename stem.
 * Non-alphanumeric runs collapse to a single hyphen; leading/trailing
 * hyphens are trimmed. Falls back to "rugby-play" if nothing remains.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned || 'rugby-play'
}

/** Pick the file extension from the blob's MIME type (mp4 vs webm). */
export function extensionForBlob(blob: Blob): string {
  return blob.type.includes('mp4') ? 'mp4' : 'webm'
}

/**
 * Trigger a browser download for `blob`, naming the file
 * `<sanitized baseName>.<ext>` where ext is derived from the blob type.
 */
export function downloadBlob(blob: Blob, baseName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(baseName)}.${extensionForBlob(blob)}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Lint the new file**

Run: `npx eslint src/lib/download-utils.ts`
Expected: no output (clean).

- [ ] **Step 3: Manually verify `sanitizeFilename` logic by inspection**

Confirm these mappings hold by reading the code (no runner available):
- `"40m lineout pod strike"` → `"40m-lineout-pod-strike"`
- `"  r-maison  "` → `"r-maison"`
- `"!!!"` → `"rugby-play"`
- `"semi-attaque/preto"` → `"semi-attaque-preto"`

- [ ] **Step 4: Commit**

```bash
git add src/lib/download-utils.ts
git commit -m "feat: add shared downloadBlob helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Use the helper in ExportDialog (dedupe)

**Files:**
- Modify: `src/components/ExportDialog.tsx` (imports; `handleDownload`)

- [ ] **Step 1: Add the import**

At the top of `src/components/ExportDialog.tsx`, after the existing icon import line (`import { Download, Play, X } from '@phosphor-icons/react'`), add:

```ts
import { downloadBlob } from '@/lib/download-utils'
```

- [ ] **Step 2: Replace `handleDownload` body**

Replace the entire current `handleDownload` function:

```ts
  const handleDownload = () => {
    if (!previewBlob) return
    
    const url = URL.createObjectURL(previewBlob)
    const extension = previewBlob.type.includes('mp4') ? 'mp4' : 'webm'
    const a = document.createElement('a')
    a.href = url
    a.download = `rugby-play-${Date.now()}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    onOpenChange(false)
    handleClosePreview()
  }
```

with:

```ts
  const handleDownload = () => {
    if (!previewBlob) return

    downloadBlob(previewBlob, `rugby-play-${Date.now()}`)

    onOpenChange(false)
    handleClosePreview()
  }
```

- [ ] **Step 3: Lint**

Run: `npx eslint src/components/ExportDialog.tsx`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/ExportDialog.tsx
git commit -m "refactor: use shared downloadBlob in ExportDialog

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Batch progress dialog component

**Files:**
- Create: `src/components/BatchExportProgressDialog.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/BatchExportProgressDialog.tsx` with exactly:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export interface BatchExportProgress {
  /** Total number of projects in the batch. */
  total: number
  /** How many projects have fully completed (rendered + downloaded). */
  completed: number
  /** Name of the project currently rendering. */
  currentName: string
  /** Render progress of the current project, 0..1. */
  currentProgress: number
}

interface BatchExportProgressDialogProps {
  open: boolean
  state: BatchExportProgress
  onCancel: () => void
}

export function BatchExportProgressDialog({
  open,
  state,
  onCancel,
}: BatchExportProgressDialogProps) {
  const { total, completed, currentName, currentProgress } = state
  const overall = total > 0 ? (completed + currentProgress) / total : 0

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            Exporting videos {Math.min(completed + 1, total)} / {total}
          </DialogTitle>
          <DialogDescription>
            Rendering &ldquo;{currentName}&rdquo;. Keep this tab focused until the
            batch finishes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Progress value={overall * 100} />
          <p className="text-xs text-muted-foreground">
            {completed} of {total} done
          </p>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Lint**

Run: `npx eslint src/components/BatchExportProgressDialog.tsx`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/components/BatchExportProgressDialog.tsx
git commit -m "feat: add batch export progress dialog

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Orchestration in App.tsx

**Files:**
- Modify: `src/App.tsx` (imports; new state/ref; new `handleExportLibrary`; render the dialog; pass prop to `LoadProjectDialog`)

Note: `useState` is already imported in `App.tsx`; `useRef` may not be. Check the React import line and add `useRef` if missing.

- [ ] **Step 1: Add imports**

Ensure the React import includes `useRef`. If the file has `import { useState } from 'react'` (or similar), change it to include `useRef`, e.g. `import { useState, useRef } from 'react'`. Then add these two imports alongside the other component/lib imports near the top:

```ts
import { downloadBlob } from '@/lib/download-utils'
import {
  BatchExportProgressDialog,
  type BatchExportProgress,
} from '@/components/BatchExportProgressDialog'
```

- [ ] **Step 2: Add batch state and cancel ref**

Immediately after the existing `const [exportDialogOpen, setExportDialogOpen] = useState(false)` line, add:

```ts
  const [batchExportOpen, setBatchExportOpen] = useState(false)
  const [batchProgress, setBatchProgress] = useState<BatchExportProgress>({
    total: 0,
    completed: 0,
    currentName: '',
    currentProgress: 0,
  })
  const batchCancelRef = useRef(false)
```

- [ ] **Step 3: Add the `handleExportLibrary` orchestration**

Immediately after the existing `handleExport` function (the single-export handler that ends with its `}`), add:

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

This references `setLoadProjectDialogOpen` (existing state setter for the load dialog), `savedProjects` (existing `useKV`), `generateVideo` (already imported), and `toast` (already imported from `sonner`). Confirm each exists in the file before relying on it; the load-dialog state setter is named `setLoadProjectDialogOpen` per the existing dialog wiring.

- [ ] **Step 4: Render the batch dialog**

Find the JSX block where the dialogs are rendered (near `<ExportDialog ... />`). Immediately after the closing `/>` of `<ExportDialog ... />`, add:

```tsx
        <BatchExportProgressDialog
          open={batchExportOpen}
          state={batchProgress}
          onCancel={() => {
            batchCancelRef.current = true
          }}
        />
```

- [ ] **Step 5: Pass the handler to `LoadProjectDialog`**

In the existing `<LoadProjectDialog ... />` JSX, add the prop (alongside `savedProjects`, `onLoad`, `onDelete`):

```tsx
          onExportLibrary={handleExportLibrary}
```

- [ ] **Step 6: Lint**

Run: `npx eslint src/App.tsx`
Expected: no output (clean). If ESLint reports `handleExportLibrary` unused, you missed Step 5; if it reports the dialog import unused, you missed Step 4.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: orchestrate sequential library video export

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: "Export all videos" button in LoadProjectDialog

**Files:**
- Modify: `src/components/LoadProjectDialog.tsx` (icon import; props interface; destructure; library tab header)

- [ ] **Step 1: Add the Download icon to the existing phosphor import**

The file currently imports `import { Trash, FileText, ArrowsClockwise } from '@phosphor-icons/react'`. Change it to:

```ts
import { Trash, FileText, ArrowsClockwise, Download } from '@phosphor-icons/react'
```

- [ ] **Step 2: Add `onExportLibrary` to the props interface**

In `interface LoadProjectDialogProps`, add the new optional prop after `onDelete`:

```ts
  onDelete: (id: string) => void
  onExportLibrary?: () => void
```

- [ ] **Step 3: Destructure the new prop**

In the `LoadProjectDialog` function signature destructure, add `onExportLibrary` after `onDelete`:

```ts
export function LoadProjectDialog({
  open,
  onOpenChange,
  savedProjects,
  onLoad,
  onDelete,
  onExportLibrary,
}: LoadProjectDialogProps) {
```

- [ ] **Step 4: Add the button to the library tab**

In the `<TabsContent value="library">` block, insert a header row directly inside it, immediately BEFORE the existing `<ScrollArea className="h-[400px] pr-4">` line:

```tsx
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm text-muted-foreground">
                {savedProjects.length} project
                {savedProjects.length !== 1 ? 's' : ''}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={savedProjects.length === 0 || !onExportLibrary}
                onClick={() => onExportLibrary?.()}
                className="gap-2"
              >
                <Download size={16} />
                Export all videos
              </Button>
            </div>
```

- [ ] **Step 5: Lint**

Run: `npx eslint src/components/LoadProjectDialog.tsx`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/components/LoadProjectDialog.tsx
git commit -m "feat: add Export all videos button to library tab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full lint pass**

Run: `npm run lint`
Expected: only the pre-existing errors in `src/lib/storage.ts`. No new errors in any file touched by this plan.

- [ ] **Step 2: Production build sanity**

Run: `npm run build`
Expected: build succeeds (it skips typecheck, so this only catches hard failures).

- [ ] **Step 3: Manual browser smoke test**

Start the dev server (`/dev` slash command or `npm run dev`) and, in the browser:

1. Open the Load Project dialog. The "My library" tab shows the project count and an enabled **"Export all videos"** button (examples are seeded into the library on first visit).
2. Click it. The load dialog closes and the **batch progress dialog** appears showing `Exporting videos 1 / N`, the current project name, and a moving progress bar. (Chrome may show a one-time "allow multiple downloads" prompt — allow it.)
3. Let it finish. One file downloads per project, each named after the project (e.g. `40m-lineout-pod-strike.mp4` / `.webm`), and a success toast reads `Exported N videos`.
4. Run it again and click **Cancel** mid-batch. The loop stops after the current video; a toast reads `Cancelled — exported X of N videos`.
5. Regression: open the normal Export dialog, Preview, then Download — the single file still downloads correctly (named `rugby-play-<timestamp>.mp4`/`.webm`).
6. Confirm the downloaded videos play (spot-check one).

Record the result of each check. If any fails, fix before the final step.

- [ ] **Step 4: Final confirmation**

Confirm all six manual checks pass and the working tree is committed (all prior tasks committed). No code commit in this task unless a fix was needed; if a fix was made, commit it with a descriptive message and the `Co-Authored-By` trailer.

---

## Self-review notes

- **Spec coverage:** sequential per-project export (Task 4) ✓; user-facing entry point (Task 5) ✓; fixed defaults 1/30/30 (Task 4) ✓; shared `downloadBlob` + extension-from-MIME (Tasks 1–2) ✓; progress overlay with current name + bar (Task 3) ✓; cancel after current video (Tasks 3–4) ✓; per-project failure resilience + summary toast (Task 4) ✓; empty-library disables button (Task 5) ✓; examples included via library seeding (verified in Task 6 smoke test) ✓.
- **Out of scope confirmed absent:** no ZIP, no per-project settings, no dev-disk path, no single-frame export.
- **Type consistency:** `BatchExportProgress` (fields `total`, `completed`, `currentName`, `currentProgress`) defined in Task 3 and consumed identically in Task 4; `onExportLibrary?: () => void` defined and passed consistently (Tasks 4–5); `downloadBlob(blob, baseName)` signature consistent across Tasks 1, 2, 4.
