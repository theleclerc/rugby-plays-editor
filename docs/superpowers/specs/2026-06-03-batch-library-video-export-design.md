# Batch Library Video Export — Design

**Date:** 2026-06-03
**Status:** Approved (pending spec review)

## Problem

The app can export a single play to video, but there is no way to export every
project in the library at once. Users (and developers maintaining the bundled
examples) want to render videos for the whole library in one action.

## Decisions (locked during brainstorming)

- **Delivery:** Sequential downloads — one file per project, triggered as each
  render completes. No new dependency. Accepts the tradeoff that Chrome shows a
  one-time "allow multiple downloads" prompt and other browsers may be flakier.
- **Audience:** User-facing only. The seeded examples already live in the
  library (`rugby-saved-projects`), so they are included automatically. No
  dev-only disk-writing path.
- **Settings:** Fixed sensible defaults — no per-batch dialog. Values match the
  current `ExportDialog` defaults: `frameDuration: 1`, `interpolationFrames: 30`,
  `fps: 30`.

## Scope

### In scope

- A way to render every project in the library to video and download each file.
- Progress feedback during the (slow, serial) batch.
- Cancel mid-batch (stops after the current video finishes).
- Resilient error handling — one failed render does not abort the rest.

### Out of scope (YAGNI)

- ZIP bundling.
- Per-project export settings or a batch settings dialog.
- Dev-server / disk-writing export path.
- Exporting single saved frames (they are not animated sequences).

## Architecture

### Entry point — `LoadProjectDialog` "My library" tab

The "My library" tab in
[`src/components/LoadProjectDialog.tsx`](../../../src/components/LoadProjectDialog.tsx)
already lists every saved project. Add an **"Export all videos"** button in that
tab's header (near the list). It is disabled when the library is empty.

The dialog receives a new optional prop, e.g. `onExportLibrary: () => void` (or
the batch runs via a callback passed from `App`). The dialog stays a thin UI
layer; the orchestration lives in `App`.

### Orchestration — `handleExportLibrary` in `App.tsx`

A new async handler in [`src/App.tsx`](../../../src/App.tsx):

1. Reads `savedProjects` (already in scope via `useKV`).
2. Iterates projects **sequentially** (rendering is serial — one canvas /
   `MediaRecorder` at a time).
3. For each project, calls the existing
   `generateVideo(project.frames, frameDuration, interpolationFrames, fps,
   project.cropRegion, onProgress)` from
   [`src/lib/video-export.ts`](../../../src/lib/video-export.ts) with the fixed
   defaults.
4. On success, downloads the resulting blob via the shared `downloadBlob`
   helper (below). The MIME/extension logic added in the previous fix means each
   file is `.mp4` or `.webm` automatically.
5. Tracks progress and updates the overlay state.
6. On a per-project failure, logs the error, records the project name, and
   continues to the next project.
7. When done (or cancelled), shows a summary toast, e.g.
   `Exported 11 of 12 videos` or `Exported 11 of 12 — 1 failed`.

Cancellation: a flag (React ref/state) checked between projects; setting it
stops the loop after the current video completes. There is no need to abort a
render in progress.

### Shared download helper — `downloadBlob`

`ExportDialog.handleDownload` currently builds the `<a>` download inline. Extract
that into a small reusable helper (location: `src/lib/video-export.ts` or a new
`src/lib/download-utils.ts`):

```
downloadBlob(blob: Blob, baseName: string): void
```

- Picks the extension from `blob.type` (`mp4` if it contains `mp4`, else `webm`)
  — same rule introduced in the MIME fix.
- Sanitizes `baseName` into a safe filename (non-alphanumerics → `-`, collapse
  repeats, trim). Project names like `40m lineout pod strike` →
  `40m-lineout-pod-strike`.
- Creates the object URL, triggers the click, and revokes the URL.

Both `ExportDialog` (single export, base name `rugby-play-<timestamp>`) and the
batch path (base name = project name) use this helper. This removes the
duplicated download logic.

### Progress UI

A lightweight overlay/dialog shown while the batch runs:

- Heading: `Rendering 3 / 12`.
- Current project name: `"40m lineout pod strike"`.
- A progress bar. It may reflect either overall batch progress
  (`completed / total`) or current-video progress from `onProgress`; overall
  count is the primary signal.
- A **Cancel** button that sets the cancellation flag.

Reuse the existing `Progress` component and dialog primitives already used by
`ExportDialog`. Keep the overlay a separate, focused component or a minimal
addition — do not overload `ExportDialog`.

## Data flow

```
LoadProjectDialog ("Export all videos" click)
        -> App.handleExportLibrary
              for each project (sequential, cancellable):
                  generateVideo(project.frames, defaults, project.cropRegion, onProgress)
                  downloadBlob(blob, project.name)
                  update progress overlay
              -> summary toast
```

## Error handling

- A render that throws is caught per-project; the loop continues.
- Failures are collected and surfaced in the final toast summary.
- Empty library: the button is disabled, so the handler is never entered with
  zero projects.

## Testing

There is no automated test suite, and `MediaRecorder` is browser-only, so
verification is manual:

- Library with multiple projects → "Export all videos" downloads one correctly
  named file per project.
- Cancel mid-batch stops after the current video; summary reflects the partial
  count.
- A project that fails to render does not abort the batch; the summary reports
  the failure.
- Single export via `ExportDialog` still works after the `downloadBlob`
  refactor (regression check).
- Spot-check filenames and extensions across browsers (MP4 on Safari/recent
  Chrome, WebM fallback elsewhere).

## Risks

- **Browser download throttling / prompts:** triggering many downloads can
  prompt the user (Chrome's "allow multiple downloads") or be blocked. Mitigated
  by natural spacing (each render takes seconds) and clear progress feedback.
- **Long wall-clock time:** rendering a large library is slow because it is
  serial and real-time. The progress overlay and Cancel button keep the user
  informed and in control.
