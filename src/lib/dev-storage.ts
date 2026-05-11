import type { SavedProject } from './types'

export const isDev = import.meta.env.DEV

export interface DevEntry {
  name: string
  savedAt: number
  frameCount: number
}

async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail: string | undefined
    try {
      const err = (await res.json()) as { error?: string }
      detail = err.error
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${method} ${url} → ${res.status}${detail ? ` (${detail})` : ''}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const NOOP_LIST: DevEntry[] = []

export async function listScratch(): Promise<DevEntry[]> {
  if (!isDev) return NOOP_LIST
  return api<DevEntry[]>('GET', '/__dev__/scratch')
}

export async function readScratch(name: string): Promise<SavedProject> {
  if (!isDev) throw new Error('readScratch is dev-only')
  return api<SavedProject>('GET', `/__dev__/scratch/${encodeURIComponent(name)}`)
}

export async function writeScratch(name: string, project: SavedProject): Promise<void> {
  if (!isDev) return
  await api('PUT', `/__dev__/scratch/${encodeURIComponent(name)}`, project)
}

export async function deleteScratch(name: string): Promise<void> {
  if (!isDev) return
  await api('DELETE', `/__dev__/scratch/${encodeURIComponent(name)}`)
}

export async function listExamples(): Promise<DevEntry[]> {
  if (!isDev) return NOOP_LIST
  return api<DevEntry[]>('GET', '/__dev__/examples')
}

export async function readExample(name: string): Promise<SavedProject> {
  if (!isDev) throw new Error('readExample is dev-only')
  return api<SavedProject>('GET', `/__dev__/examples/${encodeURIComponent(name)}`)
}

export async function writeExample(name: string, project: SavedProject): Promise<void> {
  if (!isDev) return
  await api('PUT', `/__dev__/examples/${encodeURIComponent(name)}`, project)
}

export async function deleteExample(name: string): Promise<void> {
  if (!isDev) return
  await api('DELETE', `/__dev__/examples/${encodeURIComponent(name)}`)
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled'
}
