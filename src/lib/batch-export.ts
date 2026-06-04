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
