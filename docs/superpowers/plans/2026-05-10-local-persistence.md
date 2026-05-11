# Local Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Spark-coupled persistence layer with a self-owned `localStorage`-backed `useKV`, seed bundled example projects on first visit, and add a Vite dev-only middleware so dev work can save scratch and committed examples to disk.

**Architecture:** Three new modules in `src/lib/` plus one Vite plugin. The frontend hook reads/writes `window.localStorage` directly under the existing `rugby-*` keys. A build-time `import.meta.glob` of `src/examples/*.json` is seeded into the user's library on first visit (sentinel `rugby-seeded-v1`). A Vite plugin registered with `apply: 'serve'` mounts `/__dev__/scratch/*` and `/__dev__/examples/*` endpoints; the frontend gateway `src/lib/dev-storage.ts` is a no-op outside `import.meta.env.DEV`. Save/Load dialogs get dev-only sections that disappear in production builds.

**Tech Stack:** React 19, TypeScript, Vite 7 (plugin API), localStorage, `sonner` toasts, shadcn-ui (`Tabs`, `RadioGroup` already present in `src/components/ui/`).

**Spec:** [docs/superpowers/specs/2026-05-10-local-persistence-design.md](../specs/2026-05-10-local-persistence-design.md)

**Notes for the executing engineer:**
- This codebase has **no test suite** (per [CLAUDE.md](../../../CLAUDE.md)) and the spec explicitly excludes adding one. Each task uses **manual verification** in place of an automated test step — run the dev server and follow the checklist exactly.
- The build skips type errors (`tsc --noCheck`); run `npm run lint` after each code change to catch issues the build won't.
- The existing `useKV` from `@github/spark/hooks` returns `[T | undefined, setter]`. Every consumer in [src/App.tsx](../../../src/App.tsx) already handles `undefined` defensively. Do NOT change that contract.

---

## Task 1: Build the `localStorage`-backed `useKV` hook

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Create `src/lib/storage.ts` with the hook**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export function useKV<T>(
  key: string,
  initial: T,
): [T | undefined, (next: T | ((current: T | undefined) => T)) => void] {
  const [value, setValueState] = useState<T | undefined>(undefined)
  const valueRef = useRef<T | undefined>(undefined)

  // Hydrate on mount (and whenever `key` changes)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      const next = raw === null ? initial : (JSON.parse(raw) as T)
      valueRef.current = next
      setValueState(next)
    } catch (err) {
      console.warn(`[storage] failed to read key "${key}":`, err)
      valueRef.current = initial
      setValueState(initial)
    }
    // `initial` is intentionally excluded from deps: changing `key` is the
    // only legitimate reason to re-hydrate, and `initial` is often a fresh
    // literal that would re-fire the effect every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return
      try {
        const next = JSON.parse(e.newValue) as T
        valueRef.current = next
        setValueState(next)
      } catch (err) {
        console.warn(`[storage] cross-tab parse failed for "${key}":`, err)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const setValue = useCallback(
    (next: T | ((current: T | undefined) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (c: T | undefined) => T)(valueRef.current)
          : next
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved))
        valueRef.current = resolved
        setValueState(resolved)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          toast.error('Storage full — export and delete old projects.')
        } else {
          console.warn(`[storage] failed to write key "${key}":`, err)
        }
        // do NOT update state; in-memory value remains the last persisted one
      }
    },
    [key],
  )

  return [value, setValue]
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: zero errors. (Warnings about the intentional `react-hooks/exhaustive-deps` are silenced inline.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add localStorage-backed useKV hook"
```

---

## Task 2: Swap `useKV` import in `App.tsx`

**Files:**
- Modify: `src/App.tsx:2`

- [ ] **Step 1: Replace the Spark import with the new hook**

In [src/App.tsx](../../../src/App.tsx) line 2, change:

```ts
import { useKV } from '@github/spark/hooks'
```

to:

```ts
import { useKV } from '@/lib/storage'
```

Leave every other line untouched. Each call site (`useKV<Frame[]>('rugby-frames', ...)`, etc.) already matches the new hook's signature.

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 3: Manual verify the swap**

Start the dev server (`/dev` or `docker compose up --build`), open http://localhost:5000, then in the browser:

1. Place a player on the field.
2. Hard-reload the page (Cmd-Shift-R).
3. The player you placed should still be there. ✅

If anything else regresses (frames empty after reload, library missing, etc.), check the browser DevTools → Application → Local Storage and confirm `rugby-*` keys hold the expected JSON.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: switch useKV consumer to local storage hook"
```

---

## Task 3: Bundle examples + first-visit seeding

**Files:**
- Create: `src/lib/examples-seed.ts`
- Create: `src/examples/.gitkeep` (so the empty folder is tracked)
- Create: `src/examples/breakdown-pickup.json` (one starter example so seeding does something visible)
- Modify: `src/main.tsx`

- [ ] **Step 1: Create the empty `src/examples/` folder marker**

```bash
mkdir -p src/examples
touch src/examples/.gitkeep
```

- [ ] **Step 2: Create the first example JSON**

Create `src/examples/breakdown-pickup.json`:

```json
{
  "name": "Breakdown Pick-up",
  "frames": [
    {
      "id": "ex-bp-frame-1",
      "players": [
        { "id": "ex-bp-1", "number": 9, "team": "blue", "x": 590, "y": 800 },
        { "id": "ex-bp-2", "number": 10, "team": "blue", "x": 720, "y": 760 },
        { "id": "ex-bp-3", "number": 12, "team": "blue", "x": 850, "y": 740 }
      ],
      "ball": { "id": "ex-bp-ball", "x": 590, "y": 820 },
      "emojis": []
    },
    {
      "id": "ex-bp-frame-2",
      "players": [
        { "id": "ex-bp-1", "number": 9, "team": "blue", "x": 600, "y": 780 },
        { "id": "ex-bp-2", "number": 10, "team": "blue", "x": 760, "y": 740 },
        { "id": "ex-bp-3", "number": 12, "team": "blue", "x": 920, "y": 720 }
      ],
      "ball": { "id": "ex-bp-ball", "x": 760, "y": 760 },
      "emojis": []
    }
  ],
  "cropRegion": null
}
```

(The `id` strings inside frames don't matter — `seedExamplesIfNeeded` regenerates them at seed time. They just have to be unique within the file for JSON sanity.)

- [ ] **Step 3: Create `src/lib/examples-seed.ts`**

```ts
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
```

- [ ] **Step 4: Run seeding before React mounts**

Modify [src/main.tsx](../../../src/main.tsx). After the imports, before `createRoot(...)`, call the seed function:

```ts
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import "@github/spark/spark"

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { seedExamplesIfNeeded } from './lib/examples-seed'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

seedExamplesIfNeeded()

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
```

Running before React mounts means `useKV<SavedProject[]>('rugby-saved-projects', [])` reads the seeded value on its first hydration — no flicker.

- [ ] **Step 5: Lint check**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 6: Manual verify seeding (fresh user)**

With dev server running:

1. Open DevTools → Application → Local Storage → http://localhost:5000.
2. Click "Clear All" to wipe everything.
3. Reload the page.
4. Open the Load Project dialog. The "Breakdown Pick-up" example should be present. ✅
5. Confirm `rugby-seeded-v1` is now `"1"` in storage. ✅
6. Reload again — the example list should NOT double up (still one item, not two).

- [ ] **Step 7: Manual verify the user-already-has-data path**

1. With at least one user-saved project in the library, open DevTools → Application → Local Storage.
2. Delete only the `rugby-seeded-v1` key (leave `rugby-saved-projects` intact).
3. Reload.
4. The library should still contain ONLY the user's projects (no new "Breakdown Pick-up" inserted), and the sentinel should be set back to `"1"`. ✅

- [ ] **Step 8: Commit**

```bash
git add src/examples/ src/lib/examples-seed.ts src/main.tsx
git commit -m "feat: seed bundled example projects on first visit"
```

---

## Task 4: Vite dev-only storage middleware

**Files:**
- Create: `vite-plugins/dev-storage-plugin.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create the plugin file**

Create `vite-plugins/dev-storage-plugin.ts`:

```ts
import type { Plugin, Connect } from 'vite'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

interface Entry {
  name: string
  savedAt: number
  frameCount: number
}

const NAME_RE = /^[a-z0-9-_]+\.json$/i

function safeResolve(folder: string, name: string): string | null {
  if (!NAME_RE.test(name)) return null
  const resolved = path.resolve(folder, name)
  if (resolved !== folder && !resolved.startsWith(folder + path.sep)) return null
  return resolved
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

async function listFolder(folder: string): Promise<Entry[]> {
  await ensureDir(folder)
  const files = await fs.readdir(folder)
  const entries = await Promise.all(
    files
      .filter((f) => NAME_RE.test(f))
      .map(async (f) => {
        const full = path.join(folder, f)
        const stat = await fs.stat(full)
        let frameCount = 0
        try {
          const data = JSON.parse(await fs.readFile(full, 'utf8'))
          if (Array.isArray(data?.frames)) frameCount = data.frames.length
        } catch {
          /* ignore unreadable file */
        }
        return { name: f, savedAt: stat.mtimeMs, frameCount }
      }),
  )
  return entries.sort((a, b) => b.savedAt - a.savedAt)
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function makeHandler(folders: { scratch: string; examples: string }): Connect.NextHandleFunction {
  return async (req, res, next) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost')
      const segs = url.pathname.split('/').filter(Boolean)
      const which = segs[0]
      if (which !== 'scratch' && which !== 'examples') return next()

      const folder = folders[which]
      const name = segs[1]

      // /__dev__/{which}  → list (GET only)
      if (!name) {
        if (req.method !== 'GET') {
          return sendJson(res, 405, { error: 'Method not allowed' })
        }
        return sendJson(res, 200, await listFolder(folder))
      }

      // /__dev__/{which}/{name}  → CRUD on a single file
      const target = safeResolve(folder, name)
      if (!target) return sendJson(res, 400, { error: 'Invalid name' })

      if (req.method === 'GET') {
        try {
          const buf = await fs.readFile(target, 'utf8')
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(buf)
        } catch {
          return sendJson(res, 404, { error: 'Not found' })
        }
      }

      if (req.method === 'PUT') {
        await ensureDir(folder)
        const body = await readBody(req)
        try {
          JSON.parse(body)
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON body' })
        }
        await fs.writeFile(target, body, 'utf8')
        return sendJson(res, 200, { ok: true })
      }

      if (req.method === 'DELETE') {
        try {
          await fs.unlink(target)
        } catch {
          /* idempotent */
        }
        res.statusCode = 204
        return res.end()
      }

      return sendJson(res, 405, { error: 'Method not allowed' })
    } catch (err) {
      return sendJson(res, 500, { error: String(err) })
    }
  }
}

export function devStoragePlugin(): Plugin {
  return {
    name: 'rugby-dev-storage',
    apply: 'serve', // do not include in production builds
    configureServer(server) {
      const root = server.config.root
      const folders = {
        scratch: path.resolve(root, 'dev-scratch'),
        examples: path.resolve(root, 'src/examples'),
      }
      server.middlewares.use('/__dev__', makeHandler(folders))
    },
  }
}
```

- [ ] **Step 2: Register the plugin in `vite.config.ts`**

Edit [vite.config.ts](../../../vite.config.ts) — add the import and the plugin entry:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { devStoragePlugin } from "./vite-plugins/dev-storage-plugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    sparkPlugin() as PluginOption,
    devStoragePlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  server: {
    host: true,
    port: 5000,
    allowedHosts: [
      "rugby-plays-editor.onrender.com"
    ]
  }
});
```

- [ ] **Step 3: Add `dev-scratch/` to `.gitignore`**

Append a single line to [.gitignore](../../../.gitignore):

```
dev-scratch/
```

- [ ] **Step 4: Lint check**

Run: `npm run lint`
Expected: zero errors. If lint complains about `vite-plugins/` being outside the configured `eslint` glob, that's fine — leave it.

- [ ] **Step 5: Manual verify the endpoints**

Restart the dev server (the plugin is only loaded at server start). Then in a separate terminal:

```bash
# List scratch (folder may not exist yet — expect empty array)
curl -s http://localhost:5000/__dev__/scratch
# Expected: []

# Write a scratch file
curl -s -X PUT -H 'Content-Type: application/json' \
  -d '{"id":"x","name":"Test","frames":[],"createdAt":0}' \
  http://localhost:5000/__dev__/scratch/test.json
# Expected: {"ok":true}

# Confirm the file exists on disk
ls dev-scratch/
# Expected: test.json

# Read it back
curl -s http://localhost:5000/__dev__/scratch/test.json
# Expected: {"id":"x","name":"Test","frames":[],"createdAt":0}

# List examples (the breakdown-pickup file from Task 3 should be there)
curl -s http://localhost:5000/__dev__/examples
# Expected: a JSON array with one entry whose name is "breakdown-pickup.json"

# Path traversal guard
curl -s -o /dev/null -w '%{http_code}\n' \
  http://localhost:5000/__dev__/scratch/..%2Fpackage.json
# Expected: 400

# Bad name guard
curl -s -o /dev/null -w '%{http_code}\n' \
  http://localhost:5000/__dev__/scratch/no-extension
# Expected: 400

# Delete
curl -s -o /dev/null -w '%{http_code}\n' \
  -X DELETE http://localhost:5000/__dev__/scratch/test.json
# Expected: 204

ls dev-scratch/
# Expected: (empty)
```

All assertions should hold. ✅

- [ ] **Step 6: Commit**

```bash
git add vite-plugins/ vite.config.ts .gitignore
git commit -m "feat: add Vite dev middleware for scratch and examples disk I/O"
```

---

## Task 5: Frontend dev-storage gateway

**Files:**
- Create: `src/lib/dev-storage.ts`

- [ ] **Step 1: Create the gateway module**

Create `src/lib/dev-storage.ts`:

```ts
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
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 3: Manual verify from the browser console**

With dev server running, open http://localhost:5000, open DevTools → Console, and paste:

```js
// Adjust import path: dynamic import uses URL of the dev module
const m = await import('/src/lib/dev-storage.ts')
console.log('isDev:', m.isDev)               // true
console.log(await m.listScratch())           // []
await m.writeScratch('console-test.json', {
  id: 'cli', name: 'Console Test', frames: [], createdAt: Date.now()
})
console.log(await m.listScratch())           // 1 entry
console.log(m.slugify('My Cool Play #2'))    // "my-cool-play-2"
await m.deleteScratch('console-test.json')
console.log(await m.listScratch())           // []
```

All assertions should hold. ✅

- [ ] **Step 4: Commit**

```bash
git add src/lib/dev-storage.ts
git commit -m "feat: add frontend gateway for dev storage middleware"
```

---

## Task 6: SaveProjectDialog with dev destinations

**Files:**
- Modify: `src/components/SaveProjectDialog.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/components/SaveProjectDialog.tsx` with the dev-aware version**

Replace the file's contents with:

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { isDev, slugify } from '@/lib/dev-storage'

export type SaveProjectTarget = 'library' | 'scratch' | 'examples'

interface SaveProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, target: SaveProjectTarget) => void
}

export function SaveProjectDialog({ open, onOpenChange, onSave }: SaveProjectDialogProps) {
  const [projectName, setProjectName] = useState('')
  const [target, setTarget] = useState<SaveProjectTarget>('library')

  const handleSave = () => {
    const trimmed = projectName.trim()
    if (!trimmed) return
    onSave(trimmed, target)
    setProjectName('')
    setTarget('library')
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }

  const slug = projectName.trim() ? slugify(projectName.trim()) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Project</DialogTitle>
          <DialogDescription>
            Enter a name for your project to save it locally
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g., Training Drill 1"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {isDev && (
            <div className="space-y-2">
              <Label>Save to</Label>
              <RadioGroup
                value={target}
                onValueChange={(v) => setTarget(v as SaveProjectTarget)}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="library" id="save-target-library" />
                  <Label htmlFor="save-target-library" className="font-normal">
                    My library (browser)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scratch" id="save-target-scratch" />
                  <Label htmlFor="save-target-scratch" className="font-normal">
                    Scratch (dev disk, gitignored)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="examples" id="save-target-examples" />
                  <Label htmlFor="save-target-examples" className="font-normal">
                    Examples (repo — bundles with the app)
                  </Label>
                </div>
              </RadioGroup>
              {target !== 'library' && slug && (
                <p className="text-xs text-muted-foreground">
                  Filename: <code>{slug}.json</code>
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!projectName.trim()}>
            Save Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Update `App.tsx`'s save handler**

In [src/App.tsx](../../../src/App.tsx) the current `handleSaveProjectWithName(name: string)` only writes to the library. Replace it with a target-aware version. Also add the new imports.

Top-of-file imports — add to the existing import group:

```ts
import { writeScratch, writeExample, slugify } from '@/lib/dev-storage'
import type { SaveProjectTarget } from '@/components/SaveProjectDialog'
```

Replace the existing `handleSaveProjectWithName` function (around line 163) with:

```ts
  const handleSaveProjectWithName = async (name: string, target: SaveProjectTarget) => {
    const project: SavedProject = {
      id: crypto.randomUUID(),
      name,
      frames: JSON.parse(JSON.stringify(safeFrames)),
      cropRegion: cropRegion ? JSON.parse(JSON.stringify(cropRegion)) : undefined,
      createdAt: Date.now(),
    }

    if (target === 'library') {
      setSavedProjects((current) => [...(current || []), project])
      toast.success(`Project "${name}" saved successfully`)
      return
    }

    const filename = `${slugify(name)}.json`
    try {
      if (target === 'scratch') {
        await writeScratch(filename, project)
        toast.success(`Saved to dev-scratch/${filename}`)
      } else {
        await writeExample(filename, project)
        toast.success(
          `Saved to src/examples/${filename} — commit it to ship with the app.`,
        )
      }
    } catch (err) {
      console.error(err)
      toast.error(`Failed to save: ${(err as Error).message}`)
    }
  }
```

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 4: Manual verify (dev mode)**

With dev server running:

1. Open the app, place a player, then click "Save Project Locally" (or whichever button opens `SaveProjectDialog`).
2. Confirm the dialog now shows the "Save to" radio group.
3. Type "Test Scratch", select "Scratch", click Save.
4. Confirm a toast appears and `dev-scratch/test-scratch.json` exists on disk (`ls dev-scratch/`).
5. Reopen the dialog, type "Test Example", select "Examples (repo)", Save.
6. Confirm `src/examples/test-example.json` exists on disk and a toast hint appears.
7. Reopen the dialog, type "Test Library", leave default ("My library"), Save.
8. Confirm it appears in the load dialog as a regular library entry.
9. Clean up the test files: `rm dev-scratch/test-scratch.json src/examples/test-example.json`

✅

- [ ] **Step 5: Commit**

```bash
git add src/components/SaveProjectDialog.tsx src/App.tsx
git commit -m "feat: dev-only Save targets (scratch and bundled examples)"
```

---

## Task 7: LoadProjectDialog with dev tabs

**Files:**
- Modify: `src/components/LoadProjectDialog.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/components/LoadProjectDialog.tsx`**

Replace with:

```tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { SavedProject } from '@/lib/types'
import { Trash, FileText, ArrowsClockwise } from '@phosphor-icons/react'
import {
  isDev,
  listScratch,
  readScratch,
  deleteScratch,
  listExamples,
  readExample,
  deleteExample,
  type DevEntry,
} from '@/lib/dev-storage'

interface LoadProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedProjects: SavedProject[]
  onLoad: (project: SavedProject) => void
  onDelete: (id: string) => void
}

type Tab = 'library' | 'scratch' | 'examples'

export function LoadProjectDialog({
  open,
  onOpenChange,
  savedProjects,
  onLoad,
  onDelete,
}: LoadProjectDialogProps) {
  const [tab, setTab] = useState<Tab>('library')

  const handleLoadLibrary = (project: SavedProject) => {
    onLoad(project)
    onOpenChange(false)
  }

  const handleDeleteLibrary = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onDelete(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Project</DialogTitle>
          <DialogDescription>Select a saved project to load</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="library">My library</TabsTrigger>
            {isDev && <TabsTrigger value="scratch">Scratch</TabsTrigger>}
            {isDev && <TabsTrigger value="examples">Examples</TabsTrigger>}
          </TabsList>

          <TabsContent value="library">
            <ScrollArea className="h-[400px] pr-4">
              {savedProjects.length === 0 ? (
                <EmptyState text="No saved projects yet" />
              ) : (
                <div className="space-y-2">
                  {savedProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleLoadLibrary(project)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <h3 className="font-medium">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.frames.length} frame
                            {project.frames.length !== 1 ? 's' : ''} •{' '}
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteLibrary(e, project.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash size={18} />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {isDev && (
            <TabsContent value="scratch">
              <DevTab
                active={open && tab === 'scratch'}
                fetcher={listScratch}
                reader={readScratch}
                deleter={deleteScratch}
                onLoad={(p) => {
                  onLoad(p)
                  onOpenChange(false)
                }}
                emptyText="No scratch saves yet"
              />
            </TabsContent>
          )}

          {isDev && (
            <TabsContent value="examples">
              <DevTab
                active={open && tab === 'examples'}
                fetcher={listExamples}
                reader={readExample}
                deleter={deleteExample}
                onLoad={(p) => {
                  onLoad(p)
                  onOpenChange(false)
                }}
                emptyText="No example files in src/examples/"
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText size={48} className="text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}

interface DevTabProps {
  active: boolean
  fetcher: () => Promise<DevEntry[]>
  reader: (name: string) => Promise<SavedProject>
  deleter: (name: string) => Promise<void>
  onLoad: (project: SavedProject) => void
  emptyText: string
}

function DevTab({ active, fetcher, reader, deleter, onLoad, emptyText }: DevTabProps) {
  const [entries, setEntries] = useState<DevEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      setEntries(await fetcher())
    } catch (err) {
      setError((err as Error).message)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const handleLoad = async (entry: DevEntry) => {
    try {
      const project = await reader(entry.name)
      // Files don't carry id/createdAt — fill them so the rest of the app is happy.
      const ready: SavedProject = {
        id: crypto.randomUUID(),
        name: project.name ?? entry.name.replace(/\.json$/, ''),
        frames: project.frames,
        cropRegion: project.cropRegion,
        createdAt:
          typeof project.createdAt === 'number' ? project.createdAt : entry.savedAt,
      }
      onLoad(ready)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleDelete = async (e: React.MouseEvent, entry: DevEntry) => {
    e.stopPropagation()
    try {
      await deleter(entry.name)
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <ArrowsClockwise size={14} className="mr-1" />
          Refresh
        </Button>
      </div>
      <ScrollArea className="h-[360px] pr-4">
        {loading && entries === null ? (
          <EmptyState text="Loading…" />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-destructive mb-2">Dev server not reachable</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </div>
        ) : entries && entries.length === 0 ? (
          <EmptyState text={emptyText} />
        ) : (
          <div className="space-y-2">
            {entries!.map((entry) => (
              <Card
                key={entry.name}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleLoad(entry)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{entry.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {entry.frameCount} frame{entry.frameCount !== 1 ? 's' : ''} •{' '}
                      {new Date(entry.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(e, entry)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash size={18} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
```

- [ ] **Step 2: `App.tsx` doesn't need changes for load**

The new dev tabs hand a fully-formed `SavedProject` to `onLoad`, which already calls `handleLoadSavedProject` — no change needed to that handler. Confirm by reading `App.tsx` around line 176–190.

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 4: Manual verify**

With dev server running:

1. Open the Load Project dialog. Three tabs are visible: "My library", "Scratch", "Examples". ✅
2. Click "Scratch". The list loads (empty if no scratch files yet). The "Refresh" button works.
3. Save a scratch file via the Save dialog (Task 6 flow), reopen the Load dialog → Scratch tab → see it listed.
4. Click the entry → it loads onto the canvas.
5. Click the trash icon → entry disappears, file is removed from `dev-scratch/`.
6. Click "Examples" → "breakdown-pickup.json" should be visible.
7. Loading "breakdown-pickup.json" places its players on the canvas.
8. Stop the dev server (`docker compose down`), keep the page open, click "Refresh" on the Scratch tab → "Dev server not reachable" appears with a Retry button. Restart the server, hit Retry → list returns. ✅

- [ ] **Step 5: Commit**

```bash
git add src/components/LoadProjectDialog.tsx
git commit -m "feat: dev-only Load tabs for scratch and bundled examples"
```

---

## Task 8: Final verification + production parity

**Files:** none (verification only)

- [ ] **Step 1: Lint and build clean**

```bash
npm run lint
npm run build
```

Both should complete with no errors. (The build skips type errors per [CLAUDE.md](../../../CLAUDE.md), but lint should still pass.)

- [ ] **Step 2: Production preview parity check**

```bash
docker compose run --rm -p 5000:5000 app sh -c "npm run build && npm run preview -- --host --port 5000"
```

In a browser at http://localhost:5000:

1. Open the Save Project dialog. The "Save to" radio group should NOT be present. ✅
2. Open the Load Project dialog. Only "My library" tab; no "Scratch" or "Examples" tabs. ✅

In a separate terminal:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5000/__dev__/scratch
# Expected: 404 (or some non-200; the production preview server has no /__dev__ middleware).
```

✅

- [ ] **Step 3: First-visit smoke test on the production preview**

In the browser DevTools (still pointed at the prod preview):

1. Application → Local Storage → "Clear All".
2. Reload.
3. Open Load Project → "Breakdown Pick-up" example is present.
4. `rugby-seeded-v1` is now `"1"` in storage.

✅

- [ ] **Step 4: Cross-tab sync verification**

Restart the dev server (`/dev`). Open the app at http://localhost:5000 in **two** tabs (call them A and B).

1. In tab A, save a project to "My library" with name "Cross-Tab Test".
2. Switch to tab B WITHOUT reloading.
3. Open the Load Project dialog in tab B → "Cross-Tab Test" should be present.

✅

(If it isn't there, the `storage` event listener in `useKV` is broken — re-check `src/lib/storage.ts`'s second `useEffect`.)

- [ ] **Step 5: Quota-exceeded behavior**

In one of the dev-server tabs, open DevTools → Console and paste:

```js
// Fill localStorage near the cap with junk under a non-app key
const big = 'x'.repeat(1024 * 1024) // 1 MB string
let i = 0
try {
  while (i < 10) { window.localStorage.setItem(`__quota_test_${i}`, big); i++ }
} catch (e) {
  console.log('cap hit at i=', i)
}
```

Now try to save a new project from the UI. You should see the toast *"Storage full — export and delete old projects."* The new project does NOT appear in the library after reload. ✅

Clean up:

```js
for (let i = 0; i < 20; i++) window.localStorage.removeItem(`__quota_test_${i}`)
```

- [ ] **Step 6: Commit (if any cleanup was needed)**

Most likely there's nothing to commit. If you discovered a fix during verification, commit it now. Otherwise:

```bash
git status   # should be clean
```

- [ ] **Step 7: Push the branch**

```bash
git push -u origin setup-claude-config
```

(Or whichever branch the work is on. If the user has fast-forwarded `main` onto this branch in the meantime, push that instead.)
