import { Frame, CropRegion, SavedProject } from './types'

interface RawExample {
  name: string
  frames: Frame[]
  cropRegion?: CropRegion | null
}

const SEED_SENTINEL = 'rugby-seeded-v1'
const SAVED_PROJECTS_KEY = 'rugby-saved-projects'

const exampleModules = import.meta.glob('../examples/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, RawExample>

function loadExamples(): RawExample[] {
  return Object.values(exampleModules).filter(
    (m): m is RawExample =>
      !!m && typeof m === 'object' && Array.isArray((m as RawExample).frames),
  )
}

/**
 * Seed bundled example projects into the user's library on first visit.
 * No-op if the sentinel is already set, or if the library already has items.
 * Always sets the sentinel after running so this never re-fires.
 */
export function seedExamplesIfNeeded(): void {
  if (typeof window === 'undefined') return

  try {
    if (window.localStorage.getItem(SEED_SENTINEL) === '1') return

    const existingRaw = window.localStorage.getItem(SAVED_PROJECTS_KEY)
    const existing: SavedProject[] = existingRaw ? JSON.parse(existingRaw) : []

    if (existing.length > 0) {
      window.localStorage.setItem(SEED_SENTINEL, '1')
      return
    }

    const examples = loadExamples()
    const now = Date.now()
    const seeded: SavedProject[] = examples.map((ex) => ({
      id: crypto.randomUUID(),
      name: ex.name,
      frames: ex.frames.map((f) => ({
        ...f,
        id: crypto.randomUUID(),
        players: f.players.map((p) => ({ ...p, id: crypto.randomUUID() })),
        ball: f.ball ? { ...f.ball, id: crypto.randomUUID() } : null,
        emojis: f.emojis.map((e) => ({ ...e, id: crypto.randomUUID() })),
      })),
      cropRegion: ex.cropRegion ?? undefined,
      createdAt: now,
    }))

    window.localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(seeded))
    window.localStorage.setItem(SEED_SENTINEL, '1')
  } catch (err) {
    console.warn('[examples-seed] failed:', err)
  }
}
