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

/**
 * Pick the file extension for a video blob from its MIME type.
 * Returns 'mp4' for MP4, otherwise 'webm' (the only two formats the
 * video exporter produces). Not intended for non-video blobs.
 */
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
